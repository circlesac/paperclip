# Native chat Board files and webhook recovery — 2026-09-07

## Environment and scope

Isolated Board `http://127.0.0.1:3103`, company Chat Adapter E2E, snapshot 10,
loaded server `2026.831.0+396.git.dde176bbc`. The branch HEAD was `66a68fee5`
(documentation-only after the running implementation). Maya E2E remained
`paperclip_runner` → `codex` → `gpt-5.6-luna`.

These are real signed-in in-app browser checks against the configured Slack,
GitHub, Discord, and Telegram sandboxes. They deliberately start no model turns:
the Codex account limit still prevents additional native model qualification.
They do not qualify Teams, which still needs an eligible tenant/admin setup.

## Bounded webhook outage

Paused only the owned webhook proxy process with `SIGSTOP` at
**19:23:33.168 UTC**. A separate watchdog automatically sent `SIGCONT` after
45 seconds, at **19:24:18.173**. The Board server and Discord Gateway remained
running. The proxy was verified running afterward with the same PID and command.

Added then removed our thumbs-up on the existing admitted Slack message and the
completed generation-5 Telegram reply. No provider message, task, bot reaction,
credential, callback URL, or endpoint reach setting was changed.

| Provider | Event  | Browser action UTC | Received → processed UTC    | Delivery ID                            |
| -------- | ------ | ------------------ | --------------------------- | -------------------------------------- |
| Slack    | Add    | 19:23:39.001       | 19:24:18.420 → 19:24:18.426 | `4453aff3-e004-442b-a340-af44b4e0037f` |
| Slack    | Remove | 19:23:42.874       | 19:24:18.419 → 19:24:18.424 | `dd006230-f1c1-4195-86b8-3a5a0f364ed9` |
| Telegram | Add    | 19:23:39.333       | 19:24:18.191 → 19:24:18.197 | `e26e155f-e14f-4fa5-85b1-a291a997df91` |
| Telegram | Remove | 19:23:48.281       | 19:24:18.341 → 19:24:18.343 | `2cdc0a84-d8ef-4f85-99df-7d184192c07a` |

During the pause, at **19:23:57.284**, the proxy was stopped and there were zero
new delivery rows. All four events were subsequently processed with null error.
At the later check after **19:29 UTC**, there were still exactly four rows, not
late duplicate receipts. Counts before any Board sends remained **86 Maya runs,
17 tasks, 216 comments, 200 publications**.

Telegram's already-mounted Activity automatically showed the recovered pair,
and the rows were visually inspected. Slack retried **remove before add**.
Current Activity is a receipt/processing history, not provider occurrence
chronology; it does not persist an occurrence timestamp or reconstruct reaction
state. These events do not wake an agent or change task authority. This proves
loss-free recovery for this bounded reaction outage, not ordered Slack replay,
an exhaustive retry window, or a live Discord Gateway interruption.

This check did not reconfigure Telegram's webhook URL. The separate historical
URL-changing reconnect/backlog proof is recorded in the
[Telegram result](./2026-09-05-telegram-live-qualification-result.md).

## Explicit Board file sends

Prepared fixtures through the real Board attachment API, not direct database
inserts. Each existing linked task received three unbound files: a selected
128-byte text document, a selected 2,111,878-byte PNG of the previously used cat,
and an unchecked `internal-only.txt`. File prefixes were
`board-qa-1930-{provider}-`.

- Document SHA-256: `fd40030afb62b83181a2a46dde8220e8defecfa0b4328e380c30b1899ccdce24`.
- PNG SHA-256: `7693966f6c2b4aaebf9e46359f715fdaede021346bcd926078bb331b1dddc3c1`.

Started from Telegram connector Activity → Conversations → Open task. Used the
actual **Send to channel** composer, selected only the named document and PNG,
and explicitly identified the message as a transport test requiring no reply.
Continued to the existing Slack, Discord, and GitHub tasks and repeated the same
UI action. The unrelated pre-existing Discord attachment stayed unchecked.

