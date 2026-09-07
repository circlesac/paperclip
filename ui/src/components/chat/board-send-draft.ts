import {
  CHAT_PUBLICATION_STATES,
  type ChatPublicationSummary,
} from "@paperclipai/shared";

export interface RetainedBoardSend {
  body: string;
  attachmentIds: string[];
  attachmentNames?: { id: string; name: string }[];
  idempotencyKey: string;
  publication: Pick<ChatPublicationSummary, "id" | "state" | "attempts"> | null;
}

export function boardSendDraftKey(
  companyId: string,
  issueId: string,
  endpointId: string,
  conversationId: string,
) {
  return `paperclip:board-send:v1:${JSON.stringify([companyId, issueId, endpointId, conversationId])}`;
}

export function readBoardSendDraft(key: string): RetainedBoardSend | null {
  const raw = sessionStorage.getItem(key);
  if (!raw) return null;
  const value = JSON.parse(raw) as Partial<RetainedBoardSend>;
  if (
    !value ||
    typeof value !== "object" ||
    typeof value.body !== "string" ||
    !value.body.trim() ||
    value.body.length > 100_000 ||
    typeof value.idempotencyKey !== "string" ||
    value.idempotencyKey.length < 16 ||
    value.idempotencyKey.length > 200 ||
    !Array.isArray(value.attachmentIds) ||
    value.attachmentIds.length > 20 ||
    !value.attachmentIds.every((id) => typeof id === "string") ||
    (value.attachmentNames !== undefined &&
      (!Array.isArray(value.attachmentNames) ||
        value.attachmentNames.length !== value.attachmentIds.length ||
        new Set(value.attachmentNames.map((file) => file?.id)).size !==
          value.attachmentNames.length ||
        !value.attachmentNames.every(
          (file) =>
            file &&
            typeof file.id === "string" &&
            value.attachmentIds!.includes(file.id) &&
            typeof file.name === "string",
        ))) ||
    (value.publication !== null &&
      (!value.publication ||
        typeof value.publication.id !== "string" ||
        !value.publication.id ||
        !CHAT_PUBLICATION_STATES.includes(value.publication.state) ||
        !Number.isSafeInteger(value.publication.attempts) ||
        value.publication.attempts < 0))
  )
    throw new Error(
      "Saved channel delivery identity could not be read. Check Activity before starting another send.",
    );
  return value as RetainedBoardSend;
}

export function writeBoardSendDraft(key: string, value: RetainedBoardSend) {
  // This is a delivery identity, not a best-effort text draft. The caller must
  // stop before POST when storage fails; otherwise reload could create a duplicate.
  sessionStorage.setItem(key, JSON.stringify(value));
}

export function clearBoardSendDraft(key: string) {
  sessionStorage.removeItem(key);
}
