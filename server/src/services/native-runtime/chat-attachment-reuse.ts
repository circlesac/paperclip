import { createHash } from "node:crypto";

import { and, desc, eq, inArray, isNull, sql } from "drizzle-orm";
import type { Db } from "@paperclipai/db";
import {
  assets,
  agents,
  chatConversations,
  chatDeliveries,
  chatEndpointResources,
  chatEndpoints,
  chatExternalPrincipals,
  chatIdentityLinks,
  chatMessageLinks,
  chatPublications,
  companyMemberships,
  heartbeatRuns,
  issueAttachments,
  issueComments,
  issues,
  issueWorkProducts,
} from "@paperclipai/db";

import {
  isAllowedContentType,
  MAX_ATTACHMENT_BYTES,
  normalizeContentType,
} from "../../attachment-types.js";
import { getStorageService } from "../../storage/index.js";
import type { StorageService } from "../../storage/types.js";
import { issueService } from "../issues.js";

export const LIST_CHAT_ATTACHMENTS_TOOL_NAME = "list_chat_attachments";
export const REUSE_CHAT_ATTACHMENT_TOOL_NAME = "reuse_chat_attachment";

export const LIST_CHAT_ATTACHMENTS_TOOL_DEFINITION = Object.freeze({
  name: LIST_CHAT_ATTACHMENTS_TOOL_NAME,
  description:
    "List metadata for files already received or delivered in this same external-chat conversation. Page through nextCursor to find older files, or filter by an exact sourceCommentId when known. File bytes and private storage locations are never returned.",
  inputSchema: {
    type: "object",
    properties: {
      sourceCommentId: {
        type: ["string", "null"],
        description:
          "Optional exact sourceCommentId returned by this tool on an earlier page.",
      },
      limit: { type: "integer", minimum: 1, maximum: 50, default: 20 },
      cursor: {
        type: ["string", "null"],
        maxLength: 1024,
        description: "Opaque nextCursor from the immediately preceding page.",
      },
    },
    required: [],
    additionalProperties: false,
  },
  annotations: {
    semanticContract: "paperclip.server-chat-attachment-reuse.v1",
    operationId: LIST_CHAT_ATTACHMENTS_TOOL_NAME,
    version: 1,
    exposure: "run_scoped",
    requiredClaims: [],
  },
});

export const REUSE_CHAT_ATTACHMENT_TOOL_DEFINITION = Object.freeze({
  name: REUSE_CHAT_ATTACHMENT_TOOL_NAME,
  description:
    "Prepare one exact file previously received or delivered in this same external-chat conversation for the current response. This queues a verified copy for final publication; it does not confirm provider delivery.",
  inputSchema: {
    type: "object",
    properties: {
      idempotencyKey: { type: "string", minLength: 1, maxLength: 200 },
      sourceCommentId: { type: "string", format: "uuid" },
      attachmentId: { type: "string", format: "uuid" },
      title: { type: "string", minLength: 1, maxLength: 500 },
    },
    required: ["idempotencyKey", "sourceCommentId", "attachmentId", "title"],
    additionalProperties: false,
  },
  annotations: {
    semanticContract: "paperclip.server-chat-attachment-reuse.v1",
    operationId: REUSE_CHAT_ATTACHMENT_TOOL_NAME,
    version: 1,
    exposure: "run_scoped",
    requiredClaims: [],
  },
});

type ChatReuseBinding = {
  companyId: string;
  issueId: string;
  runId: string;
  agentId: string;
};

type AuthorizedConversation = {
  conversationId: string;
  endpointId: string;
};

export type ChatAttachmentReuseSource = {
  sourceCommentId: string;
  attachmentId: string;
  filename: string;
  contentType: string;
  byteSize: number;
  sha256: string;
  objectKey: string;
  createdAt: Date;
};

export type ListedChatAttachment = Omit<
  ChatAttachmentReuseSource,
  "objectKey" | "createdAt"
> & {
  createdAt: string;
  contentAccess: "metadata_only";
};

export type ListedChatAttachmentPage = {
  attachments: ListedChatAttachment[];
  nextCursor: string | null;
  complete: boolean;
};

type ListCursor = {
  schema: "paperclip.chat-attachment-list-cursor.v1";
  conversationId: string;
  sourceCommentId: string | null;
  createdAt: string;
  attachmentId: string;
  sourceCommentIdTieBreak: string;
};

