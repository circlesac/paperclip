import { afterEach, describe, expect, it, vi } from "vitest";
import type { Message } from "chat";
import {
  canonicalGitHubAttachmentUrl,
  githubAttachmentLocator,
  githubAttachmentLimitOmissions,
  githubPublicAttachmentsFromMessage,
  prepareGitHubPublicAttachment,
  rehydrateGitHubPublicAttachment,
  restoreGitHubAttachmentLimitOmissions,
} from "./chat-github-attachments.js";
import { guardedRemoteHttpFetch } from "./remote-http-fetch.js";
import { MAX_ATTACHMENT_BYTES } from "../attachment-types.js";

vi.mock("./remote-http-fetch.js", () => ({ guardedRemoteHttpFetch: vi.fn() }));
const request = vi.mocked(guardedRemoteHttpFetch);
const imageUrl =
  "https://github.com/user-attachments/assets/11111111-2222-3333-4444-555555555555";
const fileUrl = "https://github.com/user-attachments/files/31917991/proof.txt";
const threadId = "github:paperclipai/chat-e2e:issue:42";
const png = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10, 0]);
function message(overrides: Record<string, unknown> = {}): Message {
  return {
    id: "4242",
    threadId,
    formatted: {
      type: "root",
      children: [
        { type: "image", url: imageUrl },
        { type: "link", url: fileUrl },
      ],
    },
    raw: {
      type: "issue_comment",
      prNumber: 42,
      threadType: "issue",
      repository: { full_name: "paperclipai/chat-e2e" },
      comment: { id: 4242, body: `![Image](${imageUrl}) [proof](${fileUrl})` },
    },
    ...overrides,
  } as unknown as Message;
}
function attachment() {
  return githubPublicAttachmentsFromMessage(message())[0]!;
}
function fileAttachment() {
  return githubPublicAttachmentsFromMessage(message())[1]!;
}
afterEach(() => {
  vi.restoreAllMocks();
  request.mockReset();
  vi.useRealTimers();
});

