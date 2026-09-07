import { createHash, randomUUID } from "node:crypto";
import { mkdir, mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

import { eq } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  activityLog,
  agents,
  assets,
  chatConversations,
  chatDeliveries,
  chatEndpointResources,
  chatEndpoints,
  chatExternalPrincipals,
  chatIdentityLinks,
  chatMessageLinks,
  chatPublications,
  companies,
  companyMemberships,
  createDb,
  heartbeatRuns,
  issueAttachments,
  issueComments,
  issues,
  issueWorkProducts,
  toolApplications,
  toolConnections,
} from "@paperclipai/db";

import { startEmbeddedPostgresTestDatabase } from "../../__tests__/helpers/embedded-postgres.js";
import { createLocalDiskStorageProvider } from "../../storage/local-disk-provider.js";
import { createStorageService } from "../../storage/service.js";
import { issueService } from "../issues.js";
import { mergeHeartbeatRunResultJson } from "../heartbeat-run-summary.js";
import { PaperclipRunnerToolAuthority } from "./paperclip-runner-tool-authority.js";

describe("native same-conversation chat attachment reuse", () => {
  let temporary: Awaited<
    ReturnType<typeof startEmbeddedPostgresTestDatabase>
  > | null = null;
  let db: ReturnType<typeof createDb>;
  let storage: ReturnType<typeof createStorageService>;

  const companyId = "10000000-0000-4000-8000-000000000101";
  const agentId = "10000000-0000-4000-8000-000000000102";
  const issueId = "10000000-0000-4000-8000-000000000103";
  const runId = "10000000-0000-4000-8000-000000000104";
  const endpointId = "10000000-0000-4000-8000-000000000105";
  const conversationId = "10000000-0000-4000-8000-000000000106";
  const resourceId = "10000000-0000-4000-8000-000000000107";
  const principalId = "10000000-0000-4000-8000-000000000108";
  const userId = "chat-user-1";
  let currentCommentId: string;
  let sourceCommentId: string;
  let sourceAttachmentId: string;
  const sourceBody = Buffer.from(
    "same-conversation historical bytes\n",
    "utf8",
  );

  beforeAll(async () => {
    temporary = await startEmbeddedPostgresTestDatabase("native-chat-reuse-");
    db = createDb(temporary.connectionString);
    const storageRoot = await mkdtemp(
      path.join(tmpdir(), "paperclip-chat-reuse-"),
    );
    await mkdir(storageRoot, { recursive: true });
    storage = createStorageService(createLocalDiskStorageProvider(storageRoot));
    await db.insert(companies).values({
      id: companyId,
      name: "Native chat attachment reuse",
      issuePrefix: "NCR",
      issueCounter: 1,
    });
    await db.insert(agents).values({
      id: agentId,
      companyId,
      name: "Native chat agent",
      adapterType: "paperclip_runner",
      adapterConfig: { provider: "codex" },
      runtimeConfig: {},
      status: "active",
    });
    await db.insert(issues).values({
      id: issueId,
      companyId,
      issueNumber: 1,
      identifier: "NCR-1",
      title: "Reuse the earlier file",
      status: "in_progress",
      workMode: "standard",
      assigneeAgentId: agentId,
    });
    await db.insert(heartbeatRuns).values({
      id: runId,
      companyId,
      agentId,
      status: "running",
      runtimeMode: "native",
      nativeIssueId: issueId,
      invocationSource: "assignment",
      triggerDetail: "system",
      contextSnapshot: {},
    });
    await db
      .update(issues)
      .set({ executionRunId: runId })
      .where(eq(issues.id, issueId));

    const applicationId = randomUUID();
    const connectionId = randomUUID();
    await db.insert(toolApplications).values({
      id: applicationId,
      companyId,
      applicationKey: `chat:discord:${endpointId}`,
      name: "Discord reuse",
      type: "chat",
      status: "active",
    });
    await db.insert(toolConnections).values({
      id: connectionId,
      companyId,
      applicationId,
      name: "Discord reuse",
      uid: `chat-discord-${endpointId}`,
      connectionPurpose: "channel",
      transport: "chat_sdk",
      status: "active",
      enabled: true,
    });
    await db.insert(chatEndpoints).values({
      id: endpointId,
      companyId,
      connectionId,
      provider: "discord",
      publicId: randomUUID(),
      assignedAgentId: agentId,
      status: "active",
      providerAccountId: "guild-1",
      allowUnlinkedPeople: false,
    });
    await db.insert(chatEndpointResources).values({
      id: resourceId,
      companyId,
      endpointId,
      type: "channel",
      providerResourceId: "channel-1",
      label: "#files",
      availability: "available",
      enabled: true,
    });
    await db.insert(chatConversations).values({
      id: conversationId,
      companyId,
      endpointId,
      resourceId,
      issueId,
      externalConversationId: "channel-1",
      externalThreadId: "thread-1",
      externalLabel: "#files thread",
      state: "active",
    });
    await db.insert(chatExternalPrincipals).values({
      id: principalId,
      companyId,
      provider: "discord",
      providerAccountId: "guild-1",
      externalId: "discord-user-1",
      kind: "user",
    });
    await db.insert(chatIdentityLinks).values({
      companyId,
      endpointId,
      principalId,
      paperclipUserId: userId,
      status: "linked",
    });
    await db.insert(companyMemberships).values({
      companyId,
      principalType: "user",
      principalId: userId,
      status: "active",
      membershipRole: "member",
    });

    const sourceComment = await issueService(db).addComment(
      issueId,
      "The earlier upload",
      { userId },
    );
    sourceCommentId = sourceComment.id;
    const stored = await storage.putFile({
      companyId,
      namespace: `issues/${issueId}`,
      originalFilename: "earlier.txt",
      contentType: "text/plain",
      body: sourceBody,
    });
    const sourceAttachment = await issueService(db).createAttachment({
      issueId,
      issueCommentId: sourceCommentId,
      provider: stored.provider,
      objectKey: stored.objectKey,
      contentType: stored.contentType,
      byteSize: stored.byteSize,
      sha256: stored.sha256,
      originalFilename: stored.originalFilename,
      createdByUserId: userId,
    });
    sourceAttachmentId = sourceAttachment.id;
    const sourceDeliveryId = randomUUID();
    await db.insert(chatDeliveries).values({
      id: sourceDeliveryId,
      companyId,
      endpointId,
      conversationId,
      principalId,
      providerEventId: "source-event",
      deduplicationKey: "source-event",
      eventKind: "message",
      normalizedEvent: {},
      state: "processed",
      attempts: 1,
      processedAt: new Date(),
    });
    await db.insert(chatMessageLinks).values({
      companyId,
      endpointId,
      conversationId,
      deliveryId: sourceDeliveryId,
      commentId: sourceCommentId,
      providerMessageId: "source-message",
      direction: "inbound",
    });

    const currentComment = await issueService(db).addComment(
      issueId,
      "Please send that earlier file again",
      { userId },
    );
    currentCommentId = currentComment.id;
    const currentDeliveryId = randomUUID();
    await db.insert(chatDeliveries).values({
      id: currentDeliveryId,
      companyId,
      endpointId,
      conversationId,
      principalId,
      providerEventId: "current-event",
      deduplicationKey: "current-event",
      eventKind: "message",
      normalizedEvent: {},
      state: "processed",
      attempts: 1,
      processedAt: new Date(),
    });
    await db.insert(chatMessageLinks).values({
      companyId,
      endpointId,
      conversationId,
      deliveryId: currentDeliveryId,
      commentId: currentCommentId,
      providerMessageId: "current-message",
      direction: "inbound",
    });
    await db
      .update(heartbeatRuns)
      .set({
        contextSnapshot: {
          source: "chat:discord",
          paperclipHarnessCheckedOut: true,
          wakeCommentIds: [currentCommentId],
          commentId: currentCommentId,
        },
      })
      .where(eq(heartbeatRuns.id, runId));
  });

  afterAll(async () => {
    await temporary?.cleanup();
  });

  function authority() {
    return new PaperclipRunnerToolAuthority(db, {
      companyId,
      agentId,
      issueId,
      runId,
      executionTargetKind: "remote",
      storage,
    });
  }

  it("lists metadata only and clones exact bytes once into current-run provenance", async () => {
    const runner = authority();
    const listed = await runner.execute({
      tool: "list_chat_attachments",
      callId: "list",
      arguments: { sourceCommentId, limit: 10 },
    });
    expect(listed).toEqual({
      attachments: [
        {
          sourceCommentId,
          attachmentId: sourceAttachmentId,
          filename: "earlier.txt",
          contentType: "text/plain",
          byteSize: sourceBody.length,
          sha256: createHash("sha256").update(sourceBody).digest("hex"),
          createdAt: expect.any(String),
          contentAccess: "metadata_only",
        },
      ],
      nextCursor: null,
      complete: true,
    });
    expect(JSON.stringify(listed)).not.toContain("objectKey");
    expect(JSON.stringify(listed)).not.toContain("/api/attachments/");

    const call = {
      tool: "reuse_chat_attachment",
      callId: "reuse",
      arguments: {
        idempotencyKey: "reuse-earlier-v1",
        sourceCommentId,
        attachmentId: sourceAttachmentId,
        title: "Earlier requested file",
      },
    };
    const first = (await runner.execute(call)) as Record<string, unknown>;
    const replay = await runner.execute({ ...call, callId: "reuse-replay" });
    const duplicate = (await runner.execute({
      ...call,
      callId: "reuse-new-key",
      arguments: { ...call.arguments, idempotencyKey: "reuse-earlier-v2" },
    })) as Record<string, unknown>;
    expect(first).toMatchObject({
      disposition: "applied",
      source: { commentId: sourceCommentId, attachmentId: sourceAttachmentId },
      prepared: {
        attachmentId: expect.any(String),
        workProductId: expect.any(String),
        commentId: expect.any(String),
        sha256: createHash("sha256").update(sourceBody).digest("hex"),
      },
    });
    expect(replay).toEqual(first);
    expect(duplicate).toMatchObject({
      disposition: "duplicate",
      prepared: (first as { prepared: unknown }).prepared,
    });
    const preparedId = (first as { prepared: { attachmentId: string } })
      .prepared.attachmentId;
    const attachments = await db
      .select({
        id: issueAttachments.id,
        originatingRunId: issueAttachments.originatingRunId,
        objectKey: assets.objectKey,
        sha256: assets.sha256,
      })
      .from(issueAttachments)
      .innerJoin(assets, eq(assets.id, issueAttachments.assetId))
      .where(eq(issueAttachments.issueId, issueId));
    expect(attachments).toHaveLength(2);
    expect(attachments.find((row) => row.id === preparedId)).toMatchObject({
      originatingRunId: runId,
      sha256: createHash("sha256").update(sourceBody).digest("hex"),
    });
    const prepared = attachments.find((row) => row.id === preparedId)!;
    const object = await storage.getObject(companyId, prepared.objectKey);
    const chunks: Buffer[] = [];
    for await (const chunk of object.stream) chunks.push(Buffer.from(chunk));
    expect(Buffer.concat(chunks)).toEqual(sourceBody);
    const [workProduct] = await db
      .select()
      .from(issueWorkProducts)
      .where(eq(issueWorkProducts.externalId, preparedId));
    expect(workProduct).toMatchObject({
      createdByRunId: runId,
      metadata: expect.objectContaining({
        contentPath: `/api/attachments/${preparedId}/content`,
        reusedFromAttachmentId: sourceAttachmentId,
        reusedFromCommentId: sourceCommentId,
      }),
    });
    const [run] = await db
      .select({ resultJson: heartbeatRuns.resultJson })
      .from(heartbeatRuns)
      .where(eq(heartbeatRuns.id, runId));
    const receipts = (
      run.resultJson as {
        semanticToolReceipts: Record<
          string,
          {
            operationId: string;
            input: unknown;
            result: unknown;
          }
        >;
      }
    ).semanticToolReceipts;
    expect(receipts["reuse-earlier-v1"]).toMatchObject({
      operationId: "reuse_chat_attachment",
      input: call.arguments,
    });
    expect(receipts["reuse-earlier-v1"]?.result).toEqual(first);
    expect(receipts["reuse-earlier-v2"]?.result).toEqual(duplicate);
    const completedResult = mergeHeartbeatRunResultJson(
      {
        ...(run.resultJson ?? {}),
        nativeResult: {
          schema: "paperclip.run_result.v1",
          summary: "Prepared the earlier file again.",
        },
      },
      "Prepared the earlier file again.",
    );
    await db
      .update(heartbeatRuns)
      .set({ resultJson: completedResult })
      .where(eq(heartbeatRuns.id, runId));
    const persistedCompletion = (
      await db
        .select({ resultJson: heartbeatRuns.resultJson })
        .from(heartbeatRuns)
        .where(eq(heartbeatRuns.id, runId))
    )[0]?.resultJson as {
      semanticToolReceipts: typeof receipts;
      nativeResult: { summary: string };
    };
    expect(persistedCompletion.semanticToolReceipts).toEqual(receipts);
    expect(persistedCompletion.nativeResult.summary).toBe(
      "Prepared the earlier file again.",
    );
    const reuseActivity = (
      await db.select().from(activityLog).where(eq(activityLog.runId, runId))
    ).find(
      (row) => row.details?.source === "paperclip_runner_chat_attachment_reuse",
    );
    expect(reuseActivity?.details).toMatchObject({
      sourceAttachmentId,
      sourceCommentId,
      attachmentId: preparedId,
    });
  });

  it("pages a stable deduplicated attachment history with equal timestamps", async () => {
    const equalCreatedAt = new Date("2026-09-07T18:00:00.000Z");
    const newAttachmentIds: string[] = [];
    for (let index = 0; index < 3; index += 1) {
      const comment = await issueService(db).addComment(
        issueId,
        `Historical upload ${index}`,
        { userId },
      );
      const body = Buffer.from(`historical-${index}\n`, "utf8");
      const stored = await storage.putFile({
        companyId,
        namespace: `issues/${issueId}`,
        originalFilename: `historical-${index}.txt`,
        contentType: "text/plain",
        body,
      });
      const attachment = await issueService(db).createAttachment({
        issueId,
        issueCommentId: comment.id,
        provider: stored.provider,
        objectKey: stored.objectKey,
        contentType: stored.contentType,
        byteSize: stored.byteSize,
        sha256: stored.sha256,
        originalFilename: stored.originalFilename,
        createdByUserId: userId,
      });
      newAttachmentIds.push(attachment.id);
      await db
        .update(issueAttachments)
        .set({ createdAt: equalCreatedAt })
        .where(eq(issueAttachments.id, attachment.id));
      const deliveryId = randomUUID();
      await db.insert(chatDeliveries).values({
        id: deliveryId,
        companyId,
        endpointId,
        conversationId,
        principalId,
        providerEventId: `historical-event-${index}`,
        deduplicationKey: `historical-event-${index}`,
        eventKind: "message",
        normalizedEvent: {},
        state: "processed",
        attempts: 1,
        processedAt: new Date(),
      });
      await db.insert(chatMessageLinks).values({
        companyId,
        endpointId,
        conversationId,
        deliveryId,
        commentId: comment.id,
        providerMessageId: `historical-message-${index}`,
        direction: "inbound",
      });
    }
    const [publicationCommentA, publicationCommentB] = await Promise.all([
      issueService(db).addComment(issueId, "Published file A", { userId }),
      issueService(db).addComment(issueId, "Published file B", { userId }),
    ]);
    for (const [index, comment] of [
      publicationCommentA,
      publicationCommentB,
    ].entries()) {
      await db.insert(chatPublications).values({
        companyId,
        endpointId,
        conversationId,
        issueId,
        commentId: comment.id,
        idempotencyKey: `published-duplicate-${index}`,
        payload: {
          text: "Shared the earlier file.",
          attachmentIds: [sourceAttachmentId],
        },
        state: "published",
        providerMessageId: `published-message-${index}`,
        publishedAt: new Date(),
      });
    }
    const seen: string[] = [];
    let cursor: string | null = null;
    for (let pageNumber = 0; pageNumber < 4; pageNumber += 1) {
      const page = (await authority().execute({
        tool: "list_chat_attachments",
        callId: `page-${pageNumber}`,
        arguments: { limit: 2, cursor },
      })) as {
        attachments: Array<{ attachmentId: string }>;
        nextCursor: string | null;
        complete: boolean;
      };
      seen.push(
        ...page.attachments.map((attachment) => attachment.attachmentId),
      );
      cursor = page.nextCursor;
      if (page.complete) break;
    }
    expect(new Set(seen)).toEqual(
      new Set([sourceAttachmentId, ...newAttachmentIds]),
    );
    expect(seen).toHaveLength(4);
  });

  it("rejects forged source pairs, stale reach, and deleted historical sources", async () => {
    const runner = authority();
    const stored = await storage.putFile({
      companyId,
      namespace: `issues/${issueId}`,
      originalFilename: "internal-only.txt",
      contentType: "text/plain",
      body: Buffer.from("internal only"),
    });
    const internalComment = await issueService(db).addComment(
      issueId,
      "Internal-only file",
      { userId: "internal-user" },
    );
    const internal = await issueService(db).createAttachment({
      issueId,
      issueCommentId: internalComment.id,
      provider: stored.provider,
      objectKey: stored.objectKey,
      contentType: stored.contentType,
      byteSize: stored.byteSize,
      sha256: stored.sha256,
      originalFilename: stored.originalFilename,
      createdByUserId: "internal-user",
    });
    await expect(
      runner.execute({
        tool: "reuse_chat_attachment",
        callId: "forged-pair",
        arguments: {
          idempotencyKey: "forged-pair",
          sourceCommentId,
          attachmentId: internal.id,
          title: "Must not escape",
        },
      }),
    ).rejects.toThrow("paperclip_runner_chat_attachment_source_denied");

    await db
      .update(issues)
      .set({ assigneeAgentId: null })
      .where(eq(issues.id, issueId));
    await expect(
      runner.execute({
        tool: "list_chat_attachments",
        callId: "reassigned-list",
        arguments: {},
      }),
    ).rejects.toThrow("paperclip_runner_tool_binding_not_authorized");
    await db
      .update(issues)
      .set({ assigneeAgentId: agentId })
      .where(eq(issues.id, issueId));

    await db
      .update(chatEndpoints)
      .set({ status: "paused" })
      .where(eq(chatEndpoints.id, endpointId));
    await expect(
      runner.execute({
        tool: "list_chat_attachments",
        callId: "paused-endpoint-list",
        arguments: {},
      }),
    ).rejects.toThrow("paperclip_runner_chat_attachment_binding_denied");
    await db
      .update(chatEndpoints)
      .set({ status: "active" })
      .where(eq(chatEndpoints.id, endpointId));

    await db
      .update(companyMemberships)
      .set({ status: "suspended" })
      .where(eq(companyMemberships.principalId, userId));
    await expect(
      runner.execute({
        tool: "reuse_chat_attachment",
        callId: "revoked-principal-replay",
        arguments: {
          idempotencyKey: "reuse-earlier-v1",
          sourceCommentId,
          attachmentId: sourceAttachmentId,
          title: "Earlier requested file",
        },
      }),
    ).rejects.toThrow("paperclip_runner_chat_attachment_principal_denied");
    await db
      .update(companyMemberships)
      .set({ status: "active" })
      .where(eq(companyMemberships.principalId, userId));

    await db
      .update(issues)
      .set({ workMode: "ask" })
      .where(eq(issues.id, issueId));
    await expect(
      runner.execute({
        tool: "reuse_chat_attachment",
        callId: "ask-mode-reuse",
        arguments: {
          idempotencyKey: "ask-mode-reuse",
          sourceCommentId,
          attachmentId: sourceAttachmentId,
          title: "Earlier requested file",
        },
      }),
    ).rejects.toThrow("paperclip_runner_tool_mode_denied");
    await db
      .update(issues)
      .set({ workMode: "standard" })
      .where(eq(issues.id, issueId));

    await db
      .update(chatEndpointResources)
      .set({ enabled: false })
      .where(eq(chatEndpointResources.id, resourceId));
    await expect(
      runner.execute({
        tool: "list_chat_attachments",
        callId: "disabled-reach",
        arguments: {},
      }),
    ).rejects.toThrow("paperclip_runner_chat_attachment_destination_denied");
    await db
      .update(chatEndpointResources)
      .set({ enabled: true })
      .where(eq(chatEndpointResources.id, resourceId));

    await db
      .update(issueComments)
      .set({ deletedAt: new Date() })
      .where(eq(issueComments.id, sourceCommentId));
    await expect(
      runner.execute({
        tool: "reuse_chat_attachment",
        callId: "deleted-source-replay",
        arguments: {
          idempotencyKey: "reuse-earlier-v1",
          sourceCommentId,
          attachmentId: sourceAttachmentId,
          title: "Earlier requested file",
        },
      }),
    ).rejects.toThrow("paperclip_runner_chat_attachment_source_denied");
    expect(
      await runner.execute({
        tool: "list_chat_attachments",
        callId: "deleted-source-list",
        arguments: { sourceCommentId },
      }),
    ).toEqual({ attachments: [], nextCursor: null, complete: true });

    await db
      .update(issueComments)
      .set({ deletedAt: null })
      .where(eq(issueComments.id, sourceCommentId));
    await db.insert(chatDeliveries).values({
      companyId,
      endpointId,
      conversationId,
      principalId,
      providerEventId: "source-edit-event",
      deduplicationKey: "source-edit-event",
      eventKind: "message_updated",
      normalizedEvent: {
        message: { targetProviderEventId: "source-event" },
      },
      state: "processed",
      attempts: 1,
      processedAt: new Date(),
    });
    await expect(
      runner.execute({
        tool: "reuse_chat_attachment",
        callId: "edited-source-replay",
        arguments: {
          idempotencyKey: "reuse-earlier-v1",
          sourceCommentId,
          attachmentId: sourceAttachmentId,
          title: "Earlier requested file",
        },
      }),
    ).rejects.toThrow("paperclip_runner_chat_attachment_source_denied");
  });
});
