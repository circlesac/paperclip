import type { Attachment, Message } from "chat";
import {
  isAllowedContentType,
  MAX_ATTACHMENT_BYTES,
  normalizeContentType,
  normalizeUploadAttachmentContentType,
} from "../attachment-types.js";
import { guardedRemoteHttpFetch } from "./remote-http-fetch.js";

const MAX_URL_LENGTH = 2048;
const DOWNLOAD_TIMEOUT_MS = 20_000;
export const GITHUB_ATTACHMENT_BATCH_TIMEOUT_MS = 60_000;
const MAX_ATTACHMENTS = 20;
const MAX_REFERENCES = 10_000;
const REDIRECT_STATUSES = new Set([301, 302, 303, 307, 308]);
const CDN_HOSTS = new Set([
  "user-images.githubusercontent.com",
  "private-user-images.githubusercontent.com",
  "github-production-user-asset-6210df.s3.amazonaws.com",
  "github-production-repository-file-5c1aeb.s3.amazonaws.com",
]);
const MIME_EXTENSIONS: Record<string, string> = {
  "image/png": ".png",
  "image/jpeg": ".jpg",
  "image/jpg": ".jpg",
  "image/gif": ".gif",
  "image/webp": ".webp",
  "application/pdf": ".pdf",
  "text/plain": ".txt",
  "text/markdown": ".md",
  "text/csv": ".csv",
  "application/json": ".json",
  "application/zip": ".zip",
  "video/mp4": ".mp4",
  "video/webm": ".webm",
  "audio/mpeg": ".mp3",
};

/** Provenance is the admitted comment, not ownership of GitHub's anonymized upload. */
export interface GitHubPublicAttachmentLocator {
  kind: "github_public_attachment";
  url: string;
  sourceThreadId: string;
  sourceMessageId: string;
}

const handles = new WeakMap<Attachment, GitHubPublicAttachmentLocator>();
const limitOmissions = new WeakMap<Message, number>();

/** Informational only: this count cannot authorize or identify a downloadable file. */
export function githubAttachmentLimitOmissions(message: Message): number {
  return limitOmissions.get(message) ?? 0;
}

export function restoreGitHubAttachmentLimitOmissions(
  message: Message,
  value: unknown,
): void {
  limitOmissions.delete(message);
  if (
    typeof value === "number" &&
    Number.isInteger(value) &&
    value > 0 &&
    value <= MAX_REFERENCES
  )
    limitOmissions.set(message, value);
}

export class GitHubAttachmentUnavailableError extends Error {
  constructor(
    readonly code:
      | "github_attachment_not_public"
      | "github_attachment_invalid_response"
      | "github_attachment_unsafe_redirect"
      | "github_attachment_too_large"
      | "github_attachment_empty"
      | "github_attachment_unsupported_type"
      | "github_attachment_download_failed"
      | "github_attachment_source_mismatch",
  ) {
    // Closed codes only: URLs, signed redirects and provider response bodies never escape.
    super(code);
    this.name = "GitHubAttachmentUnavailableError";
  }
}

export function canonicalGitHubAttachmentUrl(value: unknown): string | null {
  if (typeof value !== "string" || value.length > MAX_URL_LENGTH) return null;
  try {
    const url = new URL(value);
    if (
      url.origin !== "https://github.com" ||
      url.username ||
      url.password ||
      url.search ||
      url.hash
    )
      return null;
    if (
      !/^\/user-attachments\/(?:assets\/[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}|files\/[1-9][0-9]*\/[^/]+)$/i.test(
        url.pathname,
      )
    )
      return null;
    if (
      /%(?:2f|5c|00|0[ad])/i.test(url.pathname) ||
      url.pathname.includes("\\")
    )
      return null;
    return url.href;
  } catch {
    return null;
  }
}

function validThread(value: unknown): value is string {
  return (
    typeof value === "string" &&
    value.length <= 512 &&
    /^github:[a-z0-9_.-]+\/[a-z0-9_.-]+:(?:issue:)?[1-9][0-9]*(?::rc:[1-9][0-9]*)?$/i.test(
      value,
    )
  );
}