export type PreparedReusedChatAttachment = {
  result: {
    commandId: string;
    disposition: "applied";
    stateRevision: number;
    entityRefs: string[];
    scheduledWakeIds: never[];
    source: {
      commentId: string;
      attachmentId: string;
      sha256: string;
    };
    prepared: {
      attachmentId: string;
      workProductId: string;
      commentId: string;
      sha256: string;
    };
  };
  rollbackDefinitePreCommitFailure: (() => Promise<void>) | null;
};

function record(value: unknown): Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function wakeCommentIds(contextSnapshot: unknown): string[] {
  const context = record(contextSnapshot);
  const raw = context.wakeCommentIds;
  if (!Array.isArray(raw)) return [];
  return [
    ...new Set(
      raw
        .filter(
          (value): value is string =>
            typeof value === "string" && value.trim().length > 0,
        )
        .map((value) => value.trim()),
    ),
  ];
}

function publicationAttachmentIds(payload: unknown): string[] {
  const raw = record(payload).attachmentIds;
  return Array.isArray(raw)
    ? raw.filter((value): value is string => typeof value === "string")
    : [];
}

function encodeListCursor(cursor: ListCursor): string {
  return Buffer.from(JSON.stringify(cursor), "utf8").toString("base64url");
}

function decodeListCursor(
  value: unknown,
  conversationId: string,
  sourceCommentId: string | null,
): ListCursor | null {
  if (value === null || value === undefined) return null;
  if (typeof value !== "string" || value.length === 0 || value.length > 1024) {
    throw new Error("paperclip_runner_chat_attachment_cursor_invalid");
  }
  try {
    const parsed = record(
      JSON.parse(Buffer.from(value, "base64url").toString("utf8")),
    );
    const createdAt =
      typeof parsed.createdAt === "string" ? parsed.createdAt : "";
    const parsedDate = new Date(createdAt);
    if (
      parsed.schema !== "paperclip.chat-attachment-list-cursor.v1" ||
      parsed.conversationId !== conversationId ||
      (parsed.sourceCommentId ?? null) !== sourceCommentId ||
      Number.isNaN(parsedDate.getTime()) ||
      typeof parsed.attachmentId !== "string" ||
      typeof parsed.sourceCommentIdTieBreak !== "string"
    ) {
      throw new Error("invalid");
    }
    return parsed as ListCursor;
  } catch {
    throw new Error("paperclip_runner_chat_attachment_cursor_invalid");
  }
}

function destinationAllowed(
  endpoint: typeof chatEndpoints.$inferSelect,
  conversation: typeof chatConversations.$inferSelect,
  resource: typeof chatEndpointResources.$inferSelect | null,
): boolean {
  if (conversation.isDirectMessage) return endpoint.allowDirectMessages;
  if (!resource || resource.availability !== "available") return false;
  if (
    endpoint.provider === "microsoft-teams" &&
    resource.type === "group_chat"
  ) {
    return endpoint.allowGroupChats;
  }
  return resource.enabled;
}

async function principalAuthorized(
  tx: Db,
  endpoint: typeof chatEndpoints.$inferSelect,
  principalId: string,
): Promise<boolean> {
  await tx.execute(
    sql`select pg_advisory_xact_lock(hashtextextended(${`chat-identity:${endpoint.companyId}:${principalId}`}, 0))`,
  );
  const [principal] = await tx
    .select({ id: chatExternalPrincipals.id })
    .from(chatExternalPrincipals)
    .where(
      and(
        eq(chatExternalPrincipals.id, principalId),
        eq(chatExternalPrincipals.companyId, endpoint.companyId),
        eq(chatExternalPrincipals.provider, endpoint.provider),
        eq(
          chatExternalPrincipals.providerAccountId,
          endpoint.providerAccountId ?? "",
        ),
      ),
    )
    .for("update")
    .limit(1);
  if (!principal) return false;
  const [link] = await tx
    .select({
      status: chatIdentityLinks.status,
      userId: chatIdentityLinks.paperclipUserId,
    })
    .from(chatIdentityLinks)
    .where(
      and(
        eq(chatIdentityLinks.companyId, endpoint.companyId),
        eq(chatIdentityLinks.endpointId, endpoint.id),
        eq(chatIdentityLinks.principalId, principalId),
      ),
    )
    .for("update")
    .limit(1);
  const activeMember = async (userId: string) => {
    const [membership] = await tx
      .select({
        status: companyMemberships.status,
        role: companyMemberships.membershipRole,
      })
      .from(companyMemberships)
      .where(
        and(
          eq(companyMemberships.companyId, endpoint.companyId),
          eq(companyMemberships.principalType, "user"),
          eq(companyMemberships.principalId, userId),
        ),
      )
      .for("update")
      .limit(1);
    return membership?.status === "active" && membership.role !== "viewer";
  };
  if (link?.status === "linked") {
    return Boolean(link.userId && (await activeMember(link.userId)));
  }
  if (!endpoint.allowUnlinkedPeople) return false;
  return endpoint.sponsorUserId ? activeMember(endpoint.sponsorUserId) : true;
}

