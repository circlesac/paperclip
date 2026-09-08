import { randomUUID } from "node:crypto";

import { and, eq } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import {
  agentWakeupRequests,
  agents,
  approvals,
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
  completionContracts,
  createDb,
  heartbeatRuns,
  issueComments,
  issueApprovals,
  issueThreadInteractions,
  issues,
  nativeRunFinalizations,
  nativeRunResults,
  statusDecisions,
  toolApplications,
  toolConnections,
  workspaceOperations,
} from "@paperclipai/db";
import type {
  PrpStructuredRunResult,
  PrpTerminalState,
} from "../../vendor/paperclip-runner/index.js";

import { startEmbeddedPostgresTestDatabase } from "../../__tests__/helpers/embedded-postgres.js";
import { finalizeNativeRun } from "./native-run-finalizer.js";
import { PaperclipControlPlanePort } from "./paperclip-control-plane-port.js";
import {
  authorizeNativeChatReviewPresentation,
  hasMaterializedNativeReviewResponse,
} from "./native-chat-review-presentation.js";
import { resolveChatRunPresentationAuthorizationReason } from "../chat-run-publications.js";
import { resolveHeartbeatRunResponse } from "../heartbeat-run-summary.js";
import { issueService } from "../issues.js";
import { reconcileNativeFinalizations } from "./native-finalization-reconciler.js";
import { isExternalChatWaitAuthorizationContention } from "./chat-attachment-reuse.js";

