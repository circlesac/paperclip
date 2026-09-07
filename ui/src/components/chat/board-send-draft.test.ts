// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  boardSendDraftKey,
  clearBoardSendDraft,
  readBoardSendDraft,
  writeBoardSendDraft,
} from "./board-send-draft";

describe("session-scoped Board send identity", () => {
  afterEach(() => {
    sessionStorage.clear();
    vi.restoreAllMocks();
  });
  it("keeps pending payloads isolated by company, task, endpoint and conversation", () => {
    const scope = ["company", "task", "endpoint", "conversation"] as const;
    const key = boardSendDraftKey(...scope);
    const draft = {
      body: "Intended external update",
      attachmentIds: ["file-1"],
      idempotencyKey: "stable-request-key-1",
      publication: null,
    };
    writeBoardSendDraft(key, draft);
    expect(readBoardSendDraft(key)).toEqual(draft);
    for (let index = 0; index < scope.length; index += 1) {
      const other = [...scope] as [string, string, string, string];
      other[index] = "other";
      expect(readBoardSendDraft(boardSendDraftKey(...other))).toBeNull();
    }
    clearBoardSendDraft(key);
    expect(readBoardSendDraft(key)).toBeNull();
  });
  it("rejects corrupt retained identity instead of silently enabling a new send", () => {
    sessionStorage.setItem("corrupt", '{"body":"draft"}');
    expect(() => readBoardSendDraft("corrupt")).toThrow(
      "Saved channel delivery identity",
    );
  });
  it("surfaces storage write failures before a caller performs its send", () => {
    vi.spyOn(
      Object.getPrototypeOf(sessionStorage),
      "setItem",
    ).mockImplementation(() => {
      throw new Error("Storage full");
    });
    expect(() =>
      writeBoardSendDraft("key", {
        body: "draft",
        attachmentIds: [],
        idempotencyKey: "stable-request-key-1",
        publication: null,
      }),
    ).toThrow("Storage full");
  });
});