async function authorizedConversation(
  tx: Db,
  binding: ChatReuseBinding,
  contextSnapshot: unknown,
): Promise<AuthorizedConversation> {
  const context = record(contextSnapshot);
  const source = typeof context.source === "string" ? context.source : "";
  const provider = [
    "slack",
    "github",
    "discord",
    "microsoft-teams",
    "telegram",
  ].find(
    (candidate) =>
      source === `chat:${candidate}` || source === `chat:${candidate}:recovery`,
  );
  const commentIds = wakeCommentIds(context);
  if (
    !provider ||
    context.paperclipHarnessCheckedOut !== true ||
    commentIds.length === 0
  ) {
    throw new Error("paperclip_runner_chat_attachment_binding_denied");
  }
  const links = await tx
    .select({
      commentId: chatMessageLinks.commentId,
      conversation: chatConversations,
      endpoint: chatEndpoints,
      principalId: chatDeliveries.principalId,
    })
    .from(chatMessageLinks)
    .innerJoin(
      chatDeliveries,
      and(
        eq(chatDeliveries.id, chatMessageLinks.deliveryId),
        eq(chatDeliveries.companyId, chatMessageLinks.companyId),
        eq(chatDeliveries.endpointId, chatMessageLinks.endpointId),
        eq(chatDeliveries.conversationId, chatMessageLinks.conversationId),
      ),
    )
    .innerJoin(
      chatConversations,
      and(
        eq(chatConversations.id, chatMessageLinks.conversationId),
        eq(chatConversations.companyId, chatMessageLinks.companyId),
        eq(chatConversations.endpointId, chatMessageLinks.endpointId),
      ),
    )
    .innerJoin(
      chatEndpoints,
      and(
        eq(chatEndpoints.id, chatConversations.endpointId),
        eq(chatEndpoints.companyId, chatConversations.companyId),
      ),
    )
    .where(
      and(
        eq(chatMessageLinks.companyId, binding.companyId),
        eq(chatMessageLinks.direction, "inbound"),
        inArray(chatMessageLinks.commentId, commentIds),
        eq(chatDeliveries.state, "processed"),
        eq(chatConversations.issueId, binding.issueId),
        inArray(chatConversations.state, ["active", "waiting"]),
        eq(
          chatEndpoints.provider,
          provider as typeof chatEndpoints.$inferSelect.provider,
        ),
        eq(chatEndpoints.assignedAgentId, binding.agentId),
        eq(chatEndpoints.status, "active"),
      ),
    )
    .for("update");
  const linkedCommentIds = new Set(links.map((row) => row.commentId));
  const conversationIds = new Set(links.map((row) => row.conversation.id));
  const endpointIds = new Set(links.map((row) => row.endpoint.id));
  if (
    links.length === 0 ||
    conversationIds.size !== 1 ||
    endpointIds.size !== 1 ||
    !commentIds.every((id) => linkedCommentIds.has(id)) ||
    links.some((row) => !row.principalId)
  ) {
    throw new Error("paperclip_runner_chat_attachment_binding_denied");
  }
  const conversation = links[0]!.conversation;
  const endpoint = links[0]!.endpoint;
  const resource = conversation.resourceId
    ? await tx
        .select()
        .from(chatEndpointResources)
        .where(
          and(
            eq(chatEndpointResources.id, conversation.resourceId),
            eq(chatEndpointResources.companyId, binding.companyId),
            eq(chatEndpointResources.endpointId, endpoint.id),
          ),
        )
        .for("update")
        .then((rows) => rows[0] ?? null)
    : null;
  if (!destinationAllowed(endpoint, conversation, resource)) {
    throw new Error("paperclip_runner_chat_attachment_destination_denied");
  }
  for (const principalId of new Set(links.map((row) => row.principalId!))) {
    if (!(await principalAuthorized(tx, endpoint, principalId))) {
      throw new Error("paperclip_runner_chat_attachment_principal_denied");
    }
  }
  return { conversationId: conversation.id, endpointId: endpoint.id };
}