describe("public GitHub attachment extraction", () => {
  it("extracts bounded current-comment references without fetching or carrying credentials", () => {
    const found = githubPublicAttachmentsFromMessage(message());
    expect(found).toHaveLength(2);
    expect(found[1]?.name).toBe("proof.txt");
    expect(found[0]?.fetchData).toBeUndefined();
    expect(githubAttachmentLocator(found[0]!)).toEqual({
      kind: "github_public_attachment",
      url: imageUrl,
      sourceThreadId: threadId,
      sourceMessageId: "4242",
    });
    expect(request).not.toHaveBeenCalled();
  });
  it.each([
    { id: "99" },
    { threadId: "github:other/repo:issue:42" },
    { threadId: "github:paperclipai/chat-e2e:issue:43" },
    { threadId: "github:paperclipai/chat-e2e:42:rc:4242" },
  ])("rejects forged source tuples %j", (override) => {
    expect(githubPublicAttachmentsFromMessage(message(override))).toEqual([]);
    expect(request).not.toHaveBeenCalled();
  });
  it("does not import an AST URL absent from the actual current comment", () => {
    const value = message();
    (value.raw as { comment: { body: string } }).comment.body =
      "No file in this comment";
    expect(githubPublicAttachmentsFromMessage(value)).toEqual([]);
  });
  it("retains a bounded overflow count without extra descriptors or downloads", () => {
    const urls = Array.from(
      { length: 22 },
      (_, index) =>
        `https://github.com/user-attachments/files/${index + 1}/proof.txt`,
    );
    const value = message({
      formatted: {
        type: "root",
        children: [...urls, urls[0]!].map((url) => ({ type: "link", url })),
      },
    });
    (value.raw as { comment: { body: string } }).comment.body = urls.join("\n");
    expect(githubPublicAttachmentsFromMessage(value)).toHaveLength(20);
    expect(githubAttachmentLimitOmissions(value)).toBe(2);
    const restored = message();
    restoreGitHubAttachmentLimitOmissions(
      restored,
      JSON.parse(JSON.stringify(githubAttachmentLimitOmissions(value))),
    );
    expect(githubAttachmentLimitOmissions(restored)).toBe(2);
    expect(request).not.toHaveBeenCalled();
  });
  it.each([-1, 0, 0.5, 10_001, Infinity, NaN, "2", {}, null])(
    "rejects malformed or unbounded omission counts %j",
    (count) => {
      const value = message();
      restoreGitHubAttachmentLimitOmissions(value, 2);
      restoreGitHubAttachmentLimitOmissions(value, count);
      expect(githubAttachmentLimitOmissions(value)).toBe(0);
      expect(request).not.toHaveBeenCalled();
    },
  );
  it("handles HTML images and reference-style links but not code or unused definitions", () => {
    const value = message({
      formatted: {
        type: "root",
        children: [
          { type: "html", value: `<img width="400" src="${imageUrl}">` },
          { type: "linkReference", identifier: "proof" },
          { type: "definition", identifier: "proof", url: fileUrl },
          { type: "code", value: imageUrl },
          {
            type: "definition",
            identifier: "unused",
            url: imageUrl.replace("11111111", "99999999"),
          },
        ],
      },
    });
    (value.raw as { comment: { body: string } }).comment.body =
      `<img width="400" src="${imageUrl}"> [proof]\n[proof]: ${fileUrl}`;
    expect(githubPublicAttachmentsFromMessage(value)).toHaveLength(2);
  });
  it.each([
    imageUrl + "?jwt=private-secret",
    imageUrl + "#fragment",
    imageUrl.replace("https:", "http:"),
    imageUrl.replace("github.com", "github.com.evil.test"),
    imageUrl.replace("github.com", "user:secret@github.com"),
    imageUrl.replace("github.com", "github.com:8443"),
    "https://github.com/owner/repo/raw/main/file.png",
    "https://github.com/user-attachments/files/42/..%2fsecret",
    "https://127.0.0.1/user-attachments/files/42/file.txt",
  ])("rejects noncanonical or credential-bearing source %s", (url) => {
    expect(canonicalGitHubAttachmentUrl(url)).toBeNull();
  });
  it("rehydrates a stable descriptor only for the exact source after restart", () => {
    const original = attachment();
    const saved = JSON.parse(JSON.stringify(githubAttachmentLocator(original)));
    const recovered = rehydrateGitHubPublicAttachment(saved, {
      threadId,
      messageId: "4242",
    });
    expect(recovered).not.toBeNull();
    expect(githubAttachmentLocator(recovered!)).toEqual(saved);
    expect(
      rehydrateGitHubPublicAttachment(saved, { threadId, messageId: "4243" }),
    ).toBeNull();
    expect(
      rehydrateGitHubPublicAttachment(saved, {
        threadId: "github:other/repo:issue:42",
        messageId: "4242",
      }),
    ).toBeNull();
    expect(
      rehydrateGitHubPublicAttachment(
        { ...saved, authorization: "secret" },
        { threadId, messageId: "4242" },
      ),
    ).toBeNull();
    expect(request).not.toHaveBeenCalled();
  });
});