| Provider | Board click UTC | All three publications confirmed UTC | Canonical Board comment                |
| -------- | --------------- | ------------------------------------ | -------------------------------------- |
| Telegram | 19:28:53.440    | 19:28:56.199                         | `2ee161b6-3fda-4ff7-b23b-c8f19c2fd087` |
| Slack    | 19:29:18.770    | 19:29:20.468                         | `efc7dd3c-9c7a-46c7-b026-aadb7e3402c2` |
| Discord  | 19:29:38.549    | 19:29:40.179                         | `e32c0140-c16d-43f1-838d-c657f2891bd9` |
| GitHub   | 19:30:44.104    | 19:30:46.196                         | `45cacf74-dc9a-4d0a-abd9-dfef3ce3d73b` |

Slack and Discord visibly rendered the document's `cobalt otter 47` verification
phrase and the cat image. Slack's full image viewer was opened and inspected.
Telegram visibly rendered a 128-byte document card and the cat photo. This
batch does not claim a downloaded-byte checksum of the provider copies.

GitHub visibly posted the Board text and two honest private-task file notices;
it did not claim to upload bytes or expose a private Board URL. The selected
files were available on the Paperclip task after reopening it. GitHub's App
transport limitation remains explicit, not a passed native image-upload claim.

Each send produced exactly one canonical comment and three ordered published
rows with provider message IDs and null errors. All eight selected attachments
were bound to their respective comment. All four unchecked fixture files stayed
unbound and had no publication. Counts became **86 Maya runs, 17 tasks,
220 comments, 212 publications**. No additional model run or task was created.

## Experience findings still requiring a fix/retest

The provider-side outcomes above passed, but the Board experience needs work:

1. Slack's send returned **Publishing to channel** with a retained disabled
   draft even though all three rows subsequently published. The component keeps
   that returned state without an authoritative refresh. This visit navigated
   away before measuring an indefinite stale state; a deterministic regression
   must establish and fix that terminal-refresh gap without replaying the send.
2. On GitHub's canonical `CHA-2` task route, the newly sent comment/files did not
   appear in the mounted timeline after completion. Reopening the task showed
   them. The banner invalidates UUID-keyed queries while the page can use an
   issue-identifier key. The same useful outcome must become visible without a
   reload.

An independent code audit also found outbound file hydration lacks a bounded
storage read and persisted SHA-256 verification. That is failure-injection work,
not a corruption observed in these successful live sends. Fixes and supporting
tests are being handled separately; none is qualified by the preceding baseline.

## Follow-up implementation and deterministic verification

The outbound reader now checks the persisted SHA-256 and exact byte length,
bounds storage acquisition and streaming to ten seconds each, and destroys a
stream returned after timeout. Task/comment scope and metadata validation run
before storage access. Invalid metadata fails definitively; storage/query/read
failures remain safe pre-provider retries under the existing five-attempt limit.
An accepted provider send with an uncertain durable result still becomes
`delivery_unknown`, never an automatic retry.

The Board composer now uses a scoped read-only batch-status endpoint. It waits
for every text/file part, observes explicit Activity resolution, and refreshes
both UUID and canonical-identifier task caches. Its exact submitted payload,
selected files, and idempotency key are stored before POST in session-scoped
browser storage. Reload resumes a known anchor through GET only; a lost response
restores a locked draft with an explicit same-key **Retry safely** action.
Storage failure before submission prevents an untracked send. State and late
responses are isolated by company, task, endpoint, and conversation. This is
reload/navigation continuity within that browser session, not a cross-device
draft synchronization claim.

Verification before restarting the live server:

- Fresh PostgreSQL integration: **269/269**, database
  `chat_adapters_test_20260907_latency_17` (78.12 seconds).
- Focused UI/API/OpenAPI/draft tests: **43/43**; separate hydration/API/OpenAPI
  subset: **17/17**, including four bounded-read/integrity unit cases.
- Five-provider browser file plus Board regressions: **9/9**; clean final Board
  subset after scope hardening: **4/4** (39.9 seconds).
- Shared/server/UI typechecks, UI token gates, and diff checks passed.
- The lockfile was unchanged; no broad workspace-test pass is claimed.

The previous DB14 run passed 268 cases before the final pretransport guard
expansion. DB15 exposed metadata validation being masked by missing storage;
the guard ordering was corrected, not the expected security result weakened.
That run also exposed leaked retry work in a projection-only test fixture. The
fixture now retires its exact staged publication and shuts down its service;
new hydration tests shut down in `finally`. DB16 passed the new cases but found
a timing assumption in a GitHub lease test: a nonblocking HTTP response can
precede the worker claim. The test now waits for the same required `processing`
state while the lease is held. DB17 is the clean combined result above.

