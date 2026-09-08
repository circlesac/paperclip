import { randomUUID } from "node:crypto";

import { and, eq } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import {
  agentWakeupRequests,
  agents,
  chatConversations,
  chatDeliveries,
  chatEndpointResources,
  chatEndpoints,
  chatExternalPrincipals,
  chatIdentityLinks,
  chatMessageLinks,
  companies,
  companyMemberships,
  completionContracts,
  createDb,
  heartbeatRuns,
  issueComments,
  issues,
  nativeRunFinalizations,
  statusDecisions,
  toolApplications,
  toolConnections,
} from "@paperclipai/db";
import type {
  PrpStructuredRunResult,
  PrpTerminalState,
} from "../../vendor/paperclip-runner/index.js";

import { startEmbeddedPostgresTestDatabase } from "../../__tests__/helpers/embedded-postgres.js";
import { finalizeNativeRun } from "./native-run-finalizer.js";
import { PaperclipControlPlanePort } from "./paperclip-control-plane-port.js";

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

  async function seedWaitTurn() {
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
      provider: "telegram",
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
      provider: "telegram",
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
          source: "chat:telegram",
          paperclipHarnessCheckedOut: true,
          issueId,
          wakeCommentId: commentId,
          wakeCommentIds: [commentId],
          paperclipWake: {
            reason: "External chat message received",
            externalChatProvider: "telegram",
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
      attentionRequests: [],
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
      .set({ status: "running", updatedAt: new Date() })
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