async function sourceLineageExists(
  tx: Db,
  binding: ChatReuseBinding,
  conversation: AuthorizedConversation,
  source: Pick<
    ChatAttachmentReuseSource,
    "sourceCommentId" | "attachmentId"
  > & {
    parentCommentId: string;
  },
): Promise<boolean> {
  const [inbound] = await tx
    .select({ providerEventId: chatDeliveries.providerEventId })
    .from(chatMessageLinks)
    .innerJoin(
      chatDeliveries,
      and(
        eq(chatDeliveries.id, chatMessageLinks.deliveryId),
        eq(chatDeliveries.companyId, chatMessageLinks.companyId),
      ),
    )
    .where(
      and(
        eq(chatMessageLinks.companyId, binding.companyId),
        eq(chatMessageLinks.endpointId, conversation.endpointId),
        eq(chatMessageLinks.conversationId, conversation.conversationId),
        eq(chatMessageLinks.direction, "inbound"),
        eq(chatMessageLinks.commentId, source.sourceCommentId),
        eq(chatDeliveries.state, "processed"),
      ),
    )
    .limit(1);
  if (inbound && source.parentCommentId === source.sourceCommentId) {
    const [lifecycle] = await tx
      .select({ id: chatDeliveries.id })
      .from(chatDeliveries)
      .where(
        and(
          eq(chatDeliveries.companyId, binding.companyId),
          eq(chatDeliveries.endpointId, conversation.endpointId),
          eq(chatDeliveries.conversationId, conversation.conversationId),
          inArray(chatDeliveries.eventKind, [
            "message_updated",
            "message_deleted",
            "message_restored",
          ]),
          eq(chatDeliveries.state, "processed"),
          sql`${chatDeliveries.normalizedEvent}->'message'->>'targetProviderEventId' = ${inbound.providerEventId}`,
        ),
      )
      .limit(1);
    return !lifecycle;
  }
  const publications = await tx
    .select({
      payload: chatPublications.payload,
      providerMessageId: chatPublications.providerMessageId,
    })
    .from(chatPublications)
    .where(
      and(
        eq(chatPublications.companyId, binding.companyId),
        eq(chatPublications.endpointId, conversation.endpointId),
        eq(chatPublications.conversationId, conversation.conversationId),
        eq(chatPublications.issueId, binding.issueId),
        eq(chatPublications.commentId, source.sourceCommentId),
        eq(chatPublications.state, "published"),
      ),
    );
  const matchingPublications = publications.filter((row) =>
    publicationAttachmentIds(row.payload).includes(source.attachmentId),
  );
  if (matchingPublications.length === 0) return false;
  const providerMessageIds = matchingPublications.flatMap((row) =>
    row.providerMessageId ? [row.providerMessageId] : [],
  );
  if (providerMessageIds.length === 0) return true;
  const [lifecycle] = await tx
    .select({ id: chatDeliveries.id })
    .from(chatDeliveries)
    .where(
      and(
        eq(chatDeliveries.companyId, binding.companyId),
        eq(chatDeliveries.endpointId, conversation.endpointId),
        eq(chatDeliveries.conversationId, conversation.conversationId),
        inArray(chatDeliveries.eventKind, [
          "message_updated",
          "message_deleted",
          "message_restored",
        ]),
        eq(chatDeliveries.state, "processed"),
        inArray(
          sql<string>`${chatDeliveries.normalizedEvent}->'message'->>'providerMessageId'`,
          providerMessageIds,
        ),
      ),
    )
    .limit(1);
  return !lifecycle;
}

