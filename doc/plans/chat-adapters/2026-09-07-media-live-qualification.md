# Images and files — live qualification, September 7, 2026

This is an incremental evidence log, not a blanket production-readiness claim.
Live provider actions use the signed-in in-app browser. The isolated Paperclip
instance is on loopback port 3103; only verified webhooks are publicly routed.

## Reproduced user failure

Discord CHA-4 run `9b90ddaa-6d82-4685-84b1-9483c30de346` generated and uploaded a
2,111,878-byte PNG. Artifact `43104a30-4ae5-4078-a880-68c9f9720318` pointed to
attachment `7abdf671-1eb2-402a-8417-274b048c39ed`, but the attachment had no comment
binding. The run's final publication contained no attachment IDs. The bot's claim
that the image was shown was false. Both the npm CLI attempt and a workspace-local
CLI fallback failed. The image itself was intact in Paperclip storage.

The audit also found a second path: a successfully bound, during-run attachment
could remain internal when a different final presentation comment was published.
An explicit same-run attachment handoff and a bundled API-based artifact helper
now pass the normal live workflow below. Independent review additionally hardened
immutable upload provenance, the per-turn file cap, and helper retries.

## Native transport checks

One known, non-sensitive orange-cat PNG and a 128-byte text fixture were uploaded
through Paperclip's Board attachment API and explicitly sent to each existing QA
conversation. This isolates native transport from agent-generation/handoff logic;
it does **not** prove the agent handoff fix.

| Provider | Observed outcome |
| --- | --- |
| Discord | Cat rendered in the native media viewer; text file rendered with its exact contents. Image message `1546531868575535114`; file message `1546531871523995698`, in thread `1546513811672932372`. |
| Slack | Bot image loaded at 1024×1024 and text file preview contained the exact fixture contents in the existing CHA-6 thread. |
| Telegram | Bot image loaded at 800×800; document message `417200359:11` downloaded through the actual UI. The downloaded 128-byte file matched the source SHA-256 exactly. |
| GitHub | App comment transport is link-only for attachments; direct upload is not qualified. Live Board file send published a caption and one explicit private-task notice per selected file, starting with comment `5572594232`. No file bytes or loopback URLs were exposed. The generic `Shared filename` preface was still misleading and is being made neutral. |
| Teams | No live media claim: Microsoft 365 tenant/admin setup remains unavailable. |

Text fixture SHA-256:
`fd40030afb62b83181a2a46dde8220e8defecfa0b4328e380c30b1899ccdce24`.
Telegram's browser download event timed out, but the host download appeared in
Downloads at 09:46:27 local time and its size/hash verified successfully. This was
a browser event-observation limitation, not a failed file delivery.

## Inbound inspection checks

Files were uploaded through each provider's real message composer. The bot was
asked to inspect actual bytes, not infer content from filenames.

- Slack: run `10aa0f41-0cc3-4997-95b4-f50eb1e033e8` succeeded, identifying the orange
  tabby/green eyes and reading `cobalt otter 47.`. Both stored attachments were
  bound to inbound comment `cfb14fe0-f463-4952-9cf9-2acdc32997b2`. Final bot message
  `1788792053.513999` is in root thread `1788789960.341109` in `C0BUT55N9RV`.
  The run took about 135 seconds; this remains a usability concern.
- Telegram photo: run `03f06e17-a0e5-43e5-a894-0cea68566aa3` identified the cat,
  eyes/nose, sofa, plant and window from the inbound JPEG. Final message
  `417200359:6`; about 132 seconds.
- Telegram document: a follow-up sent while the image run was active queued and
  then ran as `41215211-debf-44cc-9b93-a220fd0931de`. It returned the exact phrase
  in `417200359:8`; about 81 seconds after execution began. The two messages stayed
  on CHA-8 and produced separate, correctly ordered responses.
- GitHub private issue upload: native UI produced an HTML image plus a Markdown
  text-file link. Human comment `5572301393`, bot `5572302077`, run
  `0c252a02-51cc-4aeb-b829-73865415070e`. The bot did not claim to inspect unavailable
  bytes, but described the active chat connection as unavailable and requested
  a separate tool connection. This is **not** a successful inbound media check;
  chat transport must explain its file/link limitations clearly.
- Discord: run `888e586d-b62e-454c-bb77-d4d0c14ea245` inspected both inbound files,
  identified the cat/green eyes/sofa/plant, and read the exact phrase. Final bot
  message `1546532360630177873`, about 146 seconds after execution began.

## Normal agent handoff retake

