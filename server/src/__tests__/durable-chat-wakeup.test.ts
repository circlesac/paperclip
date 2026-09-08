import { randomUUID } from "node:crypto";
import { and, eq } from "drizzle-orm";
import {
  afterAll,
  afterEach,
  beforeAll,
  describe,
  expect,
  it,
  vi,
} from "vitest";
import {
  agents,
  companies,
  createDb,
  heartbeatRuns,
  agentWakeupRequests,
  issues,
} from "@paperclipai/db";
import { startEmbeddedPostgresTestDatabase } from "./helpers/embedded-postgres.js";
import { heartbeatService } from "../services/heartbeat.js";
import { createDurableChatWakeupRequest } from "../services/durable-chat-wakeup.js";
import { queueIssueAssignmentWakeup } from "../services/issue-assignment-wakeup.js";
import { runningProcesses } from "../adapters/index.js";

describe("durable inbound chat scheduler receipts", () => {
  let temporary: Awaited<ReturnType<typeof startEmbeddedPostgresTestDatabase>>;
  let db: ReturnType<typeof createDb>;
  const liveRunIds = new Set<string>();
  beforeAll(async () => {
    temporary = await startEmbeddedPostgresTestDatabase(
      "chat-wakeup-receipts-",
    );
    db = createDb(temporary.connectionString);
  }, 30_000);
  afterEach(() => {
    for (const runId of liveRunIds) runningProcesses.delete(runId);
    liveRunIds.clear();
  });
  afterAll(async () => {
    await temporary.cleanup();
  });

  async function fixture(deferred = false) {
    const companyId = randomUUID(),
      agentId = randomUUID(),
      issueId = randomUUID(),
      activeRunId = randomUUID();
    await db.insert(companies).values({
      id: companyId,
      name: "Durable wake",
      issuePrefix: `D${companyId.slice(0, 7)}`,
      defaultResponsibleUserId: "board-user",
      requireBoardApprovalForNewAgents: false,
    });
    await db.insert(agents).values({
      id: agentId,
      companyId,
      name: "Maya",
      role: "ceo",
      status: "running",
      adapterType: "process",
      adapterConfig: {},
      runtimeConfig: { heartbeat: { maxConcurrentRuns: 1 } },
    });
    await db.insert(heartbeatRuns).values({
      id: activeRunId,
      companyId,
      agentId,
      status: "running",
      contextSnapshot: { issueId: deferred ? issueId : randomUUID() },
    });
    runningProcesses.set(activeRunId, {
      child: {} as never,
      graceSec: 0,
      processGroupId: null,
    });
    liveRunIds.add(activeRunId);
    await db.insert(issues).values({
      id: issueId,
      companyId,
      title: "Bound chat task",
      status: "in_progress",
      assigneeAgentId: agentId,
      responsibleUserId: "board-user",
      ...(deferred
        ? {
            executionRunId: activeRunId,
            executionAgentNameKey: "maya",
            executionLockedAt: new Date(),
          }
        : {}),
    });
    const heartbeat = heartbeatService(db);
    const authorize = vi.fn(async () => {});
    const request = (commentId = randomUUID(), actor = "board-user") =>
      createDurableChatWakeupRequest({
        id: randomUUID(),
        companyId,
        agentId,
        issueId,
        commentId,
        requestedByActorType: "user",
        requestedByActorId: actor,
        requestedAt: new Date(),
        authorize,
      });
    const wake = (durableChatRequest: ReturnType<typeof request>) =>
      queueIssueAssignmentWakeup({
        heartbeat,
        issue: { id: issueId, assigneeAgentId: agentId, status: "in_progress" },
        reason: "External chat message received",
        mutation: "chat_message_received",
        contextSource: "chat:slack",
        requestedByActorType: "user",
        requestedByActorId: durableChatRequest.requestedByActorId,
        wakeCommentId: durableChatRequest.commentId,
        durableChatRequest,
        rethrowOnError: true,
      });
    return {
      companyId,
      agentId,
      issueId,
      activeRunId,
      heartbeat,
      authorize,
      request,
      wake,
    };
  }

  it("retries and competing workers create one queued receipt and one run", async () => {
    const f = await fixture();
    const request = f.request();
    await Promise.all([f.wake(request), f.wake(request)]);
    await f.wake(request);
    const receipts = await db
      .select()
      .from(agentWakeupRequests)
      .where(eq(agentWakeupRequests.id, request.id));
    expect(receipts).toHaveLength(1);
    expect(receipts[0]).toMatchObject({
      status: "queued",
      idempotencyKey: request.idempotencyKey,
    });
    expect(
      await db
        .select()
        .from(heartbeatRuns)
        .where(
          and(
            eq(heartbeatRuns.agentId, f.agentId),
            eq(heartbeatRuns.wakeupRequestId, request.id),
          ),
        ),
    ).toHaveLength(1);
    expect(f.authorize).toHaveBeenCalledTimes(1);
  });

  it("records a stable receipt when merging into a deferred wake and never merges the replay twice", async () => {
    const f = await fixture(true);
    const first = f.request(),
      second = f.request();
    await f.wake(first);
    await f.wake(second);
    await f.wake(second);
    const rows = await db
      .select()
      .from(agentWakeupRequests)
      .where(eq(agentWakeupRequests.agentId, f.agentId));
    expect(rows).toHaveLength(2);
    expect(rows.find((row) => row.id === first.id)).toMatchObject({
      status: "deferred_issue_execution",
      coalescedCount: 1,
    });
    expect(rows.find((row) => row.id === second.id)).toMatchObject({
      status: "coalesced",
      payload: { coalescedIntoWakeupRequestId: first.id },
    });
    expect(
      await db
        .select()
        .from(heartbeatRuns)
        .where(eq(heartbeatRuns.agentId, f.agentId)),
    ).toHaveLength(1);
  });

  it("keeps different actors in separate deferred receipts", async () => {
    const f = await fixture(true);
    await f.wake(f.request());
    await f.wake(f.request(randomUUID(), "another-user"));
    const rows = await db
      .select()
      .from(agentWakeupRequests)
      .where(eq(agentWakeupRequests.agentId, f.agentId));
    expect(rows).toHaveLength(2);
    expect(
      rows.every(
        (row) =>
          row.status === "deferred_issue_execution" && row.coalescedCount === 0,
      ),
    ).toBe(true);
  });

  it("records queued-run coalescence once with the stable receipt ID", async () => {
    const f = await fixture();
    const first = f.request(),
      second = f.request();
    await f.wake(first);
    const [firstReceipt] = await db
      .select()
      .from(agentWakeupRequests)
      .where(eq(agentWakeupRequests.id, first.id));
    await db
      .update(issues)
      .set({
        executionRunId: firstReceipt.runId,
        executionAgentNameKey: "maya",
        executionLockedAt: new Date(),
      })
      .where(eq(issues.id, f.issueId));
    await f.wake(second);
    await f.wake(second);
    const [receipt] = await db
      .select()
      .from(agentWakeupRequests)
      .where(eq(agentWakeupRequests.id, second.id));
    expect(receipt).toMatchObject({
      status: "coalesced",
      runId: firstReceipt.runId,
      coalescedCount: 1,
    });
    expect(
      await db
        .select()
        .from(heartbeatRuns)
        .where(eq(heartbeatRuns.agentId, f.agentId)),
    ).toHaveLength(2);
  });

  it("rejects a stable receipt ID reused for a different authenticated actor", async () => {
    const f = await fixture();
    const first = f.request();
    await f.wake(first);
    const conflicting = createDurableChatWakeupRequest({
      ...first,
      requestedByActorId: "different-user",
    });
    await expect(f.wake(conflicting)).rejects.toThrow(
      "chat_inbound_wakeup_receipt_conflict",
    );
    expect(
      await db
        .select()
        .from(agentWakeupRequests)
        .where(eq(agentWakeupRequests.agentId, f.agentId)),
    ).toHaveLength(1);
    expect(
      await db
        .select()
        .from(heartbeatRuns)
        .where(eq(heartbeatRuns.agentId, f.agentId)),
    ).toHaveLength(2);
  });

  it("never readmits or dispatches a cancelled receipt on replay", async () => {
    const f = await fixture();
    const request = f.request();
    await f.wake(request);
    const [receipt] = await db
      .select()
      .from(agentWakeupRequests)
      .where(eq(agentWakeupRequests.id, request.id));
    await db
      .update(agentWakeupRequests)
      .set({ status: "cancelled" })
      .where(eq(agentWakeupRequests.id, request.id));
    await db
      .update(heartbeatRuns)
      .set({ status: "cancelled", finishedAt: new Date() })
      .where(eq(heartbeatRuns.id, receipt.runId!));
    await f.wake(request);
    expect(f.authorize).toHaveBeenCalledTimes(1);
    expect(
      await db
        .select()
        .from(heartbeatRuns)
        .where(eq(heartbeatRuns.agentId, f.agentId)),
    ).toHaveLength(2);
  });

  it("does not accept a JSON copy of the internal scheduling capability", async () => {
    const f = await fixture();
    const request = f.request();
    await expect(f.wake(JSON.parse(JSON.stringify(request)))).rejects.toThrow(
      "chat_inbound_wakeup_binding_denied",
    );
    expect(
      await db
        .select()
        .from(agentWakeupRequests)
        .where(eq(agentWakeupRequests.agentId, f.agentId)),
    ).toEqual([]);
  });

  it("rechecks current authorization in the scheduling transaction", async () => {
    const f = await fixture();
    f.authorize.mockRejectedValueOnce(new Error("reach revoked"));
    await expect(f.wake(f.request())).rejects.toThrow("reach revoked");
    expect(
      await db
        .select()
        .from(agentWakeupRequests)
        .where(eq(agentWakeupRequests.agentId, f.agentId)),
    ).toEqual([]);
  });
});