async function loadSource(
  tx: Db,
  binding: ChatReuseBinding,
  conversation: AuthorizedConversation,
  sourceCommentId: string,
  attachmentId: string,
): Promise<ChatAttachmentReuseSource> {
  const [sourceComment] = await tx
    .select({ id: issueComments.id })
    .from(issueComments)
    .where(
      and(
        eq(issueComments.id, sourceCommentId),
        eq(issueComments.companyId, binding.companyId),
        eq(issueComments.issueId, binding.issueId),
        isNull(issueComments.deletedAt),
      ),
    )
    .for("update")
    .limit(1);
  if (!sourceComment) {
    throw new Error("paperclip_runner_chat_attachment_source_denied");
  }
  const [row] = await tx
    .select({
      attachmentId: issueAttachments.id,
      parentCommentId: issueComments.id,
      filename: assets.originalFilename,
      contentType: assets.contentType,
      byteSize: assets.byteSize,
      sha256: assets.sha256,
      objectKey: assets.objectKey,
      createdAt: issueAttachments.createdAt,
    })
    .from(issueAttachments)
    .innerJoin(
      assets,
      and(
        eq(assets.id, issueAttachments.assetId),
        eq(assets.companyId, binding.companyId),
      ),
    )
    .innerJoin(
      issueComments,
      and(
        eq(issueComments.id, issueAttachments.issueCommentId),
        eq(issueComments.companyId, binding.companyId),
        eq(issueComments.issueId, binding.issueId),
        isNull(issueComments.deletedAt),
      ),
    )
    .where(
      and(
        eq(issueAttachments.id, attachmentId),
        eq(issueAttachments.companyId, binding.companyId),
        eq(issueAttachments.issueId, binding.issueId),
      ),
    )
    .for("update")
    .limit(1);
  if (
    !row ||
    !row.filename ||
    row.byteSize <= 0 ||
    row.byteSize > MAX_ATTACHMENT_BYTES ||
    !isAllowedContentType(normalizeContentType(row.contentType)) ||
    !/^[a-f0-9]{64}$/iu.test(row.sha256)
  ) {
    throw new Error("paperclip_runner_chat_attachment_source_denied");
  }
  const sourceWithParent = {
    sourceCommentId,
    attachmentId: row.attachmentId,
    parentCommentId: row.parentCommentId,
    filename: row.filename,
    contentType: normalizeContentType(row.contentType),
    byteSize: row.byteSize,
    sha256: row.sha256,
    objectKey: row.objectKey,
    createdAt: row.createdAt,
  };
  if (
    !(await sourceLineageExists(tx, binding, conversation, sourceWithParent))
  ) {
    throw new Error("paperclip_runner_chat_attachment_source_denied");
  }
  const { parentCommentId: _parentCommentId, ...source } = sourceWithParent;
  return source;
}

