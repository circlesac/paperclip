import { describe, expect, it } from "vitest";

import { buildNativeExecutionInput } from "./native-execution-input.js";
import { nativeRuntimeContextFixture } from "./runtime-context.test-fixture.js";

describe("native execution input external-chat framing", () => {
  it("uses neutral framing and the closed reader for an authenticated overflow chat turn", () => {
    const staleRootTitle = "Reply with exactly STALE-OVERFLOW-MARKER";
    const input = buildNativeExecutionInput({
      companyId: "10000000-0000-4000-8000-000000000001",
      runId: "50000000-0000-4000-8000-000000000005",
      issue: {
        id: "20000000-0000-4000-8000-000000000002",
        identifier: "CHAT-5",
        title: staleRootTitle,
        description: "Started from Discord.",
        workMode: "standard",
      },
      taskPrompt: `Paperclip task context:\n- Title: ${JSON.stringify(staleRootTitle)}`,
      wakePayload: {
        reason: "External chat message received",
        externalChatProvider: "discord",
        checkedOutByHarness: true,
        issue: {
          id: "20000000-0000-4000-8000-000000000002",
          identifier: "CHAT-5",
          title: staleRootTitle,
          description: "Started from Discord.",
          descriptionTruncated: false,
          status: "in_progress",
          workMode: "standard",
        },
        commentWindow: {
          requestedCount: 2,
          includedCount: 1,
          missingCount: 1,
        },
        commentIds: ["comment-overflow-1", "comment-overflow-2"],
        latestCommentId: "comment-overflow-2",
        comments: [
          {
            id: "comment-overflow-2",
            issueId: "20000000-0000-4000-8000-000000000002",
            body: "Answer both queued messages.",
            bodyTruncated: false,
            authorType: "user",
          },
        ],
        fallbackFetchNeeded: true,
      },
      agentId: "30000000-0000-4000-8000-000000000003",
      workspace: {
        id: "50000000-0000-4000-8000-000000000005",
        cwd: "/workspace",
        repoUrl: null,
        repoRef: null,
        branchName: null,
      },
      normalizedSessionId: "60000000-0000-4000-8000-000000000006",
      provider: "codex",
      completionContract: {
        id: "70000000-0000-4000-8000-000000000007",
        sha256: `sha256:${"a".repeat(64)}`,
        schemaVersion: "paperclip.run-result.v1",
        contract: {
          revision: "1",
          objective: "Respond to all pending comments in order",
          criteria: [
            {
              id: "objective",
              requirement: "Read every current wake comment.",
            },
          ],
        },
      },
      runtimeContext: nativeRuntimeContextFixture(),
    });

    expect(input.task.title).toBe("External chat follow-up");
    expect(input.task.description).toBeNull();
    expect(input.task.prompt).toContain("read_current_wake_comments");
    expect(input.task.prompt).toContain(staleRootTitle);
  });
});