describe("native external-chat response wait", () => {
  let temporary: Awaited<
    ReturnType<typeof startEmbeddedPostgresTestDatabase>
  > | null = null;
  let db: ReturnType<typeof createDb>;

  beforeAll(async () => {
    temporary = await startEmbeddedPostgresTestDatabase(
      "native-external-chat-wait-",
    );
    db = createDb(temporary.connectionString);
  }, 30_000);

  afterAll(async () => {
    await temporary?.cleanup();
  });

  async function seedWaitTurn(
    provider: "telegram" | "discord" = "telegram",
    attentionRequests: PrpStructuredRunResult["attentionRequests"] = [],
  ) {
    const companyId = randomUUID();
    const agentId = randomUUID();
    const issueId = randomUUID();
    const runId = randomUUID();
    const sessionId = randomUUID();
    const runnerInstanceId = randomUUID();
    const contractId = randomUUID();
    const endpointId = randomUUID();
    const resourceId = randomUUID();
    const conversationId = randomUUID();
    const principalId = randomUUID();
    const commentId = randomUUID();
    const deliveryId = randomUUID();
    const userId = `wait-user-${randomUUID()}`;
    const applicationId = randomUUID();
    const connectionId = randomUUID();
    const contractSha256 = `external-chat-wait-${randomUUID()}`;
    const issuePrefix = `W${randomUUID().replaceAll("-", "").slice(0, 5).toUpperCase()}`;

    await db.insert(companies).values({
      id: companyId,
      name: "External chat wait",
      issuePrefix,
      issueCounter: 1,
    });
    await db.insert(agents).values({
      id: agentId,
      companyId,
      name: "Waiting chat agent",
      adapterType: "paperclip_runner",
      adapterConfig: { provider: "codex" },
      runtimeConfig: {},
      status: "active",
    });
    await db.insert(issues).values({
      id: issueId,
      companyId,
      issueNumber: 1,
      identifier: `${issuePrefix}-1`,
      title: "Send the photo and wait",
      status: "in_progress",
      workMode: "standard",
      assigneeAgentId: agentId,
    });
    await db.insert(completionContracts).values({
      id: contractId,
      companyId,
      issueId,
      revision: 1,
      schemaVersion: "paperclip.completion-contract.v1",
      policyVersion: "phase6-v3",
      risk: "low",
      completionAuthority: "agent_claim_policy",
      incompleteCriteriaPolicy: "preserve_non_terminal",
      contractJson: {
        revision: "external-chat-wait-v1",
        objective: "Send the requested photo and wait for the next message",
        criteria: [
          { id: "response", requirement: "Return the requested photo" },
        ],
      },
      canonicalSha256: contractSha256,
      createdByActorType: "system",
      createdByActorId: "test",
    });
    await db.insert(heartbeatRuns).values({
      id: runId,
      companyId,
      agentId,
      status: "running",
      runtimeMode: "native",
      nativeIssueId: issueId,
      nativeSessionId: sessionId,
      runnerInstanceId,
      completionContractId: contractId,
      completionContractSha256: contractSha256,
      contextSnapshot: {},
    });
    await db
      .update(issues)
      .set({ executionRunId: runId })
      .where(eq(issues.id, issueId));
    await db.insert(toolApplications).values({
      id: applicationId,
      companyId,
      applicationKey: `chat:telegram:${endpointId}`,
      name: "Telegram wait",
      type: "chat",
      status: "active",
    });
    await db.insert(toolConnections).values({
      id: connectionId,
      companyId,
      applicationId,
      name: "Telegram wait",
      uid: `chat-telegram-${endpointId}`,
      connectionPurpose: "channel",
      transport: "chat_sdk",
      status: "active",
      enabled: true,
    });
    await db.insert(chatEndpoints).values({
      id: endpointId,
      companyId,
      connectionId,
      provider,
      publicId: randomUUID(),
      assignedAgentId: agentId,
      status: "active",
      providerAccountId: "telegram-bot",
      allowDirectMessages: true,
      allowUnlinkedPeople: false,
    });
    await db.insert(chatEndpointResources).values({
      id: resourceId,
      companyId,
      endpointId,
      type: "direct_message",
      providerResourceId: "telegram-user",
      label: "Telegram direct message",
      availability: "available",
      enabled: true,
    });
    await db.insert(chatConversations).values({
      id: conversationId,
      companyId,
      endpointId,
      resourceId,
      issueId,
      externalConversationId: "telegram-user",
      externalThreadId: "telegram:telegram-user",
      sessionGeneration: 1,
      externalLabel: "Telegram direct message",
      isDirectMessage: true,
      state: "active",
    });
    await db.insert(chatExternalPrincipals).values({
      id: principalId,
      companyId,
      provider,
      providerAccountId: "telegram-bot",
      externalId: "telegram-user",
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
    await db.insert(issueComments).values({
      id: commentId,
      companyId,
      issueId,
      authorType: "user",
      authorUserId: userId,
      body: "Send the photo, keep this task in progress, and wait.",
    });
    await db.insert(chatDeliveries).values({
      id: deliveryId,
      companyId,
      endpointId,
      conversationId,
      principalId,
      providerEventId: "telegram-wait-message",
      deduplicationKey: "telegram-wait-message",
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
      commentId,
      providerMessageId: "telegram-user:1",
      direction: "inbound",
    });
    await db
      .update(heartbeatRuns)
      .set({
        contextSnapshot: {
          source: `chat:${provider}`,
          paperclipHarnessCheckedOut: true,
          issueId,
          wakeCommentId: commentId,
          wakeCommentIds: [commentId],
          paperclipWake: {
            reason: "External chat message received",
            externalChatProvider: provider,
            checkedOutByHarness: true,
            issue: { id: issueId, workMode: "standard" },
            commentIds: [commentId],
          },
        },
      })
      .where(eq(heartbeatRuns.id, runId));

    const port = new PaperclipControlPlanePort(db, {
      companyId,
      issueId,
      runId,
      agentId,
      sessionId,
      completionContractId: contractId,
      completionContractSha256: contractSha256,
      sourceInstanceId: runnerInstanceId,
      controlPlaneSourceInstanceId: `wait-control-${runId}`,
    });
    await port.openRun({
      identity: { companyId, issueId, runId, agentId, sessionId },
      backendKind: "mock",
      sourceInstanceId: runnerInstanceId,
    });
    const result: PrpStructuredRunResult = {
      schema: "paperclip.run_result.v1",
      reportedWorkDisposition: "yielded",
      summary:
        "The requested photo is prepared. I will wait for your next message.",
      completionClaim: {
        contractRevision: "external-chat-wait-v1",
        objectiveSatisfied: true,
        criteria: [
          {
            criterionId: "response",
            status: "satisfied",
            evidenceRefs: [],
          },
        ],
        remainingWork: [],
      },
      evidence: [],
      verification: [],
      attentionRequests,
      artifacts: [],
      continuation: {
        kind: "response_wake",
        summary: "Wait for the next authorized Telegram message.",
        idempotencyKey: `telegram-response-wait:${conversationId}`,
      },
    };
    const terminal: PrpTerminalState = {
      schema: "paperclip.prp.terminal.v1",
      turnTerminalState: "completed",
      runTerminalState: "succeeded",
      reportedWorkDisposition: "yielded",
      workAssessmentId: randomUUID(),
      statusDecisionId: randomUUID(),
    };
    await port.completeRun({
      result,
      terminal,
      callerResultId: `wait-result-${runId}`,
    });
    await db
      .update(heartbeatRuns)
      .set({
        status: "running",
        resultJson: {
          nativeResult: result as unknown as Record<string, unknown>,
        },
        updatedAt: new Date(),
      })
      .where(eq(heartbeatRuns.id, runId));

    return {
      agentId,
      companyId,
      conversationId,
      endpointId,
      issueId,
      runId,
      userId,
    };
  }

  async function seedPriorCompletionReview(
    fixture: Awaited<ReturnType<typeof seedWaitTurn>>,
  ) {
    const [current] = await db
      .select()
      .from(heartbeatRuns)
      .where(eq(heartbeatRuns.id, fixture.runId));
    const [accepted] = await db
      .select()
      .from(nativeRunResults)
      .where(eq(nativeRunResults.runId, fixture.runId));
    const runId = randomUUID();
    const sessionId = randomUUID();
    const runnerInstanceId = randomUUID();
    await db.insert(heartbeatRuns).values({
      id: runId,
      companyId: fixture.companyId,
      agentId: fixture.agentId,
      status: "running",
      runtimeMode: "native",
      nativeIssueId: fixture.issueId,
      nativeSessionId: sessionId,
      runnerInstanceId,
      completionContractId: current!.completionContractId,
      completionContractSha256: current!.completionContractSha256,
      contextSnapshot: {},
      createdAt: new Date(Date.now() - 60_000),
    });
    await db
      .update(issues)
      .set({ executionRunId: runId })
      .where(eq(issues.id, fixture.issueId));
    const port = new PaperclipControlPlanePort(db, {
      companyId: fixture.companyId,
      issueId: fixture.issueId,
      agentId: fixture.agentId,
      runId,
      sessionId,
      completionContractId: current!.completionContractId!,
      completionContractSha256: current!.completionContractSha256!,
      sourceInstanceId: runnerInstanceId,
      controlPlaneSourceInstanceId: `review-control-${runId}`,
    });
    await port.openRun({
      identity: {
        companyId: fixture.companyId,
        issueId: fixture.issueId,
        agentId: fixture.agentId,
        runId,
        sessionId,
      },
      backendKind: "mock",
      sourceInstanceId: runnerInstanceId,
    });
    const result = {
      ...(accepted!.resultJson.result as PrpStructuredRunResult),
      reportedWorkDisposition: "needs_review" as const,
    };
    delete result.continuation;
    result.attentionRequests = [];
    const terminal = {
      ...(accepted!.resultJson.terminal as PrpTerminalState),
      reportedWorkDisposition: "needs_review" as const,
    };
    await port.completeRun({
      result,
      terminal,
      callerResultId: `prior-review-${runId}`,
    });
    await finalizeNativeRun({
      db,
      runId,
      workspaceFinalizeStatus: "succeeded",
      projectRunStatus: true,
    });
    const [gate] = await db
      .select()
      .from(issueThreadInteractions)
      .where(eq(issueThreadInteractions.sourceRunId, runId));
    expect(gate).toMatchObject({
      kind: "request_confirmation",
      status: "pending",
      createdByAgentId: null,
      createdByUserId: null,
    });
    await db
      .update(issues)
      .set({ executionRunId: fixture.runId })
      .where(eq(issues.id, fixture.issueId));
    await db
      .update(heartbeatRuns)
      .set({ startedAt: new Date(gate!.createdAt.getTime() + 1) })
      .where(eq(heartbeatRuns.id, fixture.runId));
    return gate!;
  }

  async function finishReviewResponse(
    fixture: Awaited<ReturnType<typeof seedWaitTurn>>,
  ) {
    await finalizeNativeRun({
      db,
      runId: fixture.runId,
      workspaceFinalizeStatus: "succeeded",
      projectRunStatus: true,
    });
    const [run] = await db
      .select()
      .from(heartbeatRuns)
      .where(eq(heartbeatRuns.id, fixture.runId));
    return run!.resultJson!;
  }

  it.each(["telegram", "discord"] as const)(
    "presents the exact %s response without resolving a pre-existing native completion review",
    async (provider) => {
      const fixture = await seedWaitTurn(provider);
      const gate = await seedPriorCompletionReview(fixture);
      const selectedComment = await issueService(db).addComment(
        fixture.issueId,
        "Prepared exactly these files for this chat response.",
        { agentId: fixture.agentId, runId: fixture.runId },
        { authorizationReason: "paperclip_runner_protocol" },
      );
      const selected = [];
      for (const [originalFilename, contentType] of [
        ["original-cat.png", "image/png"],
        ["original-notes.txt", "text/plain"],
      ]) {
        selected.push(
          await issueService(db).createAttachment({
            issueId: fixture.issueId,
            issueCommentId: selectedComment.id,
            provider: "local_disk",
            objectKey: `issues/${fixture.issueId}/${originalFilename}`,
            contentType: contentType!,
            byteSize: 128,
            sha256: "a".repeat(64),
            originalFilename,
            createdByAgentId: fixture.agentId,
            createdByRunId: fixture.runId,
          }),
        );
      }
      expect(
        await db
          .select()
          .from(chatPublications)
          .where(eq(chatPublications.issueId, fixture.issueId)),
      ).toEqual([]);
      const resultJson = await finishReviewResponse(fixture);
      expect(resultJson).toMatchObject({
        finalizationPhase: "committed",
        finalizationReasonCode: "governed_response_waiting",
        externalChatReviewPresentation: {
          runId: fixture.runId,
          gateId: gate.id,
          gateDecisionId: (gate.payload as { target: { revisionId: string } })
            .target.revisionId,
        },
      });
      expect(
        await authorizeNativeChatReviewPresentation(db, {
          ...fixture,
          resultJson,
        }),
      ).toBe(true);
      expect(
        await resolveChatRunPresentationAuthorizationReason(db, fixture),
      ).toBe("allow_chat_run_presentation");
      const response = resolveHeartbeatRunResponse({
        resultJson,
        preferFinalResponseOverExistingComment: true,
        externalChatResponseWakeSummaryAuthorized: true,
        externalChatReviewResponseSummaryAuthorized: true,
      });
      expect(response.text).toBe(
        "The requested photo is prepared. I will wait for your next message.",
      );
      const first = await issueService(db).addComment(
        fixture.issueId,
        response.text!,
        { agentId: fixture.agentId, runId: fixture.runId },
        { authorizationReason: "allow_chat_run_presentation" },
      );
      const second = await issueService(db).addComment(
        fixture.issueId,
        response.text!,
        { agentId: fixture.agentId, runId: fixture.runId },
        { authorizationReason: "allow_chat_run_presentation" },
      );
      expect(second.id).toBe(first.id);
      const publications = await db
        .select()
        .from(chatPublications)
        .where(eq(chatPublications.issueId, fixture.issueId));
      expect(publications).toHaveLength(3);
      expect(publications).toEqual(
        expect.arrayContaining(
          selected.map((attachment) =>
            expect.objectContaining({
              commentId: selectedComment.id,
              state: "pending",
              idempotencyKey: `attachment:${attachment.id}:${fixture.endpointId}`,
              payload: expect.objectContaining({
                attachmentIds: [attachment.id],
              }),
            }),
          ),
        ),
      );
      await expect(
        issueService(db).addComment(
          fixture.issueId,
          "Not the accepted summary",
          { agentId: fixture.agentId, runId: fixture.runId },
          { authorizationReason: "allow_chat_run_presentation" },
        ),
      ).rejects.toMatchObject({
        status: 409,
        details: { code: "chat_review_response_presentation_denied" },
      });
      expect(
        await db
          .select()
          .from(issueThreadInteractions)
          .where(eq(issueThreadInteractions.id, gate.id)),
      ).toEqual([
        expect.objectContaining({ status: "pending", resolvedAt: null }),
      ]);
      expect(
        await db.select().from(issues).where(eq(issues.id, fixture.issueId)),
      ).toEqual([expect.objectContaining({ status: "in_review" })]);
      expect(
        await db
          .select()
          .from(agentWakeupRequests)
          .where(eq(agentWakeupRequests.companyId, fixture.companyId)),
      ).toEqual([]);
    },
  );

  it.each([
    "approval",
    "agent_gate",
    "new_attention",
    "semantic_attention",
    "revoked_endpoint",
  ] as const)(
    "does not mint a review-presentation grant for %s",
    async (kind) => {
      const fixture = await seedWaitTurn(
        "telegram",
        kind === "semantic_attention"
          ? [
              {
                kind: "approval",
                summary: "Approve a separate action",
                ownerClass: "human",
              },
            ]
          : [],
      );
      const gate = await seedPriorCompletionReview(fixture);
      if (kind === "approval") {
        const [approval] = await db
          .insert(approvals)
          .values({
            companyId: fixture.companyId,
            type: "hire_agent",
            status: "pending",
            payload: {},
          })
          .returning();
        await db.insert(issueApprovals).values({
          companyId: fixture.companyId,
          issueId: fixture.issueId,
          approvalId: approval!.id,
        });
      } else if (kind === "agent_gate") {
        await db
          .update(issueThreadInteractions)
          .set({ createdByAgentId: fixture.agentId })
          .where(eq(issueThreadInteractions.id, gate.id));
      } else if (kind === "new_attention") {
        await db.insert(issueThreadInteractions).values({
          companyId: fixture.companyId,
          issueId: fixture.issueId,
          kind: "request_confirmation",
          status: "pending",
          sourceRunId: fixture.runId,
          createdByAgentId: fixture.agentId,
          title: "Current confirmation",
          payload: gate.payload,
        });
      } else if (kind === "revoked_endpoint") {
        await db
          .update(chatEndpoints)
          .set({ status: "paused" })
          .where(eq(chatEndpoints.id, fixture.endpointId));
      }
      const resultJson = await finishReviewResponse(fixture);
      expect(resultJson.externalChatReviewPresentation).toBeNull();
      expect(
        await authorizeNativeChatReviewPresentation(db, {
          ...fixture,
          resultJson,
        }),
      ).toBe(false);
      expect(
        await resolveChatRunPresentationAuthorizationReason(db, fixture),
      ).toBe("internal_agent_write");
      expect(
        await db
          .select()
          .from(issueThreadInteractions)
          .where(eq(issueThreadInteractions.id, gate.id)),
      ).toEqual([expect.objectContaining({ status: "pending" })]);
    },
  );

  it.each([
    "gate_changed",
    "gate_policy_changed",
    "failed_run",
    "status_changed",
    "revoked_endpoint",
    "revoked_principal",
    "spoofed_marker",
    "changed_summary",
    "changed_context",
    "wrong_destination",
  ] as const)(
    "rejects a stale or forged committed response grant: %s",
    async (kind) => {
      const fixture = await seedWaitTurn();
      const gate = await seedPriorCompletionReview(fixture);
      const resultJson = await finishReviewResponse(fixture);
      expect(
        await authorizeNativeChatReviewPresentation(db, {
          ...fixture,
          resultJson,
        }),
      ).toBe(true);
      if (kind === "gate_changed")
        await db
          .update(issueThreadInteractions)
          .set({ status: "accepted" })
          .where(eq(issueThreadInteractions.id, gate.id));
      if (kind === "status_changed")
        await db
          .update(issues)
          .set({ status: "cancelled" })
          .where(eq(issues.id, fixture.issueId));
      if (kind === "gate_policy_changed")
        await db
          .update(issueThreadInteractions)
          .set({ effectiveResolverPolicy: "anyone" })
          .where(eq(issueThreadInteractions.id, gate.id));
      if (kind === "failed_run")
        await db
          .update(heartbeatRuns)
          .set({ status: "failed" })
          .where(eq(heartbeatRuns.id, fixture.runId));
      if (kind === "revoked_endpoint")
        await db
          .update(chatEndpoints)
          .set({ status: "paused" })
          .where(eq(chatEndpoints.id, fixture.endpointId));
      if (kind === "revoked_principal")
        await db
          .update(companyMemberships)
          .set({ status: "suspended" })
          .where(eq(companyMemberships.principalId, fixture.userId));
      if (kind === "spoofed_marker")
        resultJson.externalChatReviewPresentation = {
          ...(resultJson.externalChatReviewPresentation as object),
          gateId: randomUUID(),
        };
      if (kind === "changed_summary")
        resultJson.nativeResult = {
          ...(resultJson.nativeResult as object),
          summary: "Unapproved replacement prose",
        };
      if (kind === "changed_context")
        await db
          .update(heartbeatRuns)
          .set({ contextSnapshot: { source: "chat:github" } })
          .where(eq(heartbeatRuns.id, fixture.runId));
      expect(
        await authorizeNativeChatReviewPresentation(db, {
          ...fixture,
          resultJson,
          ...(kind === "wrong_destination"
            ? {
                destination: {
                  endpointId: fixture.endpointId,
                  conversationId: randomUUID(),
                },
              }
            : {}),
        }),
      ).toBe(false);
      if (
        [
          "gate_changed",
          "gate_policy_changed",
          "failed_run",
          "status_changed",
          "revoked_endpoint",
          "revoked_principal",
          "changed_context",
        ].includes(kind)
      ) {
        await expect(
          issueService(db).addComment(
            fixture.issueId,
            "Must remain private",
            { agentId: fixture.agentId, runId: fixture.runId },
            { authorizationReason: "allow_chat_run_presentation" },
          ),
        ).rejects.toMatchObject({
          status: 409,
          details: { code: "chat_review_response_presentation_denied" },
        });
      }
    },
  );

  it("retries a contended review-response comment outside issue and governance locks", async () => {
    const fixture = await seedWaitTurn();
    await seedPriorCompletionReview(fixture);
    const resultJson = await finishReviewResponse(fixture);
    let release!: () => void;
    let locked!: () => void;
    const lockObserved = new Promise<void>((resolve) => {
      locked = resolve;
    });
    const lockRelease = new Promise<void>((resolve) => {
      release = resolve;
    });
    const holding = db.transaction(async (tx) => {
      await tx
        .select()
        .from(chatEndpoints)
        .where(eq(chatEndpoints.id, fixture.endpointId))
        .for("update");
      locked();
      await lockRelease;
    });
    await lockObserved;
    let finished = false;
    const append = issueService(db)
      .addComment(
        fixture.issueId,
        (resultJson.nativeResult as { summary: string }).summary,
        { agentId: fixture.agentId, runId: fixture.runId },
        { authorizationReason: "allow_chat_run_presentation" },
      )
      .finally(() => {
        finished = true;
      });
    try {
      await new Promise((resolve) => setTimeout(resolve, 50));
      expect(finished).toBe(false);
      await db.transaction(async (tx) => {
        await tx
          .select()
          .from(issues)
          .where(eq(issues.id, fixture.issueId))
          .for("update", { noWait: true });
      });
    } finally {
      release();
      await holding;
    }
    const comment = await append;
    expect(
      await db
        .select()
        .from(chatPublications)
        .where(eq(chatPublications.commentId, comment.id)),
    ).toHaveLength(1);
  });

  it("keeps earlier queued response files authorized after another wait retains the same review", async () => {
    const fixture = await seedWaitTurn();
    await seedPriorCompletionReview(fixture);
    const resultJson = await finishReviewResponse(fixture);
    const [current] = await db
      .select()
      .from(heartbeatRuns)
      .where(eq(heartbeatRuns.id, fixture.runId));
    const [accepted] = await db
      .select()
      .from(nativeRunResults)
      .where(eq(nativeRunResults.runId, fixture.runId));
    const runId = randomUUID();
    const sessionId = randomUUID();
    const runnerInstanceId = randomUUID();
    await db.insert(heartbeatRuns).values({
      id: runId,
      companyId: fixture.companyId,
      agentId: fixture.agentId,
      runtimeMode: "native",
      nativeIssueId: fixture.issueId,
      nativeSessionId: sessionId,
      runnerInstanceId,
      status: "running",
      completionContractId: current!.completionContractId,
      completionContractSha256: current!.completionContractSha256,
      contextSnapshot: current!.contextSnapshot,
      resultJson: { nativeResult: accepted!.resultJson.result },
      startedAt: new Date(),
    });
    await db
      .update(issues)
      .set({ executionRunId: runId })
      .where(eq(issues.id, fixture.issueId));
    const port = new PaperclipControlPlanePort(db, {
      companyId: fixture.companyId,
      issueId: fixture.issueId,
      agentId: fixture.agentId,
      runId,
      sessionId,
      completionContractId: current!.completionContractId!,
      completionContractSha256: current!.completionContractSha256!,
      sourceInstanceId: runnerInstanceId,
      controlPlaneSourceInstanceId: `later-control-${runId}`,
    });
    await port.openRun({
      identity: {
        companyId: fixture.companyId,
        issueId: fixture.issueId,
        agentId: fixture.agentId,
        runId,
        sessionId,
      },
      backendKind: "mock",
      sourceInstanceId: runnerInstanceId,
    });
    await port.completeRun({
      result: accepted!.resultJson.result as PrpStructuredRunResult,
      terminal: accepted!.resultJson.terminal as PrpTerminalState,
    });
    const laterResult = await finishReviewResponse({ ...fixture, runId });
    expect(laterResult.externalChatReviewPresentation).toBeTruthy();
    expect(
      await authorizeNativeChatReviewPresentation(
        db,
        {
          ...fixture,
          resultJson,
          destination: {
            endpointId: fixture.endpointId,
            conversationId: fixture.conversationId,
          },
        },
        "read",
      ),
    ).toBe(true);
    const [firstComment] = await db
      .select()
      .from(issueComments)
      .where(
        and(
          eq(issueComments.createdByRunId, fixture.runId),
          eq(issueComments.authorType, "agent"),
        ),
      );
    await db
      .delete(chatPublications)
      .where(eq(chatPublications.commentId, firstComment!.id));
    await db
      .delete(issueComments)
      .where(eq(issueComments.id, firstComment!.id));
    await db
      .update(heartbeatRuns)
      .set({ resultJson: { keepUnrelatedMetadata: "yes" } })
      .where(eq(heartbeatRuns.id, fixture.runId));
    await reconcileNativeFinalizations(db, [fixture.runId]);
    await reconcileNativeFinalizations(db, [fixture.runId]);
    const [repaired] = await db
      .select()
      .from(heartbeatRuns)
      .where(eq(heartbeatRuns.id, fixture.runId));
    expect(repaired!.resultJson).toMatchObject({
      keepUnrelatedMetadata: "yes",
      externalChatReviewPresentation: resultJson.externalChatReviewPresentation,
    });
    const comments = await db
      .select()
      .from(issueComments)
      .where(
        and(
          eq(issueComments.createdByRunId, fixture.runId),
          eq(issueComments.authorType, "agent"),
        ),
      );
    expect(comments).toHaveLength(1);
    expect(
      await db
        .select()
        .from(chatPublications)
        .where(eq(chatPublications.commentId, comments[0]!.id)),
    ).toHaveLength(1);
    expect(
      await hasMaterializedNativeReviewResponse(db, {
        ...fixture,
        decisionId: String(resultJson.decisionId),
      }),
    ).toBe(true);
    expect(
      await hasMaterializedNativeReviewResponse(db, {
        ...fixture,
        decisionId: randomUUID(),
      }),
    ).toBe(false);
    const updatedAt = repaired!.updatedAt;
    await db
      .update(issueComments)
      .set({ deletedAt: new Date() })
      .where(eq(issueComments.id, comments[0]!.id));
    await reconcileNativeFinalizations(db, [fixture.runId]);
    const [unchanged] = await db
      .select()
      .from(heartbeatRuns)
      .where(eq(heartbeatRuns.id, fixture.runId));
    expect(unchanged!.updatedAt).toEqual(updatedAt);
    expect(
      await db
        .select()
        .from(issueComments)
        .where(eq(issueComments.createdByRunId, fixture.runId)),
    ).toEqual([
      expect.objectContaining({
        id: comments[0]!.id,
        deletedAt: expect.any(Date),
      }),
    ]);
  });

  it.each(["running", "succeeded", "gate_changed", "ownership_held"] as const)(
    "repairs the committed presentation crash boundary exactly once: %s",
    async (state) => {
      const fixture = await seedWaitTurn();
      const gate = await seedPriorCompletionReview(fixture);
      const selectedComment = await issueService(db).addComment(
        fixture.issueId,
        "Prepared the original file",
        { agentId: fixture.agentId, runId: fixture.runId },
        { authorizationReason: "paperclip_runner_protocol" },
      );
      const attachment = await issueService(db).createAttachment({
        issueId: fixture.issueId,
        issueCommentId: selectedComment.id,
        provider: "local_disk",
        objectKey: `issues/${fixture.issueId}/original.txt`,
        contentType: "text/plain",
        byteSize: 128,
        sha256: "b".repeat(64),
        originalFilename: "original.txt",
        createdByAgentId: fixture.agentId,
        createdByRunId: fixture.runId,
      });
      // Live finalization commits the grant while heartbeat still owns terminal
      // status/presentation. Simulate its process dying before those later steps.
      await finalizeNativeRun({
        db,
        runId: fixture.runId,
        workspaceFinalizeStatus: "succeeded",
        projectRunStatus: false,
      });
      const [committed] = await db
        .select()
        .from(heartbeatRuns)
        .where(eq(heartbeatRuns.id, fixture.runId));
      expect(
        committed!.resultJson?.externalChatReviewPresentation,
      ).toBeTruthy();
      const marker = committed!.resultJson!.externalChatReviewPresentation;
      await db
        .update(heartbeatRuns)
        .set({
          status:
            state === "succeeded" || state === "gate_changed"
              ? "succeeded"
              : "running",
          resultJson: { keepUnrelatedMetadata: "yes" },
          ...(state === "ownership_held"
            ? {
                nativePhase: "terminal_failure",
                errorCode: "native_execution_ownership_unverified",
              }
            : {}),
        })
        .where(eq(heartbeatRuns.id, fixture.runId));
      if (state === "gate_changed")
        await db
          .update(issueThreadInteractions)
          .set({ status: "accepted" })
          .where(eq(issueThreadInteractions.id, gate.id));
      await finalizeNativeRun({
        db,
        runId: fixture.runId,
        workspaceFinalizeStatus: "succeeded",
        projectRunStatus: true,
      });
      await finalizeNativeRun({
        db,
        runId: fixture.runId,
        workspaceFinalizeStatus: "succeeded",
        projectRunStatus: true,
      });
      const [repaired] = await db
        .select()
        .from(heartbeatRuns)
        .where(eq(heartbeatRuns.id, fixture.runId));
      expect(repaired!.resultJson?.keepUnrelatedMetadata).toBe("yes");
      if (state === "ownership_held") {
        expect(repaired).toMatchObject({
          status: "running",
          nativePhase: "terminal_failure",
          errorCode: "native_execution_ownership_unverified",
        });
      } else {
        expect(repaired!.resultJson?.externalChatReviewPresentation).toEqual(
          marker,
        );
        expect(repaired!.status).toBe("succeeded");
      }
      const publications = await db
        .select()
        .from(chatPublications)
        .where(eq(chatPublications.issueId, fixture.issueId));
      if (state === "gate_changed" || state === "ownership_held")
        expect(publications).toEqual([]);
      else {
        expect(publications).toHaveLength(2);
        expect(publications).toEqual(
          expect.arrayContaining([
            expect.objectContaining({
              idempotencyKey: `attachment:${attachment.id}:${fixture.endpointId}`,
            }),
          ]),
        );
      }
      expect(
        await db
          .select()
          .from(statusDecisions)
          .where(eq(statusDecisions.issueId, fixture.issueId)),
      ).toHaveLength(2);
      expect(
        await db
          .select()
          .from(issueThreadInteractions)
          .where(eq(issueThreadInteractions.issueId, fixture.issueId)),
      ).toHaveLength(1);
      expect(
        await db
          .select()
          .from(agentWakeupRequests)
          .where(eq(agentWakeupRequests.companyId, fixture.companyId)),
      ).toEqual([]);
    },
  );

  it("does not overwrite an ownership hold racing the committed replay projection", async () => {
    const fixture = await seedWaitTurn();
    await seedPriorCompletionReview(fixture);
    await finalizeNativeRun({
      db,
      runId: fixture.runId,
      workspaceFinalizeStatus: "succeeded",
      projectRunStatus: false,
    });
    // Arrange the retained execution lock explicitly: the earlier review
    // status projection is allowed to have released the normal run lock.
    await db
      .update(issues)
      .set({ executionRunId: fixture.runId })
      .where(eq(issues.id, fixture.issueId));
    let locked!: () => void;
    let release!: () => void;
    const lockObserved = new Promise<void>((resolve) => {
      locked = resolve;
    });
    const lockRelease = new Promise<void>((resolve) => {
      release = resolve;
    });
    const holder = db.transaction(async (tx) => {
      await tx
        .select()
        .from(heartbeatRuns)
        .where(eq(heartbeatRuns.id, fixture.runId))
        .for("update");
      locked();
      await lockRelease;
      await tx
        .update(heartbeatRuns)
        .set({
          status: "running",
          nativePhase: "terminal_failure",
          errorCode: "native_execution_ownership_unverified",
        })
        .where(eq(heartbeatRuns.id, fixture.runId));
    });
    await lockObserved;
    const replay = finalizeNativeRun({
      db,
      runId: fixture.runId,
      workspaceFinalizeStatus: "succeeded",
      projectRunStatus: true,
    });
    try {
      await vi.waitFor(
        async () => {
          let coordinatorOwned = false;
          try {
            await db.transaction((tx) =>
              tx
                .select()
                .from(nativeRunFinalizations)
                .where(eq(nativeRunFinalizations.runId, fixture.runId))
                .for("update", { noWait: true }),
            );
          } catch (error) {
            coordinatorOwned = isExternalChatWaitAuthorizationContention(error);
          }
          expect(coordinatorOwned).toBe(true);
        },
        { interval: 5, timeout: 1_000 },
      );
    } finally {
      release();
      await holder;
    }
    await replay;
    const [run] = await db
      .select()
      .from(heartbeatRuns)
      .where(eq(heartbeatRuns.id, fixture.runId));
    expect(run).toMatchObject({
      status: "running",
      nativePhase: "terminal_failure",
      errorCode: "native_execution_ownership_unverified",
    });
    const [issue] = await db
      .select()
      .from(issues)
      .where(eq(issues.id, fixture.issueId));
    expect(issue!.executionRunId).toBe(fixture.runId);
    expect(
      await db
        .select()
        .from(chatPublications)
        .where(eq(chatPublications.issueId, fixture.issueId)),
    ).toEqual([]);
  });

  it("keeps presentation authority when heartbeat appends only adapter runtime-service display metadata", async () => {
    const fixture = await seedWaitTurn();
    await seedPriorCompletionReview(fixture);
    const resultJson = await finishReviewResponse(fixture);
    const [run] = await db
      .select()
      .from(heartbeatRuns)
      .where(eq(heartbeatRuns.id, fixture.runId));
    const context = {
      ...run!.contextSnapshot,
      paperclipRuntimeServices: [
        { name: "preview", url: "http://127.0.0.1:9000" },
      ],
      paperclipRuntimePrimaryUrl: "http://127.0.0.1:9000",
    };
    await db
      .update(heartbeatRuns)
      .set({ contextSnapshot: context })
      .where(eq(heartbeatRuns.id, fixture.runId));
    expect(
      await authorizeNativeChatReviewPresentation(db, {
        ...fixture,
        resultJson,
      }),
    ).toBe(true);
    await db
      .update(heartbeatRuns)
      .set({ contextSnapshot: { ...context, wakeCommentIds: [randomUUID()] } })
      .where(eq(heartbeatRuns.id, fixture.runId));
    expect(
      await authorizeNativeChatReviewPresentation(db, {
        ...fixture,
        resultJson,
      }),
    ).toBe(false);
  });

  it("does not rewrite an already-materialized latest response during real reconciliation", async () => {
    const fixture = await seedWaitTurn();
    await seedPriorCompletionReview(fixture);
    await finishReviewResponse(fixture);
    await db
      .insert(workspaceOperations)
      .values({
        companyId: fixture.companyId,
        issueId: fixture.issueId,
        heartbeatRunId: fixture.runId,
        phase: "workspace_finalize",
        status: "succeeded",
        finishedAt: new Date(),
      });
    const [before] = await db
      .select()
      .from(heartbeatRuns)
      .where(eq(heartbeatRuns.id, fixture.runId));
    await reconcileNativeFinalizations(db, [fixture.runId]);
    await reconcileNativeFinalizations(db, [fixture.runId]);
    const [after] = await db
      .select()
      .from(heartbeatRuns)
      .where(eq(heartbeatRuns.id, fixture.runId));
    expect(after!.updatedAt).toEqual(before!.updatedAt);
    expect(after!.resultJson).toEqual(before!.resultJson);
    expect(
      await db
        .select()
        .from(chatPublications)
        .where(eq(chatPublications.issueId, fixture.issueId)),
    ).toHaveLength(1);
  });

  it("parks a verified external-chat response wait without scheduling work", async () => {
    const fixture = await seedWaitTurn();
    await finalizeNativeRun({
      db,
      runId: fixture.runId,
      workspaceFinalizeStatus: "succeeded",
      projectRunStatus: true,
    });

    await expect(
      db.select().from(issues).where(eq(issues.id, fixture.issueId)),
    ).resolves.toEqual([
      expect.objectContaining({ status: "in_progress", statusVersion: 1 }),
    ]);
    await expect(
      db
        .select()
        .from(statusDecisions)
        .where(eq(statusDecisions.issueId, fixture.issueId)),
    ).resolves.toEqual([
      expect.objectContaining({
        toStatus: "in_progress",
        reasonCode: "external_chat_response_waiting",
        decisionJson: expect.objectContaining({ effects: [] }),
      }),
    ]);
    await expect(
      db
        .select()
        .from(agentWakeupRequests)
        .where(
          and(
            eq(agentWakeupRequests.companyId, fixture.companyId),
            eq(agentWakeupRequests.agentId, fixture.agentId),
          ),
        ),
    ).resolves.toEqual([]);
    await expect(
      db
        .select()
        .from(chatConversations)
        .where(eq(chatConversations.id, fixture.conversationId)),
    ).resolves.toEqual([
      expect.objectContaining({
        issueId: fixture.issueId,
        sessionGeneration: 1,
        state: "active",
      }),
    ]);
  });

  it("does not schedule a fallback run when current chat permission is revoked", async () => {
    const fixture = await seedWaitTurn();
    await db
      .update(companyMemberships)
      .set({ status: "suspended", updatedAt: new Date() })
      .where(eq(companyMemberships.principalId, fixture.userId));
    await finalizeNativeRun({
      db,
      runId: fixture.runId,
      workspaceFinalizeStatus: "succeeded",
      projectRunStatus: true,
    });

    await expect(
      db
        .select()
        .from(statusDecisions)
        .where(eq(statusDecisions.issueId, fixture.issueId)),
    ).resolves.toEqual([
      expect.objectContaining({
        reasonCode: "external_chat_response_wait_authorization_lost",
        decisionJson: expect.objectContaining({ effects: [] }),
      }),
    ]);
    await expect(
      db
        .select()
        .from(agentWakeupRequests)
        .where(
          and(
            eq(agentWakeupRequests.companyId, fixture.companyId),
            eq(agentWakeupRequests.agentId, fixture.agentId),
          ),
        ),
    ).resolves.toEqual([]);
  });

  it("retries a contended endpoint proof without deadlocking or scheduling work", async () => {
    const fixture = await seedWaitTurn();
    let releaseEndpoint!: () => void;
    let endpointLocked!: () => void;
    const endpointRelease = new Promise<void>((resolve) => {
      releaseEndpoint = resolve;
    });
    const endpointLockObserved = new Promise<void>((resolve) => {
      endpointLocked = resolve;
    });
    const endpointHolder = db.transaction(async (tx) => {
      await tx
        .select({ id: chatEndpoints.id })
        .from(chatEndpoints)
        .where(eq(chatEndpoints.id, fixture.endpointId))
        .for("update");
      endpointLocked();
      await endpointRelease;
    });
    await endpointLockObserved;

    const finalization = finalizeNativeRun({
      db,
      runId: fixture.runId,
      workspaceFinalizeStatus: "succeeded",
      projectRunStatus: true,
    });
    let contentionAssertionError: unknown = null;
    try {
      let firstArbitrationUpdatedAt = 0;
      await vi.waitFor(
        async () => {
          const [coordinator] = await db
            .select({
              assessmentId: nativeRunFinalizations.assessmentId,
              phase: nativeRunFinalizations.phase,
              updatedAt: nativeRunFinalizations.updatedAt,
            })
            .from(nativeRunFinalizations)
            .where(eq(nativeRunFinalizations.runId, fixture.runId));
          expect(coordinator).toEqual(
            expect.objectContaining({
              assessmentId: expect.any(String),
              phase: "arbitrating",
            }),
          );
          firstArbitrationUpdatedAt = coordinator!.updatedAt.getTime();
        },
        { timeout: 1_000, interval: 5 },
      );
      await vi.waitFor(
        async () => {
          const [coordinator] = await db
            .select({ updatedAt: nativeRunFinalizations.updatedAt })
            .from(nativeRunFinalizations)
            .where(eq(nativeRunFinalizations.runId, fixture.runId));
          expect(coordinator!.updatedAt.getTime()).toBeGreaterThan(
            firstArbitrationUpdatedAt,
          );
        },
        { timeout: 1_000, interval: 5 },
      );
    } catch (error) {
      contentionAssertionError = error;
    } finally {
      releaseEndpoint();
    }
    await endpointHolder;
    if (contentionAssertionError) throw contentionAssertionError;
    await finalization;

    await expect(
      db
        .select()
        .from(statusDecisions)
        .where(eq(statusDecisions.issueId, fixture.issueId)),
    ).resolves.toEqual([
      expect.objectContaining({
        reasonCode: "external_chat_response_waiting",
        decisionJson: expect.objectContaining({ effects: [] }),
      }),
    ]);
    await expect(
      db
        .select()
        .from(agentWakeupRequests)
        .where(
          and(
            eq(agentWakeupRequests.companyId, fixture.companyId),
            eq(agentWakeupRequests.agentId, fixture.agentId),
          ),
        ),
    ).resolves.toEqual([]);
  });
});