export async function listAuthorizedChatAttachments(input: {
  db: Db;
  binding: ChatReuseBinding;
  sourceCommentId?: string | null;
  cursor?: string | null;
  limit: number;
}): Promise<ListedChatAttachmentPage> {
  return input.db.transaction(async (tx) => {
    const [current] = await tx
      .select({ run: heartbeatRuns, actorStatus: agents.status })
      .from(heartbeatRuns)
      .innerJoin(
        issues,
        and(
          eq(issues.id, input.binding.issueId),
          eq(issues.companyId, heartbeatRuns.companyId),
        ),
      )
      .innerJoin(
        agents,
        and(
          eq(agents.id, input.binding.agentId),
          eq(agents.companyId, heartbeatRuns.companyId),
        ),
      )
      .where(
        and(
          eq(heartbeatRuns.id, input.binding.runId),
          eq(heartbeatRuns.companyId, input.binding.companyId),
          eq(heartbeatRuns.agentId, input.binding.agentId),
          eq(heartbeatRuns.nativeIssueId, input.binding.issueId),
          eq(heartbeatRuns.runtimeMode, "native"),
          eq(heartbeatRuns.status, "running"),
          eq(issues.assigneeAgentId, input.binding.agentId),
          eq(issues.executionRunId, input.binding.runId),
        ),
      )
      .for("update")
      .limit(1);
    if (
      !current ||
      ["paused", "terminated", "pending_approval", "error"].includes(
        current.actorStatus,
      )
    ) {
      throw new Error("paperclip_runner_tool_binding_not_authorized");
    }
    const conversation = await authorizedConversation(
      tx as unknown as Db,
      input.binding,
      current.run.contextSnapshot,
    );
    const sourceFilter = input.sourceCommentId ?? null;
    const cursor = decodeListCursor(
      input.cursor,
      conversation.conversationId,
      sourceFilter,
    );
    const rawCandidates = await tx.execute(sql<{
      attachment_id: string;
      source_comment_id: string;
      created_at: Date | string;
    }>`
      with candidate_pairs as (
        select
          attachment.id as attachment_id,
          link.comment_id as source_comment_id,
          attachment.created_at
        from issue_attachments attachment
        join issue_comments parent_comment
          on parent_comment.id = attachment.issue_comment_id
          and parent_comment.company_id = ${input.binding.companyId}::uuid
          and parent_comment.issue_id = ${input.binding.issueId}::uuid
          and parent_comment.deleted_at is null
        join chat_message_links link
          on link.company_id = ${input.binding.companyId}::uuid
          and link.endpoint_id = ${conversation.endpointId}::uuid
          and link.conversation_id = ${conversation.conversationId}::uuid
          and link.direction = 'inbound'
          and link.comment_id = attachment.issue_comment_id
        join chat_deliveries delivery
          on delivery.id = link.delivery_id
          and delivery.company_id = link.company_id
          and delivery.endpoint_id = link.endpoint_id
          and delivery.conversation_id = link.conversation_id
          and delivery.state = 'processed'
        where attachment.company_id = ${input.binding.companyId}::uuid
          and attachment.issue_id = ${input.binding.issueId}::uuid
          and (${sourceFilter}::uuid is null or link.comment_id = ${sourceFilter}::uuid)

        union all

        select
          attachment.id as attachment_id,
          publication.comment_id as source_comment_id,
          attachment.created_at
        from issue_attachments attachment
        join issue_comments parent_comment
          on parent_comment.id = attachment.issue_comment_id
          and parent_comment.company_id = ${input.binding.companyId}::uuid
          and parent_comment.issue_id = ${input.binding.issueId}::uuid
          and parent_comment.deleted_at is null
        join chat_publications publication
          on publication.company_id = ${input.binding.companyId}::uuid
          and publication.endpoint_id = ${conversation.endpointId}::uuid
          and publication.conversation_id = ${conversation.conversationId}::uuid
          and publication.issue_id = ${input.binding.issueId}::uuid
          and publication.state = 'published'
          and publication.comment_id is not null
          and publication.payload->'attachmentIds' ? attachment.id::text
        join issue_comments source_comment
          on source_comment.id = publication.comment_id
          and source_comment.company_id = publication.company_id
          and source_comment.issue_id = publication.issue_id
          and source_comment.deleted_at is null
        where attachment.company_id = ${input.binding.companyId}::uuid
          and attachment.issue_id = ${input.binding.issueId}::uuid
          and (${sourceFilter}::uuid is null or publication.comment_id = ${sourceFilter}::uuid)
      ), candidates as (
        select distinct on (attachment_id)
          attachment_id,
          source_comment_id,
          created_at
        from candidate_pairs
        order by attachment_id, created_at desc, source_comment_id desc
      )
      select attachment_id, source_comment_id, created_at
      from candidates
      where (
        ${cursor?.createdAt ?? null}::timestamptz is null
        or (created_at, attachment_id, source_comment_id) <
          (${cursor?.createdAt ?? null}::timestamptz, ${cursor?.attachmentId ?? null}::uuid, ${cursor?.sourceCommentIdTieBreak ?? null}::uuid)
      )
      order by created_at desc, attachment_id desc, source_comment_id desc
      limit ${input.limit + 1}
    `);
    const candidates = (
      Array.from(rawCandidates) as Array<{
        attachment_id: string;
        source_comment_id: string;
        created_at: Date | string;
      }>
    ).map((row) => ({
      sourceCommentId: row.source_comment_id,
      attachmentId: row.attachment_id,
      createdAt:
        row.created_at instanceof Date
          ? row.created_at
          : new Date(row.created_at),
    }));
    const listed: ListedChatAttachment[] = [];
    const scanned = candidates.slice(0, input.limit);
    for (const candidate of scanned) {
      if (listed.length >= input.limit) break;
      try {
        const source = await loadSource(
          tx as unknown as Db,
          input.binding,
          conversation,
          candidate.sourceCommentId,
          candidate.attachmentId,
        );
        listed.push({
          sourceCommentId: source.sourceCommentId,
          attachmentId: source.attachmentId,
          filename: source.filename,
          contentType: source.contentType,
          byteSize: source.byteSize,
          sha256: source.sha256,
          createdAt: source.createdAt.toISOString(),
          contentAccess: "metadata_only",
        });
      } catch (error) {
        // Metadata listing omits deleted, oversized, or no-longer-lineaged files.
        if (
          !(error instanceof Error) ||
          error.message !== "paperclip_runner_chat_attachment_source_denied"
        ) {
          throw error;
        }
      }
    }
    const lastScanned = scanned.at(-1) ?? null;
    const hasMore = candidates.length > input.limit;
    return {
      attachments: listed,
      nextCursor:
        hasMore && lastScanned
          ? encodeListCursor({
              schema: "paperclip.chat-attachment-list-cursor.v1",
              conversationId: conversation.conversationId,
              sourceCommentId: sourceFilter,
              createdAt: lastScanned.createdAt.toISOString(),
              attachmentId: lastScanned.attachmentId,
              sourceCommentIdTieBreak: lastScanned.sourceCommentId,
            })
          : null,
      complete: !hasMore,
    };
  });
}

