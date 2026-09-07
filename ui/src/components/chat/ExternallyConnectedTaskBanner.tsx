import { useCallback, useEffect, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ExternalLink, Paperclip, Radio } from "lucide-react";
import type {
  ChatPublicationState,
  IssueAttachment,
} from "@paperclipai/shared";
import {
  chatEndpointsApi,
  type ChatProvider,
  type ChatPublicationSummary,
  type ExternalChannelBindingSummary,
} from "@/api/chatEndpoints";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/context/ToastContext";
import { Link } from "@/lib/router";
import { queryKeys } from "@/lib/queryKeys";
import {
  boardSendDraftKey,
  clearBoardSendDraft,
  readBoardSendDraft,
  writeBoardSendDraft,
  type RetainedBoardSend,
} from "./board-send-draft";

const providerNames: Record<ChatProvider, string> = {
  slack: "Slack",
  github: "GitHub",
  discord: "Discord",
  "microsoft-teams": "Microsoft Teams",
  telegram: "Telegram",
};

type PublicationFeedback = {
  title: string;
  body: string;
  tone: "info" | "success" | "warn" | "error";
};

const publicationFeedback: Record<ChatPublicationState, PublicationFeedback> = {
  published: {
    title: "Sent to channel",
    body: "The board update was published to the connected conversation.",
    tone: "success",
  },
  pending: {
    title: "Queued for channel",
    body: "Delivery is still pending. Your draft is kept until Paperclip confirms publication.",
    tone: "info",
  },
  streaming: {
    title: "Publishing to channel",
    body: "Delivery is still in progress. Your draft is kept until Paperclip confirms publication.",
    tone: "info",
  },
  retry: {
    title: "Delivery retry scheduled",
    body: "Paperclip will retry this publication. Your draft and retry identity are kept.",
    tone: "warn",
  },
  delivery_unknown: {
    title: "Delivery not confirmed",
    body: "The provider may have accepted this update. Resolve it in Activity before trying again to avoid a duplicate.",
    tone: "warn",
  },
  failed: {
    title: "Channel delivery failed",
    body: "Your draft is kept. Open Activity to retry this same publication safely.",
    tone: "error",
  },
  cancelled: {
    title: "Channel delivery cancelled",
    body: "Your draft is kept. Some parts may already have been published; check Activity before starting a new send.",
    tone: "info",
  },
};

export function useIssueChatBinding(companyId: string, issueId: string) {
  const query = useQuery({
    queryKey: ["issue-chat-binding", companyId, issueId],
    queryFn: () => chatEndpointsApi.getIssueBinding(issueId),
    enabled: Boolean(companyId && issueId),
  });
  return { binding: query.data ?? null, isLoading: query.isLoading };
}

type ConnectedTaskProps = {
  attachments?: IssueAttachment[];
  companyId: string;
  issueId: string;
  issueCacheRefs?: string[];
};

export function ExternallyConnectedTaskBanner(props: ConnectedTaskProps) {
  const { binding } = useIssueChatBinding(props.companyId, props.issueId);
  if (!binding) return null;
  return (
    <ConnectedTaskComposer
      key={boardSendDraftKey(
        props.companyId,
        props.issueId,
        binding.endpointId,
        binding.conversationId,
      )}
      {...props}
      binding={binding}
    />
  );
}