export function validateGitHubAttachmentLocator(
  value: unknown,
): GitHubPublicAttachmentLocator | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const row = value as Record<string, unknown>;
  if (
    Object.keys(row).sort().join(",") !==
      "kind,sourceMessageId,sourceThreadId,url" ||
    row.kind !== "github_public_attachment" ||
    !validThread(row.sourceThreadId) ||
    typeof row.sourceMessageId !== "string" ||
    !/^[1-9][0-9]{0,24}$/.test(row.sourceMessageId)
  )
    return null;
  const url = canonicalGitHubAttachmentUrl(row.url);
  return url
    ? {
        kind: "github_public_attachment",
        url,
        sourceThreadId: row.sourceThreadId,
        sourceMessageId: row.sourceMessageId,
      }
    : null;
}

function safeName(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const name = value
    .replace(/[\u0000-\u001f\u007f/\\]/g, "_")
    .trim()
    .slice(0, 200);
  return name && name !== "." && name !== ".." ? name : undefined;
}

export function githubAttachmentLocator(
  attachment: Attachment,
): GitHubPublicAttachmentLocator | null {
  return handles.get(attachment) ?? null;
}

export function rehydrateGitHubPublicAttachment(
  value: unknown,
  source: { threadId: string; messageId: string },
): Attachment | null {
  const locator = validateGitHubAttachmentLocator(value);
  if (
    !locator ||
    locator.sourceThreadId !== source.threadId ||
    locator.sourceMessageId !== source.messageId
  )
    return null;
  const url = new URL(locator.url);
  let name: string | undefined;
  if (url.pathname.startsWith("/user-attachments/files/")) {
    try {
      name = safeName(decodeURIComponent(url.pathname.split("/").at(-1)!));
    } catch {
      return null;
    }
  }
  const attachment: Attachment = {
    type: "file",
    name: name ?? `github-attachment-${url.pathname.split("/").at(-1)}`,
  };
  handles.set(attachment, locator);
  return attachment;
}

/** Parse references only; network I/O happens later, after Paperclip's admission fence. */
export function githubPublicAttachmentsFromMessage(
  message: Message,
): Attachment[] {
  limitOmissions.delete(message);
  const raw = message.raw as Record<string, unknown> | null;
  if (
    !raw ||
    !validThread(message.threadId) ||
    !/^[1-9][0-9]{0,24}$/.test(message.id)
  )
    return [];
  const comment = raw.comment as Record<string, unknown> | undefined;
  const repository = raw.repository as Record<string, unknown> | undefined;
  if (
    !comment ||
    !repository ||
    String(comment.id) !== message.id ||
    typeof comment.body !== "string" ||
    comment.body.length > 200_000
  )
    return [];
  const thread =
    /^github:([^:]+):(?:(issue):)?([1-9][0-9]*)(?::rc:([1-9][0-9]*))?$/i.exec(
      message.threadId,
    );
  if (
    !thread ||
    typeof repository.full_name !== "string" ||
    thread[1].toLowerCase() !== repository.full_name.toLowerCase() ||
    Number(thread[3]) !== raw.prNumber
  )
    return [];
  if (raw.type === "review_comment") {
    if (thread[2] || thread[4] !== String(comment.in_reply_to_id ?? comment.id))
      return [];
  } else if (
    raw.type !== "issue_comment" ||
    thread[4] ||
    Boolean(thread[2]) !== (raw.threadType === "issue")
  )
    return [];

  const urls = new Set<string>();
  const definitions = new Map<string, unknown>();
  const references: string[] = [];
  const stack: unknown[] = [message.formatted];
  let visited = 0;
  const sourceBody = comment.body;
  const add = (value: unknown) => {
    if (typeof value !== "string" || !sourceBody.includes(value)) return;
    const url = canonicalGitHubAttachmentUrl(value);
    if (url && urls.size < MAX_REFERENCES) urls.add(url);
  };
  while (stack.length && visited++ < 10_000) {
    const node = stack.pop() as Record<string, unknown> | null;
    if (!node || typeof node !== "object") continue;
    if (node.type === "link" || node.type === "image") add(node.url);
    if (node.type === "definition" && typeof node.identifier === "string")
      definitions.set(node.identifier.toLowerCase(), node.url);
    if (
      (node.type === "imageReference" || node.type === "linkReference") &&
      typeof node.identifier === "string"
    )
      references.push(node.identifier.toLowerCase());
    if (node.type === "html" && typeof node.value === "string") {
      const html = node.value.replace(/<!--[\s\S]*?(?:-->|$)/g, "");
      for (const match of html.matchAll(
        /<img\b[^>]{0,8192}?\bsrc\s*=\s*(?:"([^"]*)"|'([^']*)')[^>]*>/gi,
      ))
        add(match[1] ?? match[2]);
    }
    if (Array.isArray(node.children))
      for (let index = node.children.length - 1; index >= 0; index--)
        stack.push(node.children[index]);
  }
  for (const id of references) add(definitions.get(id));
  restoreGitHubAttachmentLimitOmissions(
    message,
    Math.max(0, urls.size - MAX_ATTACHMENTS),
  );
  return [...urls]
    .slice(0, MAX_ATTACHMENTS)
    .map((url) =>
      rehydrateGitHubPublicAttachment(
        {
          kind: "github_public_attachment",
          url,
          sourceThreadId: message.threadId,
          sourceMessageId: message.id,
        },
        { threadId: message.threadId, messageId: message.id },
      )!,
    )
    .filter(Boolean);
}