export async function authorizeChatAttachmentReuse(input: {
  db: Db;
  binding: ChatReuseBinding;
  contextSnapshot: unknown;
  sourceCommentId: string;
  attachmentId: string;
}): Promise<ChatAttachmentReuseSource> {
  const conversation = await authorizedConversation(
    input.db,
    input.binding,
    input.contextSnapshot,
  );
  return loadSource(
    input.db,
    input.binding,
    conversation,
    input.sourceCommentId,
    input.attachmentId,
  );
}

async function readSourceBytes(
  storage: StorageService,
  companyId: string,
  source: ChatAttachmentReuseSource,
): Promise<Buffer> {
  let acquisitionTimedOut = false;
  let rejectAcquisition!: (error: Error) => void;
  const acquisitionTimeout = new Promise<never>((_resolve, reject) => {
    rejectAcquisition = reject;
  });
  const acquisitionTimer = setTimeout(() => {
    acquisitionTimedOut = true;
    rejectAcquisition(
      new Error("paperclip_runner_chat_attachment_source_read_timed_out"),
    );
  }, 10_000);
  acquisitionTimer.unref?.();
  const objectPromise = storage
    .getObject(companyId, source.objectKey)
    .then((object) => {
      if (acquisitionTimedOut) object.stream.destroy();
      return object;
    });
  let object: Awaited<ReturnType<StorageService["getObject"]>>;
  try {
    object = await Promise.race([objectPromise, acquisitionTimeout]);
  } finally {
    clearTimeout(acquisitionTimer);
  }
  const timeout = setTimeout(() => {
    object.stream.destroy(
      new Error("paperclip_runner_chat_attachment_source_read_timed_out"),
    );
  }, 10_000);
  timeout.unref?.();
  const chunks: Buffer[] = [];
  let total = 0;
  try {
    for await (const chunk of object.stream) {
      const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
      total += buffer.length;
      if (total > source.byteSize || total > MAX_ATTACHMENT_BYTES) {
        object.stream.destroy();
        throw new Error(
          "paperclip_runner_chat_attachment_source_size_mismatch",
        );
      }
      chunks.push(buffer);
    }
  } finally {
    clearTimeout(timeout);
  }
  const body = Buffer.concat(chunks);
  if (
    body.length !== source.byteSize ||
    createHash("sha256").update(body).digest("hex") !==
      source.sha256.toLowerCase()
  ) {
    if (!object.stream.destroyed) {
      object.stream.destroy();
    }
    throw new Error(
      "paperclip_runner_chat_attachment_source_integrity_mismatch",
    );
  }
  return body;
}