function ConnectedTaskComposer({
  attachments = [],
  companyId,
  issueId,
  issueCacheRefs,
  binding,
}: ConnectedTaskProps & { binding: ExternalChannelBindingSummary }) {
  const { pushToast } = useToast();
  const queryClient = useQueryClient();
  const [composing, setComposing] = useState(false);
  const [body, setBody] = useState("");
  const [selectedAttachmentIds, setSelectedAttachmentIds] = useState<string[]>(
    [],
  );
  const [publication, setPublication] = useState<ChatPublicationSummary | null>(
    null,
  );
  const idempotencyKey = useRef<string | null>(null);
  const retainedSend = useRef<RetainedBoardSend | null>(null);
  const retainedScopeKey = useRef<string | null>(null);
  const [unconfirmedRequest, setUnconfirmedRequest] = useState(false);
  const [storageError, setStorageError] = useState<string | null>(null);
  const storageKey = binding
    ? boardSendDraftKey(
        companyId,
        issueId,
        binding.endpointId,
        binding.conversationId,
      )
    : null;
  const loadedStorageKey = useRef<string | null>(null);
  useEffect(() => {
    if (!storageKey || loadedStorageKey.current === storageKey) return;
    loadedStorageKey.current = storageKey;
    try {
      const saved = readBoardSendDraft(storageKey);
      retainedScopeKey.current = storageKey;
      retainedSend.current = saved;
      idempotencyKey.current = saved?.idempotencyKey ?? null;
      setBody(saved?.body ?? "");
      setSelectedAttachmentIds(saved?.attachmentIds ?? []);
      setPublication(saved?.publication ?? null);
      setUnconfirmedRequest(Boolean(saved && !saved.publication));
      setComposing(Boolean(saved));
      setStorageError(null);
    } catch {
      setStorageError(
        "Saved delivery identity could not be read. Check Activity and restore browser storage before starting another send.",
      );
      setComposing(true);
    }
  }, [storageKey]);
  const deliveryScopeReady = Boolean(
    storageKey &&
    loadedStorageKey.current === storageKey &&
    retainedScopeKey.current === storageKey,
  );
  const invalidateTask = useCallback(() => {
    for (const ref of new Set([issueId, ...(issueCacheRefs ?? [])])) {
      for (const queryKey of [
        queryKeys.issues.comments(ref),
        queryKeys.issues.attachments(ref),
        queryKeys.issues.detail(ref),
        queryKeys.issues.activity(ref),
      ]) {
        void queryClient.invalidateQueries({ queryKey });
      }
    }
  }, [issueId, issueCacheRefs, queryClient]);
  const finishPublication = useCallback(() => {
    if (storageKey) {
      try {
        clearBoardSendDraft(storageKey);
      } catch {
        /* The retained anchor remains safe to recheck after reload. */
      }
    }
    retainedSend.current = null;
    setUnconfirmedRequest(false);
    setPublication(null);
    idempotencyKey.current = null;
    setBody("");
    setSelectedAttachmentIds([]);
    setComposing(false);
    invalidateTask();
    pushToast(publicationFeedback.published);
  }, [invalidateTask, pushToast, storageKey]);
  // Keep the first returned ID as the anchor. A batch's blocking row may
  // change as text and files finish; no read is allowed to submit another send.
  const publicationStatus = useQuery({
    queryKey: [
      "chat-publication-batch",
      companyId,
      binding?.endpointId,
      binding?.conversationId,
      publication?.id,
    ],
    queryFn: () =>
      chatEndpointsApi.getPublicationBatchStatus(
        binding!.endpointId,
        binding!.conversationId,
        publication!.id,
      ),
    enabled: deliveryScopeReady && Boolean(publication),
    staleTime: 0,
    refetchInterval: 2_000,
    refetchIntervalInBackground: false,
    retry: false,
  });
  useEffect(() => {
    const batch = publicationStatus.data;
    if (
      publication &&
      batch &&
      batch.total > 0 &&
      batch.published === batch.total &&
      batch.publication.state === "published"
    ) {
      finishPublication();
    }
  }, [publication, publicationStatus.data, finishPublication]);
  const publish = useMutation({
    mutationFn: (input: {
      attachmentIds: string[];
      body: string;
      idempotencyKey: string;
      endpointId: string;
      conversationId: string;
    }) =>
      chatEndpointsApi.publishBoardMessage(
        input.endpointId,
        input.conversationId,
        input.body,
        input.idempotencyKey,
        input.attachmentIds,
      ),
    onSuccess: (result) => {
      invalidateTask();
      const feedback = publicationFeedback[result.state];
      setPublication(result.state === "published" ? null : result);
      if (result.state === "published") {
        finishPublication();
        return;
      }
      setUnconfirmedRequest(false);
      if (storageKey && retainedSend.current) {
        retainedSend.current = {
          ...retainedSend.current,
          publication: {
            id: result.id,
            state: result.state,
            attempts: result.attempts,
          },
        };
        try {
          writeBoardSendDraft(storageKey, retainedSend.current);
        } catch {
          // The pre-POST payload/key is already persisted. It remains a safe,
          // explicit same-request retry when the publication ID cannot be saved.
        }
      }
      pushToast({
        ...feedback,
        action: {
          label: "View activity",
          href: `/apps/chat/${binding!.endpointId}/activity`,
        },
      });
    },
    onError: (error) =>
      pushToast({
        title: "Couldn't confirm channel delivery",
        body:
          error instanceof Error
            ? `${error.message} Your draft is kept; retrying here reuses the same request identity.`
            : "Your draft is kept; retrying here reuses the same request identity.",
        tone: "error",
      }),
  });
  const selectableAttachments = attachments.filter(
    (attachment) => attachment.issueCommentId === null,
  );
  const currentPublication = publicationStatus.data?.publication ?? publication;
  const currentFeedback = currentPublication
    ? publicationFeedback[currentPublication.state]
    : null;
  const activityPath = `/apps/chat/${binding.endpointId}/activity`;
  return (
    <div className="space-y-3 rounded-lg border border-border bg-muted/40 p-3 text-sm">
      <div className="flex flex-wrap items-center gap-3">
        <Radio className="h-4 w-4 shrink-0 text-muted-foreground" />
        <div className="min-w-0 flex-1">
          <p className="font-medium">
            Connected to {providerNames[binding.provider]}
          </p>
          <p className="truncate text-xs text-muted-foreground">
            {binding.externalLabel} · Agent assignment is fixed for this
            external task.
          </p>
        </div>
        {binding.externalUrl && (
          <Button asChild size="sm" variant="outline">
            <a href={binding.externalUrl} target="_blank" rel="noreferrer">
              Open {providerNames[binding.provider]} <ExternalLink />
            </a>
          </Button>
        )}
        <Button
          size="sm"
          variant="outline"
          onClick={() => setComposing((value) => !value)}
        >
          Send to channel
        </Button>
        <Button asChild size="sm" variant="ghost">
          <Link to={`/apps/chat/${binding.endpointId}/conversations`}>
            Connection
          </Link>
        </Button>
      </div>
      {composing && (
        <div className="space-y-2 border-t border-border pt-3">
          <label
            className="text-xs font-medium"
            htmlFor="external-board-update"
          >
            Board update
          </label>
          <Textarea
            id="external-board-update"
            value={body}
            disabled={
              Boolean(publication) ||
              publish.isError ||
              unconfirmedRequest ||
              Boolean(storageError) ||
              !deliveryScopeReady
            }
            onChange={(event) => {
              setBody(event.target.value);
              idempotencyKey.current = null;
              publish.reset();
            }}
            placeholder="Write only what should be visible in the provider conversation."
          />
          {selectableAttachments.length > 0 && (
            <fieldset
              className="space-y-2 rounded-md border border-border bg-background p-3"
              disabled={
                Boolean(publication) ||
                publish.isError ||
                unconfirmedRequest ||
                Boolean(storageError) ||
                !deliveryScopeReady
              }
            >
              <legend className="px-1 text-xs font-medium">
                Include task files
              </legend>
              <p className="text-xs text-muted-foreground">
                {binding.provider === "github"
                  ? "GitHub Apps cannot upload file bytes in comments. Checked files stay on the Paperclip task; GitHub receives an authenticated task link when this Board has a public URL, or a private-task notice otherwise."
                  : "Only checked files will be published to the external conversation."}
              </p>
              <div className="space-y-2">
                {selectableAttachments.map((attachment) => {
                  const label =
                    attachment.originalFilename ?? "Unnamed attachment";
                  return (
                    <label
                      className="flex items-center gap-2 text-xs"
                      key={attachment.id}
                    >
                      <Checkbox
                        checked={selectedAttachmentIds.includes(attachment.id)}
                        onCheckedChange={(checked) => {
                          setSelectedAttachmentIds((current) =>
                            checked === true
                              ? [...current, attachment.id]
                              : current.filter((id) => id !== attachment.id),
                          );
                          idempotencyKey.current = null;
                          publish.reset();
                        }}
                      />
                      <Paperclip className="h-3.5 w-3.5 text-muted-foreground" />
                      <span className="truncate">{label}</span>
                    </label>
                  );
                })}
              </div>
            </fieldset>
          )}
          {storageError && (
            <p role="alert" className="text-xs text-destructive">
              {storageError}
            </p>
          )}
          {(publish.isError || unconfirmedRequest) && !publication && (
            <div
              role="alert"
              className="space-y-1 rounded-md border border-border bg-background p-3 text-xs"
            >
              <p className="font-medium">Delivery result not confirmed</p>
              <p className="text-muted-foreground">
                Your exact draft and request identity are kept. Retry safely to
                learn the authoritative publication state without creating a
                duplicate.
              </p>
              <Link
                className="inline-block font-medium underline underline-offset-4"
                to={activityPath}
              >
                Open Activity
              </Link>
            </div>
          )}
          {publication && currentPublication && currentFeedback && (
            <div
              role={
                currentPublication.state === "failed" ||
                currentPublication.state === "delivery_unknown"
                  ? "alert"
                  : "status"
              }
              className="space-y-1 rounded-md border border-border bg-background p-3 text-xs"
            >
              <p className="font-medium">{currentFeedback.title}</p>
              <p className="text-muted-foreground">{currentFeedback.body}</p>
              {publicationStatus.data && (
                <p className="text-muted-foreground">
                  {publicationStatus.data.published} of{" "}
                  {publicationStatus.data.total} parts published.
                </p>
              )}
              {publicationStatus.isError && (
                <p role="alert" className="text-muted-foreground">
                  Delivery status could not be refreshed. Your draft is kept;
                  Paperclip will check again without sending another update.
                </p>
              )}
              {currentPublication.redactedError && (
                <p className="text-muted-foreground">
                  Provider detail: {currentPublication.redactedError}
                </p>
              )}
              <Link
                className="inline-block font-medium underline underline-offset-4"
                to={activityPath}
              >
                Open Activity
              </Link>
              {currentPublication.state === "cancelled" && (
                <Button
                  className="ml-3"
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    if (storageKey) {
                      try {
                        clearBoardSendDraft(storageKey);
                      } catch {
                        setStorageError(
                          "Saved delivery identity could not be cleared. Restore browser storage before starting another send.",
                        );
                        return;
                      }
                    }
                    retainedSend.current = null;
                    setUnconfirmedRequest(false);
                    setPublication(null);
                    setSelectedAttachmentIds([]);
                    idempotencyKey.current = null;
                    publish.reset();
                  }}
                >
                  Start a new send
                </Button>
              )}
            </div>
          )}
          <div className="flex items-center justify-between gap-3">
            <p className="text-xs text-muted-foreground">
              Ordinary board comments remain Paperclip-only.
            </p>
            <Button
              size="sm"
              disabled={
                !body.trim() ||
                publish.isPending ||
                Boolean(publication) ||
                Boolean(storageError) ||
                !deliveryScopeReady
              }
              onClick={() => {
                if (
                  !storageKey ||
                  loadedStorageKey.current !== storageKey ||
                  retainedScopeKey.current !== storageKey
                )
                  return;
                idempotencyKey.current ??= crypto.randomUUID();
                const input = retainedSend.current ?? {
                  attachmentIds: selectedAttachmentIds,
                  body: body.trim(),
                  idempotencyKey: idempotencyKey.current,
                  publication: null,
                };
                try {
                  if (!storageKey) throw new Error("Missing delivery scope");
                  writeBoardSendDraft(storageKey, input);
                } catch {
                  setStorageError(
                    "Browser storage could not preserve this delivery identity. No update was sent. Restore browser storage, then reload to try again.",
                  );
                  return;
                }
                retainedSend.current = input;
                setUnconfirmedRequest(true);
                publish.mutate({
                  ...input,
                  endpointId: binding.endpointId,
                  conversationId: binding.conversationId,
                });
              }}
            >
              {publish.isPending
                ? "Sending…"
                : publish.isError || unconfirmedRequest
                  ? "Retry safely"
                  : "Send to channel"}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
