import { randomUUID } from "node:crypto";

import { and, eq, sql } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import {
  agentWakeupRequests,
  agents,
  approvals,
  chatActions,
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
  issueQuestionResponseDeliveries,
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
import { authorizeChatConversationForBoundRun, isExternalChatWaitAuthorizationContention } from "./chat-attachment-reuse.js";
import { attestReviewedExternalChatRun, buildPaperclipWakePayload } from "../heartbeat.js";
import { questionResponseDeliveryValues } from "../question-response-delivery.js";
import { resolveExternalChatQuestionResponse } from "./external-chat-question-response.js";
import { materializeExternalChatQuestionResponseInput } from "./external-chat-question-response-input.js";
import * as nativeInteractionBridge from "./native-interaction-bridge.js";
import type { AskUserQuestionsInteraction } from "@paperclipai/shared";

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
      commentId,
      principalId,
    };
  }

  async function seedAnsweredChatTurn(
    provider: "telegram" | "discord" = "telegram",
    target?: { fixture: Awaited<ReturnType<typeof seedWaitTurn>>; gate: Awaited<ReturnType<typeof seedPriorCompletionReview>> },
  ) {
    const fixture = target?.fixture ?? await seedWaitTurn(provider);
    const gate = target?.gate ?? await seedPriorCompletionReview(fixture);
    const [current] = await db
      .select()
      .from(heartbeatRuns)
      .where(eq(heartbeatRuns.id, fixture.runId));
    const sourceRunId = randomUUID();
    const interactionId = randomUUID();
    const wakeId = randomUUID();
    const publicationId = randomUUID();
    const actionId = randomUUID();
    await db.insert(heartbeatRuns).values({
      id: sourceRunId,
      companyId: fixture.companyId,
      agentId: fixture.agentId,
      status: "succeeded",
      runtimeMode: "native",
      nativeIssueId: fixture.issueId,
      contextSnapshot: current!.contextSnapshot,
    });
    const [interaction] = await db
      .insert(issueThreadInteractions)
      .values({
        id: interactionId,
        companyId: fixture.companyId,
        issueId: fixture.issueId,
        kind: "ask_user_questions",
        status: "answered",
        sourceRunId,
        createdByAgentId: fixture.agentId,
        resolvedByUserId: fixture.userId,
        resolvedAt: new Date(),
        idempotencyKey: `color-${interactionId}`,
        payload: {
          version: 1,
          questions: [
            {
              id: "color",
              prompt: "Choose a color",
              selectionMode: "single",
              required: true,
              allowOther: false,
              options: [
                { id: "cobalt", label: "Cobalt" },
                { id: "amber", label: "Amber" },
              ],
            },
          ],
        },
        result: {
          version: 1,
          answers: [{ questionId: "color", optionIds: ["cobalt"] }],
        },
      })
      .returning();
    const [responseDelivery] = await db
      .insert(issueQuestionResponseDeliveries)
      .values({
        ...questionResponseDeliveryValues(
          interaction! as unknown as AskUserQuestionsInteraction,
        ),
        status: "fallback_queued",
        deliveryMode: "wake_fallback",
        targetRunId: fixture.runId,
        attemptCount: 1,
        acknowledgedAt: new Date(),
      })
      .returning();
    await db.insert(chatPublications).values({
      id: publicationId,
      companyId: fixture.companyId,
      endpointId: fixture.endpointId,
      conversationId: fixture.conversationId,
      issueId: fixture.issueId,
      state: "published",
      idempotencyKey: `card-${interactionId}`,
      providerMessageId: "question-card",
      publishedAt: new Date(),
      payload: { interactionId } as never,
    });
    await db.insert(chatActions).values({
      id: actionId,
      companyId: fixture.companyId,
      endpointId: fixture.endpointId,
      conversationId: fixture.conversationId,
      principalId: fixture.principalId,
      kind: "question_answer",
      status: "processed",
      providerActionId: `answer-${interactionId}`,
      payload: {
        version: 1,
        interactionId,
        publicationId,
        questionId: "color",
        optionId: "cobalt",
      },
      result: { interactionId, interactionStatus: "answered" },
    });
    await db.insert(agentWakeupRequests).values({
      id: wakeId,
      companyId: fixture.companyId,
      agentId: fixture.agentId,
      source: "automation",
      triggerDetail: "system",
      reason: "issue_commented",
      requestedByActorType: "user",
      requestedByActorId: fixture.userId,
      idempotencyKey: `question-response:${interactionId}`,
      status: "claimed",
      runId: fixture.runId,
      payload: {
        issueId: fixture.issueId,
        interactionId,
        sourceRunId,
        sourceCommentId: fixture.commentId,
        mutation: "interaction",
        externalChatContinuation: true,
      },
    });
    const context: Record<string, unknown> = {
      issueId: fixture.issueId,
      taskId: fixture.issueId,
      source: "issue.interaction.respond",
      wakeReason: "issue_commented",
      interactionId,
      interactionKind: "ask_user_questions",
      interactionStatus: "answered",
      sourceRunId,
      sourceCommentId: fixture.commentId,
      wakeCommentId: fixture.commentId,
      wakeCommentIds: [fixture.commentId],
      externalChatContinuation: true,
    };
    await db
      .update(heartbeatRuns)
      .set({ wakeupRequestId: wakeId, contextSnapshot: context, status: "running" })
      .where(eq(heartbeatRuns.id, fixture.runId));
    return {
      ...fixture,
      gate,
      context,
      interactionId,
      sourceRunId,
      responseDeliveryId: responseDelivery!.id,
      wakeId,
      publicationId,
      actionId,
    };
  }

  async function attestAnswer(
    fixture: Awaited<ReturnType<typeof seedAnsweredChatTurn>>,
  ) {
    expect(
      await attestReviewedExternalChatRun({
        db,
        ...fixture,
        contextSnapshot: fixture.context,
      }),
    ).toBe(true);
    expect(fixture.context.paperclipExternalChatQuestionResponse).toMatchObject(
      {
        schema: "paperclip.external_chat_question_response.v1",
        interactionId: fixture.interactionId,
        sourceRunId: fixture.sourceRunId,
        responseDeliveryId: fixture.responseDeliveryId,
      },
    );
    fixture.context.paperclipExternalChatExecutionBound = true;
    fixture.context.paperclipWake = await buildPaperclipWakePayload({
      db,
      companyId: fixture.companyId,
      agentId: fixture.agentId,
      runId: fixture.runId,
      contextSnapshot: fixture.context,
    });
    await db
      .update(heartbeatRuns)
      .set({ contextSnapshot: fixture.context })
      .where(eq(heartbeatRuns.id, fixture.runId));
  }

  async function seedSequentialQuestionChain(depth = 2) {
    const fixture = await seedAnsweredChatTurn();
    const parents: Array<Awaited<ReturnType<typeof seedAnsweredChatTurn>>> = [];
    let cursor = fixture;
    for (let index = 1; index < depth; index += 1) {
      cursor = await seedAnsweredChatTurn("telegram", {
        fixture: { ...fixture, runId: cursor.sourceRunId },
        gate: fixture.gate,
      });
      parents.unshift(cursor);
    }
    for (const parent of parents) {
      await db
        .update(issues)
        .set({ executionRunId: parent.runId })
        .where(eq(issues.id, fixture.issueId));
      await attestAnswer(parent);
      await db
        .update(heartbeatRuns)
        .set({ status: "succeeded" })
        .where(eq(heartbeatRuns.id, parent.runId));
    }
    await db
      .update(issues)
      .set({ executionRunId: fixture.runId })
      .where(eq(issues.id, fixture.issueId));
    return { fixture, parents };
  }

  it.each([1, 3])(
    "reports only the latest durable answer time for a %i-question chain after a long wait",
    async (depth) => {
      const { fixture, parents } = await seedSequentialQuestionChain(depth);
      const answeredAt = new Date(Date.now() + 7_200_000);
      const originalCreatedAt = new Date(answeredAt.getTime() - 14_400_000);
      for (const parent of parents) {
        const [earlier] = await db
          .select()
          .from(issueThreadInteractions)
          .where(eq(issueThreadInteractions.id, parent.interactionId));
        expect(answeredAt.getTime()).toBeGreaterThan(
          earlier!.resolvedAt!.getTime(),
        );
      }
      await db
        .update(issueComments)
        .set({ createdAt: originalCreatedAt })
        .where(eq(issueComments.id, fixture.commentId));
      const [interaction] = await db
        .update(issueThreadInteractions)
        .set({ resolvedAt: answeredAt })
        .where(eq(issueThreadInteractions.id, fixture.interactionId))
        .returning();
      const delivery = questionResponseDeliveryValues(
        interaction as unknown as AskUserQuestionsInteraction,
      );
      await db
        .update(issueQuestionResponseDeliveries)
        .set({ payloadSha256: delivery.payloadSha256 })
        .where(
          eq(issueQuestionResponseDeliveries.id, fixture.responseDeliveryId),
        );
      // Neither a caller timestamp nor an untrusted marker field is the source.
      fixture.context.answeredAtMs = 1;
      fixture.context.paperclipExternalChatQuestionResponse = {
        answeredAtMs: 2,
      };
      const onQuestionResponseAttested = vi.fn();
      expect(
        await attestReviewedExternalChatRun({
          db,
          ...fixture,
          contextSnapshot: fixture.context,
          onQuestionResponseAttested,
        }),
      ).toBe(true);
      expect(onQuestionResponseAttested).toHaveBeenCalledExactlyOnceWith(
        answeredAt.getTime(),
      );
      expect(fixture.context.sourceCommentId).toBe(fixture.commentId);
      expect(fixture.context.wakeCommentIds).toEqual([fixture.commentId]);
      expect(
        fixture.context.paperclipExternalChatQuestionResponse,
      ).not.toHaveProperty("answeredAtMs");
      const [comment] = await db
        .select()
        .from(issueComments)
        .where(eq(issueComments.id, fixture.commentId));
      expect(comment!.createdAt).toEqual(originalCreatedAt);
    },
  );

  it.each(["forged_source", "stale_answer", "unattested_principal"] as const)(
    "does not expose an answered-question timestamp for %s",
    async (kind) => {
      const fixture = await seedAnsweredChatTurn();
      if (kind === "forged_source") {
        fixture.context.sourceRunId = randomUUID();
        await db
          .update(heartbeatRuns)
          .set({ contextSnapshot: fixture.context })
          .where(eq(heartbeatRuns.id, fixture.runId));
      }
      if (kind === "stale_answer")
        await db
          .update(issueQuestionResponseDeliveries)
          .set({ payloadSha256: "0".repeat(64) })
          .where(
            eq(issueQuestionResponseDeliveries.id, fixture.responseDeliveryId),
          );
      if (kind === "unattested_principal")
        await db
          .update(chatIdentityLinks)
          .set({ status: "revoked" })
          .where(eq(chatIdentityLinks.principalId, fixture.principalId));
      fixture.context.answeredAtMs = 1;
      const onQuestionResponseAttested = vi.fn();
      expect(
        await attestReviewedExternalChatRun({
          db,
          ...fixture,
          contextSnapshot: fixture.context,
          onQuestionResponseAttested,
        }),
      ).toBe(false);
      expect(onQuestionResponseAttested).not.toHaveBeenCalled();
    },
  );

  it("does not expose an answered-question timestamp before its attestation transaction commits", async () => {
    const fixture = await seedAnsweredChatTurn();
    const onQuestionResponseAttested = vi.fn();
    let validatedInsideTransaction = false;
    const rolledBackDb = {
      transaction: async (operation: (tx: typeof db) => Promise<unknown>) =>
        db.transaction(async (tx) => {
          await operation(tx as unknown as typeof db);
          validatedInsideTransaction = true;
          throw new Error("timing_attestation_test_rollback");
        }),
    } as unknown as typeof db;
    await expect(
      attestReviewedExternalChatRun({
        db: rolledBackDb,
        ...fixture,
        contextSnapshot: fixture.context,
        onQuestionResponseAttested,
      }),
    ).rejects.toThrow("timing_attestation_test_rollback");
    expect(validatedInsideTransaction).toBe(true);
    expect(onQuestionResponseAttested).not.toHaveBeenCalled();
  });

  it("authorizes sequential chat questions through exact durable parents and preserves the original request", async () => {
    const { fixture, parents } = await seedSequentialQuestionChain(3);
    await attestAnswer(fixture);
    const resolved = await resolveExternalChatQuestionResponse(
      db,
      fixture,
      fixture.context,
      "read",
    );
    expect(resolved?.interactionIds).toEqual([
      ...parents.map((parent) => parent.interactionId),
      fixture.interactionId,
    ]);
    expect(resolved?.marker.sourceCommentId).toBe(fixture.commentId);
    expect(fixture.context.source).toBe("issue.interaction.respond");
    expect(fixture.context.wakeCommentIds).toEqual([fixture.commentId]);
    const responses = await materializeExternalChatQuestionResponseInput({
      db, binding: fixture, contextSnapshot: fixture.context,
    });
    expect(responses.map((response) => response.interactionId)).toEqual(resolved!.interactionIds);
    const resultJson = await finishReviewResponse(fixture);
    expect(
      await authorizeNativeChatReviewPresentation(db, {
        ...fixture,
        resultJson,
      }),
    ).toBe(true);
    expect(
      await db
        .select()
        .from(issueThreadInteractions)
        .where(eq(issueThreadInteractions.id, fixture.gate.id)),
    ).toEqual([expect.objectContaining({ status: "pending" })]);
  });

  it.each(["execution_owner", "agent_paused", "membership_revoked"] as const)(
    "rechecks current sequential answer input authority after attestation: %s",
    async (kind) => {
      const { fixture } = await seedSequentialQuestionChain();
      await attestAnswer(fixture);
      if (kind === "execution_owner")
        await db
          .update(issues)
          .set({ executionRunId: fixture.sourceRunId })
          .where(eq(issues.id, fixture.issueId));
      if (kind === "agent_paused")
        await db
          .update(agents)
          .set({ status: "paused" })
          .where(eq(agents.id, fixture.agentId));
      if (kind === "membership_revoked")
        await db
          .update(companyMemberships)
          .set({ status: "suspended" })
          .where(
            and(
              eq(companyMemberships.companyId, fixture.companyId),
              eq(companyMemberships.principalId, fixture.userId),
            ),
          );
      await expect(
        materializeExternalChatQuestionResponseInput({
          db,
          binding: fixture,
          contextSnapshot: fixture.context,
        }),
      ).rejects.toThrow(
        kind === "membership_revoked"
          ? "paperclip_runner_chat_attachment_principal_denied"
          : "reviewed_chat_execution_binding_not_authorized",
      );
    },
  );

  it("materializes a sequential answer chain atomically with authorization before a coherent ancestor rewrite", async () => {
    const { fixture, parents } = await seedSequentialQuestionChain();
    await attestAnswer(fixture);
    const parent = parents[0]!;
    let reached!: () => void;
    let release!: () => void;
    const ready = new Promise<void>((resolve) => {
      reached = resolve;
    });
    const released = new Promise<void>((resolve) => {
      release = resolve;
    });
    const original =
      nativeInteractionBridge.materializeNativeInteractionResponses;
    const spy = vi
      .spyOn(nativeInteractionBridge, "materializeNativeInteractionResponses")
      .mockImplementationOnce(async (input) => {
        reached();
        await released;
        return original(input);
      });
    const prompt = materializeExternalChatQuestionResponseInput({
      db,
      binding: fixture,
      contextSnapshot: fixture.context,
    });
    let mutation: Promise<void> | null = null;
    let mutationPid = 0;
    try {
      await Promise.race([
        ready,
        prompt.then(() => {
          throw new Error("materialization_barrier_not_reached");
        }),
      ]);
      mutation = db.transaction(async (tx) => {
        const [backend] = await tx.execute(sql`select pg_backend_pid() as pid`);
        mutationPid = Number(backend!.pid);
        const [interaction] = await tx
          .update(issueThreadInteractions)
          .set({
            result: {
              version: 1,
              answers: [{ questionId: "color", optionIds: ["amber"] }],
            },
          })
          .where(eq(issueThreadInteractions.id, parent.interactionId))
          .returning();
        const [action] = await tx
          .select()
          .from(chatActions)
          .where(eq(chatActions.id, parent.actionId));
        await tx
          .update(chatActions)
          .set({ payload: { ...action!.payload, optionId: "amber" } })
          .where(eq(chatActions.id, parent.actionId));
        await tx
          .update(issueQuestionResponseDeliveries)
          .set({
            payloadSha256: questionResponseDeliveryValues(
              interaction! as unknown as AskUserQuestionsInteraction,
            ).payloadSha256,
          })
          .where(
            eq(issueQuestionResponseDeliveries.id, parent.responseDeliveryId),
          );
      });
      await vi.waitFor(async () => {
        expect(mutationPid).toBeGreaterThan(0);
        const [waiting] = await db.execute(
          sql`select exists(select 1 from pg_locks where pid = ${mutationPid} and not granted) as waiting`,
        );
        expect(waiting!.waiting).toBe(true);
      });
      release();
      const captured = await prompt;
      await mutation;
      expect(captured.map((response) => response.interactionId)).toEqual([
        parent.interactionId,
        fixture.interactionId,
      ]);
      expect(JSON.stringify(captured)).toContain("Cobalt");
      expect(JSON.stringify(captured)).not.toContain("Amber");
      await expect(
        materializeExternalChatQuestionResponseInput({
          db,
          binding: fixture,
          contextSnapshot: fixture.context,
        }),
      ).rejects.toThrow("reviewed_chat_execution_binding_not_authorized");
    } finally {
      release();
      await Promise.allSettled([prompt, ...(mutation ? [mutation] : [])]);
      spy.mockRestore();
    }
  });

  it.each([
    "missing_parent_marker",
    "missing_parent_delivery",
    "tampered_parent_answer",
    "rewritten_parent_answer_and_receipt",
    "duplicate_parent_action",
    "revoked_parent_principal",
    "wrong_parent_actor",
    "source_cycle",
    "different_parent_issue",
  ] as const)(
    "rejects an unauthenticated sequential chat question chain: %s",
    async (kind) => {
      const { fixture, parents } = await seedSequentialQuestionChain();
      const parent = parents[0]!;
      if (kind === "missing_parent_marker") {
        const context = { ...parent.context };
        delete context.paperclipExternalChatQuestionResponse;
        await db
          .update(heartbeatRuns)
          .set({ contextSnapshot: context })
          .where(eq(heartbeatRuns.id, parent.runId));
      }
      if (kind === "missing_parent_delivery")
        await db
          .delete(issueQuestionResponseDeliveries)
          .where(
            eq(issueQuestionResponseDeliveries.id, parent.responseDeliveryId),
          );
      if (kind === "tampered_parent_answer")
        await db
          .update(issueThreadInteractions)
          .set({
            result: {
              version: 1,
              answers: [{ questionId: "color", optionIds: ["amber"] }],
            },
          })
          .where(eq(issueThreadInteractions.id, parent.interactionId));
      if (kind === "rewritten_parent_answer_and_receipt") {
        const [interaction] = await db
          .update(issueThreadInteractions)
          .set({
            result: {
              version: 1,
              answers: [{ questionId: "color", optionIds: ["amber"] }],
            },
          })
          .where(eq(issueThreadInteractions.id, parent.interactionId))
          .returning();
        const [action] = await db
          .select()
          .from(chatActions)
          .where(eq(chatActions.id, parent.actionId));
        await db
          .update(chatActions)
          .set({ payload: { ...action!.payload, optionId: "amber" } })
          .where(eq(chatActions.id, parent.actionId));
        await db
          .update(issueQuestionResponseDeliveries)
          .set({
            payloadSha256: questionResponseDeliveryValues(
              interaction! as unknown as AskUserQuestionsInteraction,
            ).payloadSha256,
          })
          .where(
            eq(issueQuestionResponseDeliveries.id, parent.responseDeliveryId),
          );
      }
      if (kind === "duplicate_parent_action") {
        const [action] = await db
          .select()
          .from(chatActions)
          .where(eq(chatActions.id, parent.actionId));
        await db
          .insert(chatActions)
          .values({
            ...action!,
            id: randomUUID(),
            providerActionId: "duplicate-parent-response",
          });
      }
      if (kind === "revoked_parent_principal")
        await db
          .update(chatIdentityLinks)
          .set({ status: "revoked" })
          .where(eq(chatIdentityLinks.principalId, fixture.principalId));
      if (kind === "wrong_parent_actor")
        await db
          .update(agentWakeupRequests)
          .set({ requestedByActorId: "another-user" })
          .where(eq(agentWakeupRequests.id, parent.wakeId));
      if (kind === "different_parent_issue")
        await db
          .update(heartbeatRuns)
          .set({ nativeIssueId: fixture.sourceRunId })
          .where(eq(heartbeatRuns.id, parent.runId));
      if (kind === "source_cycle") {
        const [wake] = await db
          .select()
          .from(agentWakeupRequests)
          .where(eq(agentWakeupRequests.id, parent.wakeId));
        await db
          .update(agentWakeupRequests)
          .set({ payload: { ...wake!.payload, sourceRunId: fixture.runId } })
          .where(eq(agentWakeupRequests.id, parent.wakeId));
        await db
          .update(issueThreadInteractions)
          .set({ sourceRunId: fixture.runId })
          .where(eq(issueThreadInteractions.id, parent.interactionId));
        await db
          .update(issueQuestionResponseDeliveries)
          .set({ sourceRunId: fixture.runId })
          .where(
            eq(issueQuestionResponseDeliveries.id, parent.responseDeliveryId),
          );
        await db
          .update(heartbeatRuns)
          .set({
            contextSnapshot: { ...parent.context, sourceRunId: fixture.runId },
          })
          .where(eq(heartbeatRuns.id, parent.runId));
      }
      expect(
        await attestReviewedExternalChatRun({
          db,
          ...fixture,
          contextSnapshot: fixture.context,
        }),
      ).toBe(false);
      expect(
        fixture.context.paperclipExternalChatQuestionResponse,
      ).toBeUndefined();
    },
  );

  it("bounds sequential question ancestry without silently dropping earlier answers", async () => {
    const { fixture, parents } = await seedSequentialQuestionChain(9);
    const deepestAllowed = parents.at(-1)!;
    expect(
      (
        await resolveExternalChatQuestionResponse(
          db,
          deepestAllowed,
          deepestAllowed.context,
          "read",
        )
      )?.interactionIds,
    ).toHaveLength(8);
    expect(
      await attestReviewedExternalChatRun({
        db,
        ...fixture,
        contextSnapshot: fixture.context,
      }),
    ).toBe(false);
  });

  it("revalidates sequential question ancestors before publishing the later answer", async () => {
    const { fixture, parents } = await seedSequentialQuestionChain();
    await attestAnswer(fixture);
    const resultJson = await finishReviewResponse(fixture);
    expect(
      await authorizeNativeChatReviewPresentation(db, {
        ...fixture,
        resultJson,
      }),
    ).toBe(true);
    await db
      .update(agentWakeupRequests)
      .set({ requestedByActorId: "another-user" })
      .where(eq(agentWakeupRequests.id, parents[0]!.wakeId));
    expect(
      await authorizeNativeChatReviewPresentation(db, {
        ...fixture,
        resultJson,
      }),
    ).toBe(false);
  });

  it.each(["telegram", "discord"] as const)(
    "retains authenticated %s answer continuation presentation without resolving prior review",
    async (provider) => {
      const fixture = await seedAnsweredChatTurn(provider);
      await attestAnswer(fixture);
      const resultJson = await finishReviewResponse(fixture);
      expect(resultJson.externalChatReviewPresentation).toMatchObject({
        gateId: fixture.gate.id,
      });
      expect(
        await authorizeNativeChatReviewPresentation(db, {
          ...fixture,
          resultJson,
        }),
      ).toBe(true);
      const [gate] = await db
        .select()
        .from(issueThreadInteractions)
        .where(eq(issueThreadInteractions.id, fixture.gate.id));
      expect(gate!.status).toBe("pending");
    },
  );

  it.each([
    "wake_actor",
    "different_responder",
    "revoked_link",
    "wrong_option",
    "wrong_digest",
    "wrong_target",
    "wrong_wake_target",
    "missing_wake_receipt",
    "unprocessed_action",
    "duplicate_action",
    "source_issue",
    "source_batch",
    "execution_owner",
  ] as const)(
    "does not attest an unbound answered-chat continuation: %s",
    async (kind) => {
      const fixture = await seedAnsweredChatTurn();
      if (kind === "wake_actor")
        await db
          .update(agentWakeupRequests)
          .set({ requestedByActorId: "another-user" })
          .where(eq(agentWakeupRequests.id, fixture.wakeId));
      if (kind === "different_responder") {
        // A legitimate linked second responder must not inherit the original author's scope.
        const principalId = randomUUID();
        await db
          .insert(chatExternalPrincipals)
          .values({
            id: principalId,
            companyId: fixture.companyId,
            provider: "telegram",
            providerAccountId: "telegram-bot",
            externalId: "second-user",
            kind: "user",
          });
        await db
          .insert(chatIdentityLinks)
          .values({
            companyId: fixture.companyId,
            endpointId: fixture.endpointId,
            principalId,
            paperclipUserId: "second-user",
            status: "linked",
          });
        await db
          .insert(companyMemberships)
          .values({
            companyId: fixture.companyId,
            principalType: "user",
            principalId: "second-user",
            status: "active",
            membershipRole: "member",
          });
        await db
          .update(chatActions)
          .set({ principalId })
          .where(eq(chatActions.id, fixture.actionId));
        await db
          .update(issueThreadInteractions)
          .set({ resolvedByUserId: "second-user" })
          .where(eq(issueThreadInteractions.id, fixture.interactionId));
        await db
          .update(agentWakeupRequests)
          .set({ requestedByActorId: "second-user" })
          .where(eq(agentWakeupRequests.id, fixture.wakeId));
      }
      if (kind === "revoked_link")
        await db
          .update(chatIdentityLinks)
          .set({ status: "revoked" })
          .where(eq(chatIdentityLinks.principalId, fixture.principalId));
      if (kind === "wrong_option") {
        const [action] = await db
          .select()
          .from(chatActions)
          .where(eq(chatActions.id, fixture.actionId));
        await db
          .update(chatActions)
          .set({ payload: { ...action!.payload, optionId: "amber" } })
          .where(eq(chatActions.id, fixture.actionId));
      }
      if (kind === "wrong_digest")
        await db
          .update(issueQuestionResponseDeliveries)
          .set({ payloadSha256: "b".repeat(64) })
          .where(
            eq(issueQuestionResponseDeliveries.id, fixture.responseDeliveryId),
          );
      if (kind === "wrong_target")
        await db
          .update(issueQuestionResponseDeliveries)
          .set({ targetRunId: fixture.sourceRunId })
          .where(
            eq(issueQuestionResponseDeliveries.id, fixture.responseDeliveryId),
          );
      if (kind === "wrong_wake_target")
        await db
          .update(agentWakeupRequests)
          .set({ runId: fixture.sourceRunId })
          .where(eq(agentWakeupRequests.id, fixture.wakeId));
      if (kind === "missing_wake_receipt")
        await db
          .update(heartbeatRuns)
          .set({ wakeupRequestId: null })
          .where(eq(heartbeatRuns.id, fixture.runId));
      if (kind === "unprocessed_action")
        await db
          .update(chatActions)
          .set({ status: "issued" })
          .where(eq(chatActions.id, fixture.actionId));
      if (kind === "duplicate_action") {
        const [action] = await db
          .select()
          .from(chatActions)
          .where(eq(chatActions.id, fixture.actionId));
        await db
          .insert(chatActions)
          .values({
            ...action!,
            id: randomUUID(),
            providerActionId: "duplicate-response",
          });
      }
      if (kind === "source_issue" || kind === "source_batch") {
        const [source] = await db
          .select()
          .from(heartbeatRuns)
          .where(eq(heartbeatRuns.id, fixture.sourceRunId));
        await db
          .update(heartbeatRuns)
          .set({
            contextSnapshot: {
              ...source!.contextSnapshot,
              ...(kind === "source_issue"
                ? { issueId: randomUUID() }
                : { wakeCommentIds: [randomUUID(), fixture.commentId] }),
            },
          })
          .where(eq(heartbeatRuns.id, fixture.sourceRunId));
      }
      if (kind === "execution_owner")
        await db
          .update(issues)
          .set({ executionRunId: fixture.sourceRunId })
          .where(eq(issues.id, fixture.issueId));
      expect(
        await attestReviewedExternalChatRun({
          db,
          ...fixture,
          contextSnapshot: fixture.context,
        }),
      ).toBe(false);
      expect(
        fixture.context.paperclipExternalChatQuestionResponse,
      ).toBeUndefined();
      expect(
        await db
          .select()
          .from(issueThreadInteractions)
          .where(eq(issueThreadInteractions.id, fixture.gate.id)),
      ).toEqual([expect.objectContaining({ status: "pending" })]);
    },
  );

  it.each([
    "revoked_link",
    "revoked_membership",
    "demoted_membership",
    "changed_generation",
    "changed_answer",
    "changed_gate",
  ] as const)(
    "revalidates answered-chat presentation at dispatch: %s",
    async (kind) => {
      const fixture = await seedAnsweredChatTurn();
      await attestAnswer(fixture);
      const resultJson = await finishReviewResponse(fixture);
      expect(
        await authorizeNativeChatReviewPresentation(db, {
          ...fixture,
          resultJson,
        }),
      ).toBe(true);
      if (kind === "revoked_link")
        await db
          .update(chatIdentityLinks)
          .set({ status: "revoked" })
          .where(eq(chatIdentityLinks.principalId, fixture.principalId));
      if (kind === "revoked_membership")
        await db
          .update(companyMemberships)
          .set({ status: "suspended" })
          .where(
            and(
              eq(companyMemberships.companyId, fixture.companyId),
              eq(companyMemberships.principalId, fixture.userId),
            ),
          );
      if (kind === "demoted_membership")
        await db
          .update(companyMemberships)
          .set({ membershipRole: "viewer" })
          .where(
            and(
              eq(companyMemberships.companyId, fixture.companyId),
              eq(companyMemberships.principalId, fixture.userId),
            ),
          );
      if (kind === "changed_generation")
        await db
          .update(chatConversations)
          .set({ sessionGeneration: 2 })
          .where(eq(chatConversations.id, fixture.conversationId));
      if (kind === "changed_answer")
        await db
          .update(issueThreadInteractions)
          .set({
            result: {
              version: 1,
              answers: [{ questionId: "color", optionIds: ["amber"] }],
            },
          })
          .where(eq(issueThreadInteractions.id, fixture.interactionId));
      if (kind === "changed_gate")
        await db
          .update(issueThreadInteractions)
          .set({ status: "accepted" })
          .where(eq(issueThreadInteractions.id, fixture.gate.id));
      expect(
        await authorizeNativeChatReviewPresentation(db, {
          ...fixture,
          resultJson,
        }),
      ).toBe(false);
    },
  );

  it("does not register a fallback after an answered-chat principal is revoked without a review gate", async () => {
    const fixture = await seedAnsweredChatTurn();
    await attestAnswer(fixture);
    await db
      .update(issueThreadInteractions)
      .set({ status: "accepted" })
      .where(eq(issueThreadInteractions.id, fixture.gate.id));
    await db
      .update(issues)
      .set({ status: "in_progress" })
      .where(eq(issues.id, fixture.issueId));
    await db
      .update(chatIdentityLinks)
      .set({ status: "revoked" })
      .where(eq(chatIdentityLinks.principalId, fixture.principalId));
    await finishReviewResponse(fixture);
    expect(
      await db
        .select()
        .from(statusDecisions)
        .where(eq(statusDecisions.runId, fixture.runId)),
    ).toEqual([
      expect.objectContaining({
        reasonCode: "external_chat_response_wait_authorization_lost",
        decisionJson: expect.objectContaining({ effects: [] }),
      }),
    ]);
    expect(
      await db
        .select()
        .from(agentWakeupRequests)
        .where(eq(agentWakeupRequests.companyId, fixture.companyId)),
    ).toHaveLength(1);
  });

  it("accepts the exact admitted answer while its post-wakeup delivery receipt is still finishing", async () => {
    const fixture = await seedAnsweredChatTurn();
    await db
      .update(issueQuestionResponseDeliveries)
      .set({ status: "delivering", deliveryMode: null, targetRunId: null })
      .where(
        eq(issueQuestionResponseDeliveries.id, fixture.responseDeliveryId),
      );
    await attestAnswer(fixture);
    await db
      .update(issueQuestionResponseDeliveries)
      .set({
        status: "fallback_queued",
        deliveryMode: "wake_fallback",
        targetRunId: fixture.runId,
      })
      .where(
        eq(issueQuestionResponseDeliveries.id, fixture.responseDeliveryId),
      );
    const resultJson = await finishReviewResponse(fixture);
    expect(
      await authorizeNativeChatReviewPresentation(db, {
        ...fixture,
        resultJson,
      }),
    ).toBe(true);
  });

  it("takes the answered-chat identity advisory before identity rows during concurrent revocation", async () => {
    const fixture = await seedAnsweredChatTurn();
    await attestAnswer(fixture);
    let release!: () => void;
    let acquired!: () => void;
    let revoke!: () => void;
    let confirmRevoked!: () => void;
    let rejectRevoked!: (error: unknown) => void;
    const released = new Promise<void>((resolve) => {
      release = resolve;
    });
    const ready = new Promise<void>((resolve) => {
      acquired = resolve;
    });
    const shouldRevoke = new Promise<void>((resolve) => {
      revoke = resolve;
    });
    const revoked = new Promise<void>((resolve, reject) => {
      confirmRevoked = resolve;
      rejectRevoked = reject;
    });
    const holder = db.transaction(async (tx) => {
      await tx.execute(
        sql`select pg_advisory_xact_lock(hashtextextended(${`chat-identity:${fixture.companyId}:${fixture.principalId}`}, 0))`,
      );
      acquired();
      await shouldRevoke;
      try {
        await tx
          .select()
          .from(chatIdentityLinks)
          .where(eq(chatIdentityLinks.principalId, fixture.principalId))
          .for("update", { noWait: true });
        await tx
          .update(chatIdentityLinks)
          .set({ status: "revoked" })
          .where(eq(chatIdentityLinks.principalId, fixture.principalId));
        confirmRevoked();
      } catch (error) {
        rejectRevoked(error);
        throw error;
      } finally {
        await released;
      }
    });
    await ready;
    let readerPid = 0;
    const reader = db
      .transaction(async (tx) => {
        const [backend] = await tx.execute(sql`select pg_backend_pid() as pid`);
        readerPid = Number(backend!.pid);
        return authorizeChatConversationForBoundRun(
          tx as unknown as typeof db,
          fixture,
          fixture.context,
        );
      })
      .then(
        () => "unexpectedly_authorized",
        (error: Error) => error.message,
      );
    try {
      await vi.waitFor(async () => {
        expect(readerPid).toBeGreaterThan(0);
        const [waiting] = await db.execute(
          sql`select exists(select 1 from pg_locks where pid = ${readerPid} and locktype = 'advisory' and not granted) as waiting`,
        );
        expect(waiting!.waiting).toBe(true);
      });
      revoke();
      await Promise.race([revoked, holder]);
    } finally {
      revoke();
      release();
      await Promise.allSettled([holder, reader]);
    }
    expect(await reader).toBe(
      "paperclip_runner_chat_attachment_binding_denied",
    );
  });

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