export async function prepareReusedChatAttachment(input: {
  db: Db;
  binding: ChatReuseBinding;
  source: ChatAttachmentReuseSource;
  title: string;
  storage?: StorageService;
}): Promise<PreparedReusedChatAttachment> {
  const [issue] = await input.db
    .select({ statusVersion: issues.statusVersion })
    .from(issues)
    .innerJoin(
      heartbeatRuns,
      and(
        eq(heartbeatRuns.id, input.binding.runId),
        eq(heartbeatRuns.companyId, issues.companyId),
        eq(heartbeatRuns.nativeIssueId, issues.id),
      ),
    )
    .where(
      and(
        eq(issues.id, input.binding.issueId),
        eq(issues.companyId, input.binding.companyId),
        eq(issues.assigneeAgentId, input.binding.agentId),
        eq(issues.executionRunId, input.binding.runId),
        eq(heartbeatRuns.agentId, input.binding.agentId),
        eq(heartbeatRuns.status, "running"),
        eq(heartbeatRuns.runtimeMode, "native"),
      ),
    )
    .limit(1);
  if (!issue)
    throw new Error("paperclip_runner_chat_attachment_binding_denied");
  const storage = input.storage ?? getStorageService();
  const body = await readSourceBytes(
    storage,
    input.binding.companyId,
    input.source,
  );
  const stored = await storage.putFile({
    companyId: input.binding.companyId,
    namespace: `issues/${input.binding.issueId}`,
    originalFilename: input.source.filename,
    contentType: input.source.contentType,
    body,
  });
  try {
    if (
      stored.byteSize !== body.length ||
      stored.sha256.toLowerCase() !== input.source.sha256.toLowerCase() ||
      stored.contentType !== input.source.contentType
    ) {
      throw new Error("paperclip_runner_chat_attachment_storage_mismatch");
    }
    const attachment = await issueService(input.db).createAttachment({
      issueId: input.binding.issueId,
      provider: stored.provider,
      objectKey: stored.objectKey,
      contentType: stored.contentType,
      byteSize: stored.byteSize,
      sha256: stored.sha256,
      originalFilename: stored.originalFilename,
      createdByAgentId: input.binding.agentId,
      createdByRunId: input.binding.runId,
    });
    if (
      !attachment.artifactWorkProductId ||
      attachment.originatingRunId !== input.binding.runId
    ) {
      throw new Error("paperclip_runner_chat_attachment_origin_not_persisted");
    }
    const [workProduct] = await input.db
      .select({ metadata: issueWorkProducts.metadata })
      .from(issueWorkProducts)
      .where(
        and(
          eq(issueWorkProducts.id, attachment.artifactWorkProductId),
          eq(issueWorkProducts.companyId, input.binding.companyId),
          eq(issueWorkProducts.issueId, input.binding.issueId),
          eq(issueWorkProducts.createdByRunId, input.binding.runId),
        ),
      )
      .for("update")
      .limit(1);
    if (!workProduct) {
      throw new Error("paperclip_runner_chat_attachment_origin_not_persisted");
    }
    await input.db
      .update(issueWorkProducts)
      .set({
        title: input.title,
        metadata: {
          ...record(workProduct.metadata),
          reusedFromAttachmentId: input.source.attachmentId,
          reusedFromCommentId: input.source.sourceCommentId,
          reusedFromSha256: input.source.sha256,
        },
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(issueWorkProducts.id, attachment.artifactWorkProductId),
          eq(issueWorkProducts.companyId, input.binding.companyId),
          eq(issueWorkProducts.issueId, input.binding.issueId),
          eq(issueWorkProducts.createdByRunId, input.binding.runId),
        ),
      );
    const comment = await issueService(input.db).addComment(
      input.binding.issueId,
      `Prepared ${input.title} for this response.`,
      { agentId: input.binding.agentId, runId: input.binding.runId },
      {
        attachmentIds: [attachment.id],
        authorizationReason: "paperclip_runner_protocol",
      },
      input.db,
    );
    return {
      result: {
        commandId: `chat-attachment-reused:${attachment.id}`,
        disposition: "applied",
        stateRevision: issue.statusVersion,
        entityRefs: [
          attachment.id,
          attachment.artifactWorkProductId,
          comment.id,
        ],
        scheduledWakeIds: [],
        source: {
          commentId: input.source.sourceCommentId,
          attachmentId: input.source.attachmentId,
          sha256: input.source.sha256,
        },
        prepared: {
          attachmentId: attachment.id,
          workProductId: attachment.artifactWorkProductId,
          commentId: comment.id,
          sha256: attachment.sha256,
        },
      },
      rollbackDefinitePreCommitFailure: async () => {
        await storage.deleteObject(input.binding.companyId, stored.objectKey);
      },
    };
  } catch (error) {
    await storage
      .deleteObject(input.binding.companyId, stored.objectKey)
      .catch(() => undefined);
    throw error;
  }
}