After restarting the local server with the handoff fix at 14:56:49 UTC, each
existing provider conversation received an ordinary request to return the cat
and create a text file with a provider-specific exact marker. The requests did
not tell Maya which tool or helper command to use. All three stayed on their
existing task, succeeded, and published both selected attachments.

| Provider | Run and real-provider proof |
| --- | --- |
| Discord | Run `448779d2-73a3-4f39-9f75-0c9fdac528d0`, 14:57:10–15:02:43 UTC. Native image message `1546536207448547401` loaded; native file `1546536210195808318` previewed exactly `DISCORD-FILE-HANDOFF-0907-OK`. |
| Slack | Run `d4b00e25-a2b6-49bd-9442-384419c88776`, 14:57:17–15:02:00 UTC. Both native files appeared in CHA-6's original thread; the image loaded at 1024×1024 and the file preview showed `SLACK-FILE-HANDOFF-0907-OK`. |
| Telegram | Run `949a2b1a-5f6c-4680-971c-cceb244be8a5`, 14:57:23–15:02:24 UTC. Image `417200359:14` loaded at 800×800. Document `417200359:15` downloaded through Telegram's real UI; its 29 bytes were exactly `TELEGRAM-FILE-HANDOFF-0907-OK`, without a trailing newline. |

The Telegram download SHA-256 was
`a0692bcddade1e6e9e1a15ee975c2c2d501be8bdc34c5e1cbe84b3de4e7b2f7f`.
Paperclip's outbox independently showed all six attachment publications as
`published`, one image and one file per provider, with no duplicate file sends.
The final prose said the files were **prepared**, not falsely provider-confirmed.

This repairs the reported missing-image failure, but the 283–333 second agent
turns are too slow for a polished simple file reply. The Discord run made 28
completed/failed tool calls, including avoidable connection discovery. The task
prompt now explicitly directs external file replies to the installed artifact
helper and away from provider-tool discovery or fetching a CLI. That latency
improvement still needs a separate live measurement; native delivery success
does not prove the interaction is fast enough.

The Paperclip task transcript also passed a live UI check: inbound images and
files appeared even when the comment had no Markdown reference, the image opened
in the gallery at full size, and the text-file link opened its exact content.

## Implemented hardening

- Render provider-bound comment images/files in the task transcript, even when
  its caption contains no Markdown attachment reference.
- Include bounded, task/comment-scoped attachment descriptors in wake context so
  agents can discover and download the files without searching the whole task.
- Carry only explicitly selected same-agent/same-run attachments into final chat
  delivery. Never infer authorization from an unbound artifact alone.
- Explain GitHub's link-only behavior before an explicit Board file send and in
  the provider fallback. Do not expose loopback URLs or publish private files to
  an unrelated public upload service.
- Record immutable originating-run attribution on upload; never derive authority
  from editable work-product records or backfill ambiguous legacy files.
- Serialize both comment binding and direct-to-comment uploads. Reject a
  twenty-first chat file with an actionable error rather than silently dropping
  one; preserve ordinary non-chat multi-comment uploads.
- Recover matching uploads using immutable origin and exact content hash. Local
  concurrent helpers serialize; ambiguous network/408/5xx/malformed-success
  outcomes fail closed until the durable attachment is found or an operator
  explicitly accepts duplicate risk. This is not cross-host exactly-once upload.
- Post a single generation-fenced notice after a definite supported-provider
  file rejection, without replaying an ambiguously delivered file.

## Automated checkpoint before upstream reconciliation

- Fresh database chat integration: **262/262**, no skips.
- Focused server provider/projection/attachment tests: **313/313**.
- Executable artifact helper retry/concurrency tests: **18/18**.
- Focused UI tests: **120/120**; deterministic provider browser flows: **5/5**.
- Recovery/status/context checkpoint: **153/153**, using an explicit fresh
  PostgreSQL database instead of silently skipping unsupported embedded tests.
- Attachment wake-context scope/quarantine database checks: **6/6**, no skips.
- Migration snapshot drift: **1/1**. Workspace typecheck, workspace build, and
  UI token gates passed. These build checks precede the final provenance edits;
  final targeted compile is repeated before handoff.

The broad workspace test run is separate and is not claimed green here.

GitHub's [issue-comment REST API](https://docs.github.com/en/rest/issues/comments#create-an-issue-comment)
accepts a comment body, unlike the browser's separate
[file attachment workflow](https://docs.github.com/en/get-started/writing-on-github/working-with-advanced-formatting/attaching-files).
The shipped adapter's link-only behavior is a scoped product limitation; it is
not evidence that every possible GitHub integration can never transfer files.