An early full browser run overlapped development hot reload and missed one
success toast; the final clean runs supersede it. The initial red browser test
also established that the old component made zero status GETs for eight seconds
and kept the completed send disabled.

The updated-backend live retest below is separate from these deterministic
results. A further code audit found synthetic Slack file-share message IDs;
reaction matching on uploaded Slack files is not yet qualified.

## Updated-backend live retest

Restarted only the isolated Board server as snapshot 11. Health reported loaded
`2026.831.0+399.git.43b63da40`, process start **19:52:33.594 UTC**, startup recovery
ready, and the Discord Gateway connected. Maya's safe configuration fields were
rechecked: `paperclip_runner`, provider `codex`, model `gpt-5.6-luna`. The stored
reasoning-effort setting is `low`, but the current native input contract does
not propagate that legacy field, as documented in the native-runner report.
The following checks do not invoke the model.

### Slack: paused queue, reload, and automatic completion

Used the connector Activity **Pause** control, then the canonical `CHA-6` task's
**Send to channel** UI. Selected only `board-queue-retest-note.txt` and
`board-queue-retest-cat.png`; the previous internal-only fixture stayed unchecked.
Clicked Send at **19:53:07.191 UTC** with marker `BOARD-QUEUE-RELOAD-1954`.

The mounted timeline immediately showed exactly one Board comment and both
attachments. The composer truthfully showed **Queued for channel**, **0 of 3
parts published**, and a locked draft. Reloading preserved that exact draft and
status. A database check while still paused confirmed one comment and three
pending rows, not a duplicate submission:

- Comment: `9e461b1e-ccc9-478b-9799-5fce4c6d96b1`.
- Publications: `85a6121d-4554-4c52-89ad-7725b0603329`,
  `acb97e67-a44a-439b-8828-ad2ab4c95114`, and
  `ecc5e90f-d5cb-4fcd-b8be-3dda7ffe84f9`.

Clicked **Resume** at **19:53:35.884**. Text published at **19:53:38.067**, document
at **19:53:38.560**, and image at **19:53:39.154**, all with null errors. By the
next UI observation at **19:53:42.451**, the same mounted task had automatically
closed the draft and re-enabled Send. Slack's actual thread visibly contained
the marker text, the document preview with `cobalt otter 47`, and the cat image.
There was still one canonical comment. Slack was left active.

One remaining experience defect was observed and assigned for correction: once
the selected attachments bind to the new comment, they disappear from the
pending selection list, leaving only the unchecked internal-only file visible.
Although the timeline and three-part status are correct, the composer should
continue showing the exact locked selected filenames through reload.

### Discord, Telegram, and GitHub on the same backend

Uploaded two new unbound fixtures per provider using the Board attachment API,
then selected them through each canonical task's actual Send composer. Markers
were `BOARD-NEW-BACKEND-{PROVIDER}`. Unrelated and internal-only files stayed
unchecked. No agent reply was requested.

| Provider | Board click UTC | All three parts published UTC | Canonical comment |
| --- | --- | --- | --- |
| Discord | 19:54:40.669 | 19:54:46.478 | `0cbe837f-b48c-42dc-b36f-f2bc7c901ec2` |
| Telegram | 19:55:11.630 | 19:55:14.991 | `57639d0a-4c3e-4b2b-80c8-e36c5311fdc6` |
| GitHub | 19:55:36.324 | 19:55:38.967 | `0b206e5a-4171-4fb8-b8af-773ad612f419` |

All nine rows were published with real provider message IDs and null errors.
Discord visibly rendered the text preview and cat; Telegram rendered its 128-byte
document card and cat photo. The composer closed automatically on each task.
GitHub posted the accurate private-file notices. Its already-mounted canonical
`CHA-2` timeline now showed the new comment and files without reopening; the cat
opened successfully in the private task's full image viewer.

Final counts were **86 Maya runs, 17 tasks, 224 comments, 224 publications**.
All four configured endpoints were active; all four previous internal-only
fixtures remained unbound. These checks establish successful transport and Board
recovery on the updated backend, not additional model qualification, a throughput
SLA, downloaded provider-byte checksums, or native GitHub file upload support.