describe("public GitHub attachment download", () => {
  it("imports exact public image bytes with actual MIME and a usable extension", async () => {
    request.mockResolvedValue(
      new Response(png, {
        headers: {
          "content-type": "image/png",
          "content-length": String(png.length),
        },
      }),
    );
    const result = await prepareGitHubPublicAttachment(attachment());
    expect(result).toMatchObject({
      type: "image",
      mimeType: "image/png",
      size: png.length,
    });
    expect(result.name).toMatch(/\.png$/);
    expect(await result.fetchData!()).toEqual(png);
    expect(request).toHaveBeenCalledWith(
      expect.any(URL),
      expect.objectContaining({
        method: "GET",
        redirect: "manual",
        credentials: "omit",
        signal: expect.any(AbortSignal),
      }),
      expect.objectContaining({ allowPrivateNetwork: false }),
    );
    expect(Object.keys(request.mock.calls[0]![1].headers!)).toEqual([
      "accept",
      "user-agent",
    ]);
  });
  it("imports a public file and never persists a signed CDN redirect", async () => {
    const secretRedirect =
      "https://github-production-repository-file-5c1aeb.s3.amazonaws.com/42/file.txt?X-Amz-Signature=secret";
    request.mockResolvedValueOnce(
      new Response(null, {
        status: 302,
        headers: { location: secretRedirect },
      }),
    );
    request.mockResolvedValueOnce(
      new Response("exact public file", {
        headers: { "content-type": "text/plain; charset=utf-8" },
      }),
    );
    const original = fileAttachment();
    const descriptor = JSON.stringify(githubAttachmentLocator(original));
    const result = await prepareGitHubPublicAttachment(original);
    expect(result).toMatchObject({
      name: "proof.txt",
      mimeType: "text/plain",
      type: "file",
    });
    expect((await result.fetchData!()).toString()).toBe("exact public file");
    expect(JSON.stringify(githubAttachmentLocator(original))).toBe(descriptor);
    expect(descriptor).not.toContain("Signature");
    expect(JSON.stringify(result)).not.toContain("secret");
    for (const [, init, guard] of request.mock.calls) {
      expect(init.credentials).toBe("omit");
      expect(init.headers).toEqual({
        accept: "*/*",
        "user-agent": "Paperclip/ChatAttachments",
      });
      expect(guard.allowPrivateNetwork).toBe(false);
    }
  });
  it.each([401, 403, 404])(
    "reports private/unavailable %s without credential retries",
    async (status) => {
      request.mockResolvedValue(
        new Response("secret provider body", { status }),
      );
      await expect(
        prepareGitHubPublicAttachment(attachment()),
      ).rejects.toMatchObject({
        code: "github_attachment_not_public",
        message: "github_attachment_not_public",
      });
      expect(request).toHaveBeenCalledTimes(1);
    },
  );
  it.each([
    "https://localhost/file.png",
    "https://169.254.169.254/latest/meta-data/",
    "http://user-images.githubusercontent.com/file.png",
    "https://evil.test/file.png",
    "https://github.com/login",
    "https://user:secret@user-images.githubusercontent.com/file.png",
  ])("refuses unsafe redirects %s", async (location) => {
    request.mockResolvedValue(
      new Response(null, { status: 302, headers: { location } }),
    );
    await expect(
      prepareGitHubPublicAttachment(attachment()),
    ).rejects.toMatchObject({ code: "github_attachment_unsafe_redirect" });
    expect(request).toHaveBeenCalledTimes(1);
  });
  it("bounds redirect count", async () => {
    request.mockImplementation(
      async () =>
        new Response(null, { status: 302, headers: { location: imageUrl } }),
    );
    await expect(
      prepareGitHubPublicAttachment(attachment()),
    ).rejects.toMatchObject({ code: "github_attachment_unsafe_redirect" });
    expect(request).toHaveBeenCalledTimes(4);
  });
  it.each([
    {
      body: "<html>login</html>",
      type: "text/html",
      code: "github_attachment_unsupported_type",
    },
    {
      body: "<!doctype html>login",
      type: "text/plain",
      code: "github_attachment_invalid_response",
    },
    {
      body: "not a png",
      type: "image/png",
      code: "github_attachment_invalid_response",
    },
    { body: "", type: "text/plain", code: "github_attachment_empty" },
    {
      body: "binary",
      type: "application/octet-stream",
      code: "github_attachment_unsupported_type",
    },
  ])(
    "rejects empty/error/wrong-MIME responses $code",
    async ({ body, type, code }) => {
      request.mockResolvedValue(
        new Response(body, { headers: { "content-type": type } }),
      );
      await expect(
        prepareGitHubPublicAttachment(fileAttachment()),
      ).rejects.toMatchObject({ code });
    },
  );
  it("rejects oversized Content-Length before reading the response", async () => {
    request.mockResolvedValue(
      new Response("small", {
        headers: {
          "content-type": "text/plain",
          "content-length": String(MAX_ATTACHMENT_BYTES + 1),
        },
      }),
    );
    await expect(
      prepareGitHubPublicAttachment(fileAttachment()),
    ).rejects.toMatchObject({ code: "github_attachment_too_large" });
  });
  it("caps streamed bytes even without Content-Length", async () => {
    request.mockResolvedValue(
      new Response(Buffer.alloc(MAX_ATTACHMENT_BYTES + 1), {
        headers: { "content-type": "text/plain" },
      }),
    );
    await expect(
      prepareGitHubPublicAttachment(fileAttachment()),
    ).rejects.toMatchObject({ code: "github_attachment_too_large" });
  });
  it("redacts network errors and denies unregistered attachments", async () => {
    request.mockRejectedValue(new Error("https://cdn.test?jwt=secret"));
    await expect(
      prepareGitHubPublicAttachment(attachment()),
    ).rejects.toMatchObject({ message: "github_attachment_download_failed" });
    await expect(
      prepareGitHubPublicAttachment({ type: "file", url: imageUrl }),
    ).rejects.toMatchObject({ code: "github_attachment_source_mismatch" });
  });
  it("uses the real DNS guard to reject a provider hostname resolving privately", async () => {
    const actual = await vi.importActual<
      typeof import("./remote-http-fetch.js")
    >("./remote-http-fetch.js");
    request.mockImplementation((url, init, options) =>
      actual.guardedRemoteHttpFetch(url, init, {
        ...options,
        lookup: async () => [{ address: "127.0.0.1", family: 4 }],
        socketFactory: () => {
          throw new Error("must not dial a denied address");
        },
      }),
    );
    await expect(
      prepareGitHubPublicAttachment(attachment()),
    ).rejects.toMatchObject({ code: "github_attachment_download_failed" });
    expect(request).toHaveBeenCalledTimes(1);
  });
  it("cancels a stalled response body at the total download deadline", async () => {
    const abort = new AbortController();
    vi.spyOn(AbortSignal, "timeout").mockReturnValue(abort.signal);
    const cancel = vi.fn();
    request.mockResolvedValue(
      new Response(new ReadableStream({ cancel }), {
        headers: { "content-type": "text/plain" },
      }),
    );
    const result = prepareGitHubPublicAttachment(fileAttachment());
    await vi.waitFor(() => expect(request).toHaveBeenCalledTimes(1));
    abort.abort(new Error("secret raw timeout detail"));
    await expect(result).rejects.toMatchObject({
      code: "github_attachment_download_failed",
      message: "github_attachment_download_failed",
    });
    expect(cancel).toHaveBeenCalledTimes(1);
  });
  it("shares the batch deadline and never starts later requests after it expires", async () => {
    const batch = new AbortController();
    const cancel = vi.fn();
    request.mockResolvedValue(
      new Response(new ReadableStream({ cancel }), {
        headers: { "content-type": "text/plain" },
      }),
    );
    const first = prepareGitHubPublicAttachment(fileAttachment(), batch.signal);
    await vi.waitFor(() => expect(request).toHaveBeenCalledTimes(1));
    batch.abort(new Error("private deadline detail"));
    await expect(first).rejects.toMatchObject({
      code: "github_attachment_download_failed",
    });
    for (const next of [attachment(), fileAttachment()]) {
      await expect(
        prepareGitHubPublicAttachment(next, batch.signal),
      ).rejects.toMatchObject({
        code: "github_attachment_download_failed",
        message: "github_attachment_download_failed",
      });
    }
    expect(cancel).toHaveBeenCalledTimes(1);
    expect(request).toHaveBeenCalledTimes(1);
  });
});