function allowedRedirect(value: string, original: string): URL | null {
  try {
    const url = new URL(value, original);
    if (
      url.protocol !== "https:" ||
      url.port ||
      url.username ||
      url.password ||
      url.hash ||
      url.href.length > 8192
    )
      return null;
    if (url.hostname === "github.com")
      return canonicalGitHubAttachmentUrl(url.href) ? url : null;
    if (!CDN_HOSTS.has(url.hostname) || url.pathname === "/") return null;
    return url;
  } catch {
    return null;
  }
}

function imageSignatureMatches(body: Buffer, mime: string): boolean {
  if (mime === "image/png")
    return body
      .subarray(0, 8)
      .equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
  if (mime === "image/jpeg" || mime === "image/jpg")
    return body[0] === 255 && body[1] === 216 && body[2] === 255;
  if (mime === "image/gif")
    return /^(GIF87a|GIF89a)$/.test(body.subarray(0, 6).toString("ascii"));
  if (mime === "image/webp")
    return (
      body.subarray(0, 4).toString("ascii") === "RIFF" &&
      body.subarray(8, 12).toString("ascii") === "WEBP"
    );
  return !mime.startsWith("image/");
}

/** No provider identity is ever forwarded: this is public download, not an App-token fallback. */
export async function prepareGitHubPublicAttachment(
  attachment: Attachment,
  batchSignal?: AbortSignal,
): Promise<Attachment> {
  const locator = handles.get(attachment);
  if (!locator)
    throw new GitHubAttachmentUnavailableError(
      "github_attachment_source_mismatch",
    );
  const downloadSignal = AbortSignal.timeout(DOWNLOAD_TIMEOUT_MS);
  const signal = batchSignal
    ? AbortSignal.any([downloadSignal, batchSignal])
    : downloadSignal;
  try {
    let url = new URL(locator.url);
    for (let redirects = 0; redirects <= 3; redirects++) {
      signal.throwIfAborted();
      const response = await guardedRemoteHttpFetch(
        url,
        {
          method: "GET",
          redirect: "manual",
          credentials: "omit",
          signal,
          headers: { accept: "*/*", "user-agent": "Paperclip/ChatAttachments" },
        },
        {
          allowPrivateNetwork: false,
          connectTimeoutMs: 5000,
          responseTimeoutMs: DOWNLOAD_TIMEOUT_MS,
          error: () =>
            new GitHubAttachmentUnavailableError(
              "github_attachment_download_failed",
            ),
        },
      );
      if (REDIRECT_STATUSES.has(response.status)) {
        const target = allowedRedirect(
          response.headers.get("location") ?? "",
          url.href,
        );
        await response.body?.cancel();
        if (!target || redirects === 3)
          throw new GitHubAttachmentUnavailableError(
            "github_attachment_unsafe_redirect",
          );
        url = target;
        continue;
      }
      const rejectResponse = async (
        code: GitHubAttachmentUnavailableError["code"],
      ): Promise<never> => {
        await response.body?.cancel();
        throw new GitHubAttachmentUnavailableError(code);
      };
      if (
        response.status === 401 ||
        response.status === 403 ||
        response.status === 404
      )
        return await rejectResponse("github_attachment_not_public");
      if (response.status !== 200 || !response.body)
        return await rejectResponse("github_attachment_invalid_response");
      const mimeType = normalizeUploadAttachmentContentType({
        contentType: normalizeContentType(response.headers.get("content-type")),
        originalFilename: attachment.name,
        isAllowedContentType,
      });
      // A login/error document is never a successfully downloaded attachment.
      if (mimeType === "text/html" || !isAllowedContentType(mimeType))
        return await rejectResponse("github_attachment_unsupported_type");
      const declared = response.headers.get("content-length");
      if (
        declared &&
        (!/^\d+$/.test(declared) || Number(declared) > MAX_ATTACHMENT_BYTES)
      )
        return await rejectResponse("github_attachment_too_large");
      const reader = response.body.getReader();
      const chunks: Buffer[] = [];
      let size = 0;
      const cancel = () => {
        void reader.cancel().catch(() => undefined);
      };
      signal.addEventListener("abort", cancel, { once: true });
      try {
        for (;;) {
          signal.throwIfAborted();
          const next = await reader.read();
          signal.throwIfAborted();
          if (next.done) break;
          size += next.value.byteLength;
          if (size > MAX_ATTACHMENT_BYTES)
            throw new GitHubAttachmentUnavailableError(
              "github_attachment_too_large",
            );
          chunks.push(Buffer.from(next.value));
        }
      } finally {
        signal.removeEventListener("abort", cancel);
        await reader.cancel().catch(() => undefined);
      }
      if (!size)
        throw new GitHubAttachmentUnavailableError("github_attachment_empty");
      // Content-Length describes compressed bytes when Content-Encoding is present.
      if (
        declared &&
        !response.headers.get("content-encoding") &&
        size !== Number(declared)
      )
        throw new GitHubAttachmentUnavailableError(
          "github_attachment_invalid_response",
        );
      const body = Buffer.concat(chunks, size);
      if (
        !imageSignatureMatches(body, mimeType) ||
        /^\s*(?:<!doctype\s+html|<html\b)/i.test(
          body.subarray(0, 512).toString("utf8"),
        )
      )
        throw new GitHubAttachmentUnavailableError(
          "github_attachment_invalid_response",
        );
      const name = attachment.name?.startsWith("github-attachment-")
        ? `${attachment.name}${MIME_EXTENSIONS[mimeType] ?? ""}`
        : attachment.name;
      return {
        type: mimeType.startsWith("image/")
          ? "image"
          : mimeType.startsWith("audio/")
            ? "audio"
            : mimeType.startsWith("video/")
              ? "video"
              : "file",
        name,
        mimeType,
        size,
        fetchData: async () => body,
      };
    }
    throw new GitHubAttachmentUnavailableError(
      "github_attachment_unsafe_redirect",
    );
  } catch (error) {
    if (error instanceof GitHubAttachmentUnavailableError) throw error;
    throw new GitHubAttachmentUnavailableError(
      "github_attachment_download_failed",
    );
  }
}
