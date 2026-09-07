# Native chat live reach audit — 2026-09-07

## Scope

Server `074271e3fc4c2419c8894b7a564916ff54b90e32`, isolated Board
`http://127.0.0.1:3103`, company Chat Adapter E2E. Maya E2E remains
`paperclip_runner`, provider `codex`, model `gpt-5.6-luna`. The server's startup
recovery was ready before this exercise. Slack, GitHub, Discord, and Telegram
were active; Teams was not configured.

This is a live negative reach test, not a new model-response benchmark. The
Codex account was already returning `usageLimitExceeded`. No model-starting
prompts were sent while destinations were enabled, and no historical failed
run was rewritten or replayed to manufacture a successful result.

## Journey

Starting from Connectors → Browse → Manage, the linked Board operator disabled
only the existing authorized test destination in Settings, sent one message in
the provider's existing test conversation through the signed-in in-app browser,
and inspected Paperclip Activity and the provider. Returning to Settings proved
the disabled state persisted; the original setting was then restored.

| Provider | Disabled setting                         | Send time (UTC) | Observed result                                                                                                                           |
| -------- | ---------------------------------------- | --------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| Slack    | `#pc-chat-live-0905b`                    | 17:56:10.018    | Activity: filtered, “Destination is not enabled in Paperclip”; no reaction/reply                                                          |
| GitHub   | `cryppadotta/paperclip-chat-e2e-enabled` | 18:01:08.615    | Saved comment persisted after reload; signed webhook acknowledged at 18:01:10; content rejected before durable ingress; no reaction/reply |
| Discord  | Clawd `#general`                         | 18:02:53.827    | Activity: filtered, same destination explanation; no reaction/reply                                                                       |
| Telegram | Allow direct messages                    | 18:03:55.816    | Activity: filtered, same destination explanation; no reply                                                                                |

Provider markers were `SLACK-REACH-DISABLED-0907-1256`,
`GITHUB-REACH-DISABLED-0907-1301`, `DISCORD-REACH-DISABLED-0907-1304`, and
`TELEGRAM-REACH-DISABLED-0907-1305`. The suffix is a unique test label, not a
precise send-time claim. GitHub's comment is
[issuecomment-5574211696](https://github.com/cryppadotta/paperclip-chat-e2e-enabled/issues/2#issuecomment-5574211696).

## Durable cross-checks

| Provider | Delivery ID                            | Received → processed (UTC)  | Normalized event retains marker? |
| -------- | -------------------------------------- | --------------------------- | -------------------------------- |
| Slack    | `e80087f8-7a49-44bf-8ad0-cd45aa670fc1` | 17:56:10.579 → 17:56:11.340 | No                               |
| Discord  | `3d520054-5e5b-4d40-b094-db0c51eba189` | 18:02:54.057 → 18:02:54.815 | No                               |
| Telegram | `9bb5dc04-9c17-4a8b-a458-306bbdd04d00` | 18:03:57.048 → 18:03:57.049 | No                               |

GitHub differs intentionally: `stageGitHubWebhookIngress` authenticates the
request, then checks repository enablement before storing the signed body.
There was no new ingress action or delivery row. Its unchanged Activity is
therefore not itself proof that a callback arrived; the server's HTTP 200 log,
persisted provider comment, disabled resource, and source-level admission gate
provide the cross-check. No raw webhook body was inspected or retained as
evidence.

From the 17:55:49.711 baseline through the final 18:05:41.790 read:

- Maya's total run count remained **86**.
- The company had **zero** new tasks, internal comments, or publications.
- All four endpoints were active, with direct-message settings restored true.
- Slack's original private test channel, Discord `#general`, and GitHub's
  `paperclip-chat-e2e-enabled` repository were restored enabled.
- GitHub's separate `paperclip-chat-e2e-disabled` repository stayed disabled;
  no other Discord channel was enabled.

## Experience findings

Functional outcome: existing-conversation reach revocation worked in these four
live cases. It did not wake the native agent, retain refused message text, or
publish externally. The provider test markers are intentionally retained in
the disposable test conversations.

Activity originally displayed only “Sep 7, 2026” for every event. During this
exercise it was impossible to distinguish same-day deliveries, queue updates,
and retries from their visible time. The follow-up UI change uses the shared
date-time formatter with seconds, semantic `time` elements, and the exact
server timestamp on hover. The updated Telegram Activity was visually checked
in the running Board: the rejected event reads “Sep 7, 2026, 1:03:57 PM” and the
list remains readable without clipping at the observed desktop viewport.

Supporting checks for that UI change: focused date formatting and chat UI
contracts **29/29**; deterministic five-provider browser suite **5/5**, including
second-level display and exact timestamp attributes; UI TypeScript and token
gates passed. The deterministic suite uses mocked chat-provider endpoints and
does not count as live provider or native model evidence.

This is only the negative, existing-conversation portion of runbook C2. A fresh
message after re-enabling, fresh-task admission, access races during active
model execution, and post-quota recovery are not qualified by this exercise.
The final-source multi-provider release gate remains open.

## Follow-up: inspectable GitHub rejection

The initial GitHub result above exposed a diagnostic gap: an operator could
not distinguish an authenticated but disabled destination from a missing
webhook. The follow-up backend change records a content-free, non-replayable
filtered Activity receipt for a known disabled repository after signature,
installation, and endpoint checks. The delivery ID is hashed; no comment text,
author, conversation, or webhook body is retained. Unknown repositories and
invalid signatures still do not create this receipt.

A new regression reproduced the missing receipt before the change. After the
fix, the full chat integration suite passed **265/265** on fresh database
`chat_adapters_test_20260907_latency_09`. The added case covers invalid
signatures, three concurrent identical deliveries producing one receipt,
metadata-only Activity, no agent wake or ingress action, and no replay when
the repository is re-enabled. Live retesting of this follow-up is pending;
the earlier four-provider reach result is not retroactively attributed to it.
