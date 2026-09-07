import { describe, expect, it } from "vitest";
import { mergeCoalescedContextSnapshot } from "../services/heartbeat.ts";

describe("native status wake context provenance", () => {
  it("preserves a verified chat source when status control flow coalesces into the run", () => {
    const merged = mergeCoalescedContextSnapshot(
      {
        issueId: "issue-1",
        source: "chat:discord",
        wakeCommentId: "comment-1",
        wakeCommentIds: ["comment-1"],
      },
      {
        issueId: "issue-1",
        source: "native_status_decision",
        statusDecisionSource: "native_status_decision",
        wakeReason: "issue_status_changed",
      },
    );

    expect(merged).toMatchObject({
      source: "chat:discord",
      statusDecisionSource: "native_status_decision",
      wakeReason: "issue_status_changed",
      wakeCommentId: "comment-1",
      wakeCommentIds: ["comment-1"],
    });
  });

  it("does not preserve chat provenance for an unmarked ordinary incoming wake", () => {
    const merged = mergeCoalescedContextSnapshot(
      { source: "chat:discord" },
      { source: "native_status_decision" },
    );

    expect(merged.source).toBe("native_status_decision");
    expect(merged.statusDecisionSource).toBeUndefined();
  });
});
