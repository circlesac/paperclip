# Chat adapters: upstream runner integration checkpoint

## Scope and provenance

The live qualification agent remains Paperclip Runner → Codex →
`gpt-5.6-luna`. The earlier real Slack, GitHub, Discord, and Telegram text
samples completed in 13.472–16.467 seconds from send to provider acknowledgement.
Those are historical samples, not measurements of the changes in this document.
Teams still has no qualified live tenant. Terra has not been substituted.

This checkpoint incorporates these code-only changes from the fetched
`origin/master` revision `d8b95805314c70b13d9efce338cbc287c2afb4e1`:

- `5bddff092041c1430d049ee2bb5f421df1957823`: guarded runner API fallback.
- `1cc45086d3b2f2710d4e161b0dc9ad1d3662a9a8`: operation-time execution identity.
- `d8b95805314c70b13d9efce338cbc287c2afb4e1`: recent-task ordering debounce.

The independent lockfile refresh
`392ab26b1ede1634b947d1d539926052c79a2636` is deliberately not included:
the repository owner explicitly prohibited editing `pnpm-lock.yaml`. Its SHA256
remains `313c6a80f077364abe06d237d518ba555ccaf03745f3504a1f7df36e7baf8040`.
These are code cherry-picks, not a claim that master ancestry or the frozen
dependency installation gate is reconciled. The previously observed
`ERR_PNPM_LOCKFILE_CONFIG_MISMATCH` remains an open release gate.

## Reconciled behavior

- Keep the API escape hatch disabled unless an operator explicitly enables it.
  Local file registration, current-wake reading, attachment listing and reuse,
  and the chat-specific direct-response policy remain available independently.
- Preserve mutation receipts, dispatch reauthorization, pre-replay checks,
  definite-precommit cleanup, and issue-before-run lock ordering.
- Preserve native file/workspace fingerprints and conversation checkpoints
  while rotating run-scoped GitHub authority between provider processes.
  Rotate when a credential is removed as well as when one is added or replaced;
  a warm provider process must not retain an earlier run's token.
- Keep generated webhook secrets and private identity-link capabilities out of
  generic API results and mutation receipts. Their existing Board checks also
  remain authoritative.
- Withhold raw GitHub credentials from low-trust execution, including personal
  sponsor and dedicated-agent accounts. A token does not enforce the guest's
  read-only tool boundary. Check current agent/project/task/run policies and
  reject quarantined, invalid, or missing task context before secret resolution.
  Taskless runs also recheck their current project policy. Malformed task identity
  is rejected before attempting a UUID database lookup.
- Persist a run's low-trust boundary at dispatch, before workspace setup or
  credential resolution, and intersect it with later policy checks. Relaxing a
  task, project, or agent afterward does not erase the running turn's restriction.
  Project trust remains effective even when isolated workspace selection is off.

Useful lifecycle, question, final-answer, image and file signals may reach the
provider. Native thinking/tool activity remains on the private Paperclip Board;
raw reasoning, internal logs and credentials are not broadcast to chat.

## Database compatibility

Master's canonical identity migrations retain slots 0240–0245. The ten existing
chat migrations move from 0240–0249 to 0246–0255, preserving every SQL byte and
SHA256, including historical migration names inside repair audit strings.
Drizzle generated all ten cumulative snapshots from staged historical schema
inputs; snapshots were not hand-merged.

Two independent PostgreSQL upgrade checks passed:

- A clone of the already-migrated chat test database had exactly six pending
  identity migrations. Its original 248 migration-history rows remained unchanged;
  six rows were added. Counts and full-row digests for nine chat, attachment and
  outbox tables remained unchanged. Reapplying migrations was a no-op.
- The committed regression test creates a fresh database, reconstructs the
  deployed pre-identity schema/history shape, and proves that existing chat SQL
  is not replayed. An ambiguous file publication remains unchanged and historical
  issues are not assigned invented execution identities.

Generation inputs, the original SQL, hashes, baseline, proof script and results
are retained locally under
`.paperclip-runtime/chat-adapters-live/migration-reconcile-20260907/`.
Those fixture checks did not mutate the live database. The later backed-up live
upgrade is recorded below.

## Verification recorded so far

All commands ran in the existing `codex/chat-adapters` worktree. Provider failures
and transport races in deterministic tests are simulated, not live-provider proof.

- Full chat integration: **282/282**, fresh PostgreSQL database
  `chat_adapters_test_20260907_upstream_identity_full_02`, rerun after the final
  dispatch trust-retention changes.
- Mocked browser qualification: **9/9**, including all five setup/detail flows
  and Board file-batch refresh after success, failure, unknown delivery and a lost
  HTTP response. It uses a throwaway local server, never a live provider login.
- Runner tool authority/API cohort: **890/890** before the additional five
  secret-link restriction cases; API/OpenAPI cohort with those cases: **852/852**.
  Final root rerun of eight authority/API/file-handoff/real-server suites:
  **891/891**, with no skips. A child rerun could not bind loopback sockets;
  the root rerun exercised the real HTTP suites successfully. These counts
  overlap and must not be summed as unique coverage.
- Final current-wake comment reader: **5/5** against fresh embedded PostgreSQL.
- Final combined heartbeat, issue routes, execution identity, GitHub broker and
  trust cohort: **208/208**. A narrower broker/identity/trust run passed **24/24**,
  including fourteen policy-source/personal-or-dedicated denial combinations,
  malformed references and taskless current-project tightening.
- Dispatch trust-retention and trust resolver: **13/13**, including seven new
  regressions that persist restrictions, remove current policies and confirm the
  real broker still denies personal and dedicated credential export.
- Native executor and runtime context: **153/153**, including all four warm
  credential transitions (absent/absent, absent/present, present/present,
  present/absent). These cohorts overlap; counts are not unique totals.
- UI chat contracts and recent-task behavior: **50/50**.
- Migration reconciliation, identity migration and final snapshot: **5/5**.
- Shared/server/UI and DB typechecks passed. DB numbering/safety and UI token
  gates passed. Runner TypeScript checks passed; locked Rust release build passed.
  Two focused Rust regressions passed, covering GitHub environment handling and
  launch rebinding.

Detailed command logs are under
`.paperclip-runtime/chat-adapters-live/upstream-*.log`.

## Deployed checkpoint

Code checkpoint `26b6df7c1` was committed and pushed to `codex/chat-adapters`.
The isolated live server was gracefully paused with no queued or running runs.
Before migration:

- Created a portable JavaScript-engine SQL backup in the ignored runtime
  directory. Restoring it into a new fixture preserved row counts, but did not
  reproduce every row digest. The inspected agent row differed in its
  sub-millisecond `created_at` precision; this backup is not recorded as exact.
- Created native PostgreSQL snapshot database
  `chat_adapters_live_pre_identity_20260907_01` while the application was stopped.
  All **198** table counts/full-row digests and all **248** original migration
  history rows matched the live database exactly. No existing database was
  overwritten. Both backup forms and the restore fixture are retained.
- Applied exactly the six identity migrations to the live database. All nine
  captured chat/attachment/outbox table digests stayed unchanged, the original
  history remained unchanged, the journal grew to **254**, and repeating the
  migration was a no-op.

Backup, baseline and verification artifacts are in
`.paperclip-runtime/chat-adapters-live/upstream-live-backup-20260907/`.
The guarded local `upstream-live-upgrade.ts` helper and its logs remain alongside
that directory. The portable-backup precision discrepancy was not patched as
part of this chat integration.

`pnpm --filter @paperclipai/server build` passed, including the full native runner
build, protocol/contract checks and binary staging. The package and vendored
runner binaries share SHA256
`f7c1273cce29e521e820ad947d657e500da28477f563053148e764cdfb3730cd`.
The restarted server reports `2026.831.0+413.git.26b6df7c1` at
`http://127.0.0.1:3103`; its log is `server-native-checkpoint-16.log`.
Maya remains `paperclip_runner`, provider `codex`, model `gpt-5.6-luna`.

The staged Rust-backed Codex transport suite passed **71/71** in
`upstream-runner-staged-driver-03.log`, including cold restoration with a changed
run binding. Two earlier full attempts each timed out in different tests while
macOS slept: the host power log records thermal/maintenance sleep overlapping
both runs, including a two-minute sleep during the second. A targeted rerun of
cold restoration and prompt process-exit handling also passed **2/2**. No timeout
was increased and no power/thermal protection was changed.

During that host sleep Discord's lease expired, its local listener stopped, and
a fresh listener connected after wake. A later read-only check found a valid
gateway lease, all four configured endpoints active and no queued/running runs.
The old detached Board tab could not attach; a fresh in-app catalog tab loaded
and showed Maya's Slack, GitHub, Discord and Telegram connections active. This
was a catalog-state check, not an interactive journey or visual-polish sign-off.

## Remaining qualification

The earlier 86/87 cohort against the old staged binary was not new-runtime
qualification; the rebuilt transport suite above closes its cold-restore gap.
The whole-workspace build and test suite have not been claimed green.

Live model qualification remains limited by the observed Codex capacity gate.
The in-app browser input outage also needs recovery, and Teams still requires a
work/school tenant and the necessary bot/admin setup. Real cross-person GitHub
push qualification needs two authorized users/accounts and a disposable repo.
New Slack delayed-upload receipt recovery, native overflow/history resend and
GitHub line-specific review replies still need the live passes described in the
existing qualification notes. This checkpoint is not a production-ready claim.

## Live Luna recheck after capacity returned (September 7, 22:42 CDT onward)

The capacity and browser-input gates above are historical: the account now
reports available Codex capacity and signed-in in-app browser input works again.
No usage reset was consumed, no credits were purchased, and no alternate model
was substituted. The server still reports `2026.831.0+413.git.26b6df7c1` during
these tests. All runs below use native `codex_app_server` with `gpt-5.6-luna`.

| Live journey                  | Observed outcome                                        | Native run                             | Submit to final provider acknowledgement |
| ----------------------------- | ------------------------------------------------------- | -------------------------------------- | ---------------------------------------- |
| New Slack root mention        | One task/thread; visible `SLACK-LUNA-READY`             | `5483fa21-0127-4625-8fcc-58e985943b2c` | about 14 s                               |
| Telegram DM                   | Visible `TELEGRAM-LUNA-READY`                           | `8568dad8-2653-47de-95ed-7c8290e7fe06` | about 13 s                               |
| Existing GitHub issue #2      | Visible `GITHUB-LUNA-READY` in bot comment `5578817993` | `594094cd-cddb-4cc7-a85e-edc08bde086b` | about 20 s                               |
| Existing Discord CHA-4 thread | Failure message, not a successful reply                 | `3dd32648-3d07-4616-a845-98625fce020f` | failed before provider startup           |

The latency endpoint is the final publication's `published_at`, not the earlier
working-placeholder message timestamp. Native execution alone took 11.3 s,
10.6 s and 14.3 s respectively. This small, awake-host sample is not a latency
SLO or a production load benchmark.

Slack's root is `1788838921.759279` in channel `C0BUT55N9RV`:
[live Slack thread](https://papercliplabs.slack.com/archives/C0BUT55N9RV/p1788838921759279).
[GitHub reply](https://github.com/cryppadotta/paperclip-chat-e2e-enabled/issues/2#issuecomment-5578817993).

Ten Slack follow-ups (`BURST-LUNA-0907-01` through `-10`) were sent through that
thread's actual composer in 4.3 s. All ten became distinct durable inbound
comments on one task. Luna acknowledged `01` once in run
`6cf15c58-55db-4b95-b7c2-bdbefdb8b394`, then `02` through `10` once each and in
order in run `2cb0ac3c-3ad9-4cec-8a40-555a84d7db6d`. The second run started 41 ms
after the first finished; the native current-wake reader appears in its durable
events. Final Slack text was inspected in the real browser. Both runs resumed
the provider session. No queue marker was omitted or duplicated. The second
batch's final publication was acknowledged at 03:51:07.023 UTC, roughly 36 s
after the last submitted marker, including the first run's remaining work.

The Discord failure is a real checkpoint-selection defect, not a transport or
quota success: a pre-bootstrap retry reused normalized session
`5e8168d9-e0ce-4c4b-8b4c-2da16e862880` without the saved checkpoint, then attempted
fresh startup against an older suspended run's durable directory. The strict PRP
identity guard rejected it. The directory and prior checkpoint were retained;
no live DB state or provider history was deleted to force a green result.
This finding requires a code fix and live retest before Discord sign-off.

A fresh Telegram photo was uploaded through the signed-in browser at 22:55 CDT.
Luna run `d4c0c338-ac12-4ce3-956e-577d8e6c1008` inspected the image, correctly
described the orange tabby, and returned an actual visible photo attachment.
The native turn took 52.4 s. A subsequent history-only resend request failed the
user journey: the completed DM task rolled over to a new generation, and run
`a9261539-3a93-4e1f-b45f-d9741216de65` truthfully reported no attachments in its
new task. The request had explicitly asked to keep the previous task in progress.
The separate attachment-history capability is not signed off by the successful
current-message round-trip; task continuity needs investigation without widening
attachment access across unrelated tasks or identities.

Functional text/queue outcomes are good in the exercised Slack, GitHub and
Telegram paths; experience quality is not yet signed off across all providers.
Teams tenant setup, Discord recovery and
remaining attachment failure/recovery journeys are still explicit gaps.

The existing disposable GitHub PR #3 line-review thread was also exercised on
the new native runner. A plain reply without another bot mention, review comment
`3954194584`, mapped to the existing `:rc:3950666444` conversation and one native
Luna run `a57802aa-4df8-4415-9b19-41444eb3caa0`. The run finished in 14.0 s and
published `GH-INLINE-LUNA-READY` as review comment `3954194907`, under the same
line thread rather than the PR main discussion. The response was inspected after
refreshing GitHub's classic PR page, which did not insert the new reply live.
[Inline reply proof](https://github.com/cryppadotta/paperclip-chat-e2e-enabled/pull/3#discussion_r3954194907).
This closes fresh native inline-reply delivery, not every inline edit/delete or
file-fallback journey. No test PR was merged and no implementation PR was tended.

### Discord host-pause admission hardening

The gateway can renew an expired local deadline only by an atomic compare-and-
swap on its exact durable token after current endpoint/credential checks. A
resumed callback establishes that authority before consuming a buffered message
or reaction. An actual standby takeover still fences and stops the old listener.
Callback-triggered teardown fences synchronously but does not await the gateway
task that may itself be awaiting that callback; shutdown joins the tracked stop.

Both targeted host-pause/takeover regressions pass after the final change
(`discord-host-pause-regressions-03.log`). Full chat integration passes **283/283**
on a fresh embedded PostgreSQL fixture (`discord-host-pause-full-03.log`). The
first two full attempts each exposed the same adjacent Slack test-cleanup issue:
an intentionally deferred valid receipt outlived its fixture. That test now
drains its own receipt after clearing the test-only due time, without weakening
the subsequent linked-authority/reach assertions. The cleanup pair separately
passed **2/2**. Direct server TypeScript checking also passed for the gateway fix.
These are deterministic admission proofs, not a live forced-host-sleep claim.

### Native checkpoint-selection correction

Native bootstrap now searches exact company/agent/issue/session history rather
than trusting a stale task-session `lastRunId`. Only terminal attempts with no
checkpoint, process or established-provider events can be skipped. Newer
provider authority is a barrier, never a checkpoint to adopt or roll back past.
Compatibility checks for provider, workspace, runtime context and native tools
remain strict. A new, uninitialized run with no compatible checkpoint receives
a fresh normalized session/durable root and full task context. Previously
admitted immutable inputs are not rewritten, and old history is retained.

The locked persistence step rereads provider evidence and checks the immutable
input before accepting a recovered checkpoint or fresh session ID. This also
fixes prefilled native session IDs overriding an explicitly selected fresh ID.
Real PostgreSQL regressions cover scoped lookup, newer progress barriers,
incompatible checkpoints, fresh-ID persistence and a provider event committed
while recovery waits on the run-row lock.

Root's frozen-snapshot resume/runner-selection/cancellation/status-context cohort
passed **61/61** (`native-resume-recovery-root-01.log`); this includes **28/28**
resume tests. Direct server TypeScript checking passed. The separate heartbeat
process-recovery file passed **133/133** on a clean rerun. An earlier combined
run reported two failures while files were changing; one recovery-case failure
was truncated and its cause was not established. It is not counted as a pass.
Live deployment and the original Discord retry are the next required checks.

The frozen native fix also passed the full server build and formatting checks.
An independent read-only review found no concrete findings in the scoped diff.

The subsequent native GitHub inline-file run
`c90e0948-1512-41b3-81af-bb14d4e93ada` succeeded in 30.3 s, but exposed a
wording defect: the model claimed the file was attached in the review thread,
while the transport correctly explained that GitHub App comments cannot upload
file bytes and saved the file on the private Paperclip task. This is not signed
off as native GitHub attachment delivery; capability/result guidance needs to
prevent the conflicting claim.

### Deployed native recovery proof

Commit `062cfcacc` is pushed and deployed on the isolated live instance. Health
reports that exact revision, startup recovery ready, and the agent remains
`paperclip_runner` / `codex` / `gpt-5.6-luna`. No credentials were regenerated.
The new follow-up in the original Discord conversation succeeded as run
`b9fc4be1-3a22-44c8-9198-4527fc8b90c4`: native execution took **12.85 s** and
the final publication followed **0.75 s** later. Its new normalized session is
`74083a50-8e04-4732-baed-5b5180267a56`; the old incompatible durable directory
and task/conversation history remain intact. `session.started` is recorded,
and the browser shows `DISCORD-LUNA-RECOVERED` on the same provider thread.
[Discord recovery proof](https://discord.com/channels/1457808928258658549/1546513811672932372/1546734998126854244).
This closes the exercised stale-checkpoint bootstrap failure, not every
possible interrupted native-session recovery scenario.

Ten subsequent real Discord messages were admitted once each to that same task.
Runs `68814d68-1913-4f03-9199-8cd707121372` and
`427bd446-88e1-461d-9fb6-bfdba64f9cda` resumed the same new native session and
acknowledged markers 01 and 02–10 respectively, once each and in order. The
queued second run started **63 ms** after the first finished; its 46.5 s duration
was native/provider work (six tool calls), not a multi-minute delivery poll.
Both final responses were inspected in Discord. The Board run page also showed
the native Luna identity, 13 s recovery turn, session change, transcript controls,
tool/terminal events and detailed timing spans.

The GitHub inline-file artifact was independently checked in private storage:
19 bytes, exact `INLINE-LUNA-FILE-OK` content with no trailing newline,
SHA-256 `73bf300550546d6a389e7c0791266a3a1e5e3466ff7e9f74f2f2aff11dffdaf1`.
This proves file creation/storage, while the conflicting provider-facing wording
remains a separate fix and live-retest requirement.

### Fresh Slack native media round-trip

The signed-in Slack thread received a real PNG and text file via its upload UI.
Native Luna run `5041afe7-27b1-4d99-8e29-7f560f889680` correctly described the
orange tabby and read `cobalt otter 47` from the file, then returned both original
files. The browser screenshot confirmed the image and readable text attachment.
Inbound/outbound asset hashes match for each file: PNG
`005f8dabdb19ef786c0e2e76695596d22c1d0bb53de374e0be209cc6d89851c9` and text
`fd40030afb62b83181a2a46dde8220e8defecfa0b4328e380c30b1899ccdce24`.
Native execution took 57.6 s; the final text published 0.93 s after completion,
with both native files delivered within another 5.8 s. This verifies actual
current-message file/image handling on Luna, not just an attachment label.
[Slack media proof](https://papercliplabs.slack.com/archives/C0BUT55N9RV/p1788841046075929).

### Historical file follow-up and private-review arbitration

Discord historical-file run `db32efde-61d5-45fa-9763-e2676e666600` exposed two
distinct gaps. Existing reuse could prepare old same-conversation files but
listing intentionally exposed metadata only, so Luna could not inspect the
historical image or quote the text. Native completion correctly required review.
However, its system-authored private review interaction incorrectly suppressed
the provider final despite being ineligible for chat projection, leaving the
visible working placeholder stranded.

Interaction arbitration now reserves the pending response slot only for an
interaction authored by the source run's agent. A durable actual provider prompt
still suppresses duplicate source prose after resolution. System/Board-created
reviews cannot silently consume that slot. Real PostgreSQL coverage plus the
existing safe-milestone suite pass **17/17**, and server TypeScript checking
passes (`native-chat-arbitration-root-02.log`). The first test attempt exposed
duplicate company prefixes in the new isolated fixtures; that seed defect was
corrected before the successful rerun. This correction is not yet deployed;
historical content inspection and live retry remain separate work.

### Additional native hardening under verification

The explicit external-chat wait correction passes **9/9** real-PostgreSQL tests
(`native-chat-wait-root-03.log`): same-task liveness with no scheduled extra turn,
current-authority revocation, and a contended endpoint proof that retries without
the issue/endpoint deadlock. Governance and ordinary non-chat behavior retain
their existing priority. Independent review found and prompted corrections to
lock ordering and authority-loss classification before this pass. Earlier runs
found fixture FK/prefix errors and an incorrect retry-count assertion (assessment
rows intentionally deduplicate); those attempts are not counted as passes.

File-preparation results now explicitly distinguish native attachment capability
from GitHub/Teams private-task-only delivery and never claim confirmed sending.
Focused coverage passed **32/32**, broader prompt/tool-authority coverage
**119/119**, and adapter-utils/server typechecks passed before later reader work.
The queued-publication change uses at most four independently owned endpoint
lanes, preserving same-bot credential fencing and conversation order. Its
focused queue/lease/app checks passed **8/8**, and broader receipt/FIFO/retry
coverage passed **20/20**. The first full integration run passed 284/287: two
old stale-worker fixtures needed exact lease expiry, and one failure exposed
an empty-page race when an excluded busy endpoint became idle during selection.
Those cases were corrected. A real row-lock regression also reproduced expiry
resurrection before the new lease guard sampled its clock after acquiring the
lock; the corrected guard rejects late settlement without replaying the send.
The frozen full integration rerun passes **288/288** in 100.13 s
(`chat-channels-full-root-hardening-02.log`), with app lifecycle checks **8/8**.
These changes are not yet deployed.

### Frozen native tool and continuity verification

The native historical reader now admits one exact same-conversation attachment
under current run, agent, source-lineage, membership and destination policy.
After bounded storage retrieval and size/hash verification it revalidates
authority, commits that transaction, then stages bytes in the confined temporary
workspace. Reading never selects a file for outbound delivery. Empty files are
inspectable, cancellation cannot return a path, and run completion clears the
staged inode. Review caught both filesystem work holding policy locks and a
pre-validation cleanup path that could truncate an unauthorized inode; focused
regressions cover both corrections. Remote staging is explicitly unsupported,
not silently replaced by a public URL.

Direct Codex chat also advertises the existing run-bound `request_human_input`
tool. No general task/governance tool was added. Fingerprint v5 rotates older
provider catalogs, including the intermediate reader-only catalog. Independent
review found no remaining authority/privacy defect in this narrow exposure.

Combined native-runtime, prompt/file guidance and provider arbitration coverage
passes **1,350/1,350 across 34 files** in 164.80 s
(`native-combined-root-hardening-01.log`). The Codex driver suite passes **65/65**,
including fresh and resumed direct-tool dispatch. The full server/runner build,
shared/adapter-utils/UI typechecks and whitespace checks pass. New files are
Prettier-formatted; whole-file Prettier reports existing mixed-style formatting
in several touched modules (also reproduced against the pre-change
`server-utils.ts`), so that broader check is not claimed as a pass. The lockfile
remains unchanged. Live verification of these combined changes is still pending.

### Live native Luna qualification on `205c0ca99` (September 8 UTC)

The combined changes were built, committed and deployed at 04:43:39 UTC; health
reports `2026.831.0+419.git.205c0ca99`. Deterministic browser coverage also passed
**9/9** in 2.7 minutes (`chat-ui-root-hardening-01.log`). This is supporting
fixture coverage, separate from the signed-in provider journeys below.

Maya's runtime settings visibly select **Paperclip Runner → Codex →
`gpt-5.6-luna`**, with automatic isolated permissions and turn-by-turn lifecycle.
The actual native run/model records agree. No Terra substitution was made.

- **Slack structured question: passed.** A real thread message requested an
  Amber/Cobalt choice. Run `d305f396-3257-4665-afc4-36fab64a0c60` produced the
  native question in 15.14 seconds. Clicking Cobalt once settled the card to
  “Answered: Cobalt.” One durable response delivery woke one continuation,
  `3d9cf547-d0fd-4a6b-9e23-eab8d3533c74`; its single final “cobalt” was published
  14.92 seconds after the answer. A later DB check found no duplicate response,
  continuation or final. [Visible reply](https://papercliplabs.slack.com/archives/C0BUT55N9RV/p1788842861244389?thread_ts=1788838921.759279&cid=C0BUT55N9RV).
- **GitHub file-location wording/storage: passed.** Inline review run
  `e903e64c-a91d-404e-ab27-cc3483f8b95d` completed in 50.43 seconds. The result
  correctly says the file is on the private Paperclip task, not attached in
  GitHub. Independent inspection verified the stored 21 bytes are exactly
  `LUNA-FILE-LOCATION-OK`; SHA-256
  `907f14d2edb054321688372f2e96d43ee50f7f4093bf7a912ea675238de2d633`.
  [Visible reply](https://github.com/cryppadotta/paperclip-chat-e2e-enabled/pull/3#discussion_r3954401548).
  This does **not** qualify native GitHub binary uploads, which the App does not
  support.
- **Telegram photo inspection: passed; wait/history follow-up: failed.** Run
  `53501280-d5b3-491b-9372-17e70fdbe839` correctly described the real uploaded
  orange cat photo in 23.23 seconds, but created a native completion review
  despite the explicit request to keep the task open and wait. Follow-up
  `7cfd468c-c29d-4099-9380-b05e834141f1` could not read/resend that stored photo:
  `list_chat_attachments` correctly rejected a missing authenticated chat
  execution binding. The upstream dispatch omitted that binding for
  `in_review` issues. The visible response honestly reported failure; the
  journey is not qualified.
- **Discord historical file inspection: not qualified.** Run
  `91cba10c-0fe2-4154-a831-a88cb5b4ee44` encountered the same reviewed-task binding
  problem. macOS then slept from 04:49:57 to 05:05:00 (903 seconds). Timeout
  cleanup durably interrupted the provider turn, but recovery at 05:06 retained
  its stale active-turn checkpoint and waited without progress. Rust provider
  state and authenticated PRP event 89 both record the exact interruption;
  there was no second active task execution. This wall time is not a valid Luna
  latency sample. The driver recovery and attempt-local timing defects are
  being corrected, not counted as a successful recovery.

The live failures expose gaps in otherwise-green fixtures. Follow-up work must
preserve real review/approval gates, add current-execution attestation without
pretending a reviewed task was checked out, accept an explicitly yielded chat
wait at the native completion boundary, and reconcile an already-terminal
provider turn without replaying its work. Retest these exact provider journeys
after deploying those fixes. Teams still needs the previously documented
work/school tenant and bot-registration/admin setup; personal Teams login is
not qualification.

### Corrections from those live failures

Recovery commit `d2c3e87d0` reconciles the exact previously active provider turn
before returning a recovered session. Native execution consumes a newly adopted
terminal without resending the original work and without checkpointing that
terminal before its event is durable. Tests cover completed/interrupted turns,
failed append followed by recovery, unchanged identities and exactly-once
finalization. Driver/backend/runtime coverage passed **299/299** during combined
integration (`native-recovery-root-05.log`); the expanded runtime suite alone
passed **74/74** and its typecheck passed.

Reviewed follow-ups now receive a distinct, server-minted chat execution binding
only after proving current run ownership and current endpoint, resource and
principal authorization. It is explicitly not checkout or approval; a real
pending governance interaction remains unchanged. Current/historical readers
retain their full permission checks. Pure same-issue status coalescence keeps
the exact admitted chat payload; changed source/comment scope cannot reuse its
authority. The reviewed binding has a five-second bounded retry for normal row
contention or the exact inbound delivery still finishing, releasing locks and
rechecking authority between attempts. Its focused real-PostgreSQL/prompt/reader
coverage passed **202/202**, with server and adapter-utils typechecks.

The explicit wait failure was also a tool-contract gap: the generic run-result
schema allowed a yield, but Codex's completion tool and runnerd rejected it.
`paperclip_finish` now accepts `yielded` only with a `response_wake` continuation;
an immediate `same_agent` continuation remains rejected. Tool fingerprint v6
rotates v5 catalogs. Focused runner checks passed **36/36**, resume checks
**31/31**, exact Rust admission checks **2/2**, and Rust format/TypeScript checks
passed. A broader Rust substring command overmatched unrelated ACPX port tests
and failed three host-port reservations; that command is not reported as green.

Preparation timings now begin at the current dispatch attempt, not the original
run start before sleep. Original queue/comment history and total elapsed run
time remain intact. The actual executor wiring and timing cases pass
**154/154** (`native-timing-root-01.log`). The combined full server/runner build,
including semantic contracts, generated catalogs, binary and replay golden
checks, passed (`native-followup-root-build-01.log`). Live requalification of
these corrections is still required.

An independent **73/73** safety/transcript check confirms native commentary,
reasoning, tool activity and timing are Board-visible but not copied into chat.
External surfaces receive safe lifecycle, authorized final replies, projected
questions and selected attachment handoffs. External progress remains coarse.
Same-bot uploads intentionally serialize, while independent endpoint lanes
avoid cross-bot head-of-line blocking. Eligible new Slack/Telegram long posts
still incur bounded synthetic streaming delay (about one second per 4,000
characters); edited working messages bypass it.

The inbound dispatch-order audit found a remaining durability concern: both
initial ingress and committed-link recovery can dispatch the wake before
subscription and the `processed` delivery transition finish. The bounded
reviewed-attestation retry mitigates that startup window, but is not an atomic
outbox. Reordering those writes naively would lose wakeups after a crash. A
separate delivery-bound durable wake-intent design is being reviewed; no claim
of full production readiness should omit this remaining race.

### Live follow-up qualification on `9c2c65ed3` (September 8, 05:33 UTC)

The server reported this exact clean revision after startup at 05:29:53 UTC.
Maya's runtime settings still showed `paperclip_runner`, Codex, and
`gpt-5.6-luna`; no fallback to Terra was made. The frozen native matrix passed
**1,371/1,371**, 36 files, 161.29 seconds
(`native-followup-root-tests-02.log`). Full chat integration passed
**288/288** on isolated PostgreSQL (`frozen-chat-integration-0908-01.log`).
The first native matrix had one restart-test timeout while a concurrent build
replaced its runner binary; the unchanged isolated case and full restart file
passed, followed by the successful frozen matrix. Do not rebuild runner
artifacts while real-process tests or retained live processes depend on them.

The live browser retest did **not** pass all journeys:

- Telegram `TG-LUNA-HISTORY-FIX-0908`, run
  `1b782683-55b1-4569-85ac-4f35fad63875`, proved the new reviewed-chat binding
  worked without checkout or changing the existing governance gate. However,
  `list_chat_attachments` returned an empty index. The existing photo had valid
  lineage and bytes but a null original filename, which the historical reader
  incorrectly excluded. The honest visible failure arrived after 57.25 seconds;
  no file was returned. A safe filename fallback now uses the attachment UUID
  and validated MIME extension, without changing bytes, hashes, or permissions.
  List/read/reuse and reviewed-binding regression coverage passed **29/29**,
  plus server typecheck (`unnamed-chat-attachment-02.log`).
- Slack `SLACK-LUNA-WAIT-FIX-0908`, run
  `3939c72d-0849-40ff-83b8-35ddd4f70728`, failed semantic completion and retried
  before showing the failure message. The actual Codex discovery output exposed
  `paperclip_finish(args: unknown)`: the new provider schema's conditional-only
  root `allOf` hid the concrete argument fields. The model consequently guessed
  incomplete arguments, including a continuation without its summary/key.
  GitHub `GH-LUNA-WAIT-FIX-0908`, run
  `ec29d6cd-fd66-40b3-a861-9a3a06028e44`, also exhausted semantic-result recovery.
  The provider schema now keeps its concrete object root with an equivalent
  direct `if`/`then`, preserving validation, and fingerprint v7 rotates stale
  declarations. Schema/driver tests passed **23/23** and resume tests **31/31**.
  Actual model-visible signature and live completion still require retesting.
- The old Discord run `91cba10c-0fe2-4154-a831-a88cb5b4ee44` remained visibly
  working after restart. Its retained process used the prior runner executable;
  the newly built controller expected a different executable digest, rejected
  authentication, then waited indefinitely while that PID remained alive.
  This is not Luna generation latency. The existing durable lease does not
  retain an authenticated historical executable digest, so relaxing the check
  would be unsafe. Recovery must time out explicitly, preserve evidence, and
  require ownership-safe recovery rather than silently launching duplicate work.

These live failures remain separate from passing automated tests. They are
included in the production-quality assessment, not hidden by successful run
status or a generic working indicator.

### Ownership-safe recovery and native runtime audit (September 8)

The actual Codex rollout `turn_context.model` confirms `gpt-5.6-luna` on both
the original Slack turn and its recovery, not merely the agent configuration.
The Board's native run inspector exposes canonical events and diagnostics;
private reasoning/raw tools remain Board-only. No Terra fallback was used.

The old Discord run finally failed at 05:44:58 UTC on the old server after its
15-minute controller timeout. Its retained PID was then absent. No historical
rows were rewritten and no manual process termination was used to manufacture
a recovery result. That behavior remains a failed qualification, not a pass.

New recovery handling bounds adopted-runner authentication without signaling an
unauthenticated process. Authentication timeout holds the run, task locks, and
environment ownership rather than treating timeout as proof that execution
stopped. It blocks automatic replacement, reaping, restart recovery and implicit
cancellation. Terminal writes use an atomic not-held predicate; cleanup occurs
only after a successful compare-and-swap. Resume queries exclude held rows
before their limit, preventing held rows from starving eligible work. This does
not exempt held runs from configured concurrency limits.

External chat receives one safe attention message with a Board recovery path,
not an indefinite working message or a false claim that the provider stopped.
Publication preflight cancels late queued/working updates and stale attention
updates before provider I/O, including overlapping sweeps.

Verification before deployment: full chat integration **292/292** on isolated
PostgreSQL (`ownership-chat-integration-root-02.log`); native executor, ownership,
teardown and restart cohorts **194/194**; heartbeat recovery/concurrency subset
**17/17**; the pre-limit starvation regression **1/1**; server typecheck passed.
Adopted transport tests passed **9/9**, real-process restart **8/8**. The safe
completion-hint Rust integration/module cohorts passed **31/31** and **26/26**.
These automated checks do not replace the pending rebuilt-server live retest.

An independent filesystem audit found a further boundary to harden: linked
native external tasks currently share the agent-home cwd, despite having
different native workspace IDs. File registration validates current task/run
and confined bytes but cannot prove another task did not produce a readable
file. No actual leak was observed or private file contents inspected. Task-scoped
native chat workspaces are being implemented; this issue and the previously
documented inbound durable-wakeup race remain open production-readiness items.

### Rebuilt live qualification on `981233481` (September 8, 05:58 UTC)

The full server/runner build, Rust release binary, semantic catalogs and replay
golden checks passed (`native-ownership-root-build-01.log`). Recovery stale-lock
tests also passed **14/14** on root's fresh PostgreSQL fixture; the subagent's
sandbox had skipped this cohort. The server restarted with no active Maya turns
and reported clean `981233481` at 05:58:05 UTC, ready at 05:58:10 UTC.

New real messages were sent through the signed-in provider interfaces:

- Slack run `e606f147-610b-4d19-ba79-bc5a37f9d816` completed in **17.90s** and
  GitHub run `a2f8192c-0d3d-4b16-801e-f9bddc73777b` in **19.11s**. Both accepted
  canonical `yielded` / `response_wake` with the exact requested marker and
  server decision `external_chat_response_waiting`, without semantic retries.
  However, both displayed only “Maya E2E completed this turn.” The response
  materializer still suppressed every yielded summary. The new narrow fix
  permits the canonical summary only after committed native response-wait proof
  and current durable chat authorization; generic control-plane waits and raw
  final prose remain suppressed. Resolver tests passed **41/41**, server
  typecheck passed. A live response retest remains required.
- Telegram run `0b0f20da-f92d-499a-abd5-a27ebcaa047d` now listed the exact earlier
  unnamed JPEG (221,327 bytes, unchanged SHA-256), proving the filename fix.
  Byte reads repeatedly returned `read_busy`; no photo was returned. Discord
  run `340b9802-9183-442f-b765-0a32827f1585` also found the original fixtures but
  could not read or prepare them. These runs' successful native termination
  does not mean their requested file outcome succeeded.
- A single-conversation Telegram retry reproduced the read refusal with no
  other active Maya turn. A bounded read-only PostgreSQL monitor observed the
  reader's NOWAIT check overlapping native event persistence on the run row.
  The reader previously treated any immediate lock miss as “policy is changing.”
  It now retries the entire authorization transaction for at most one second,
  rechecking current policy on each attempt and again after reading storage,
  without holding locks during backoff or filesystem work. Permanent revocation
  is not retried; cancellation stops the retry. Reader/reuse tests passed
  **26/26**, including brief run-row contention, revocation while blocked and
  cancellation during retry; server typecheck passed.

The simple completion latency improved substantially, but these visible output
failures still make the interaction quality unacceptable. No file delivery or
response-wake journey is marked qualified until the corrected server is tested
through the actual provider UI again.

### Cohesive native chat hardening before the next live retest

The native local workspace fix selects external tasks from durable task and
conversation state. Projectless chats receive separate company/agent/task
directories outside the legacy shared agent home; an existing provider process
with the old shared-root input is held, never silently migrated or replaced.
Project-backed local chats require a task-owned isolated worktree. Extra project
roots are not inherited into an external conversation. This complements the
native Codex root-denied permission policy; a different workspace ID alone would
not isolate readable files.

Inbound task/comment creation now also stages a durable wake intent. Attachment
ingestion and provider subscription finish before acceptance; acceptance and
intent readiness commit together, before scheduler admission. The action ID is
also the unique wake receipt ID. Retries repair the ledger without scheduling
twice, preserve the original actor, and recheck current access under the task
lock. A pending intent cannot be bypassed by generic stranded-task recovery.
Failed original authorization does not become valid merely because the external
account is linked later. Explicit Board reauthorization is not implemented in
this slice; no caller-supplied actor/source flag bypasses the guard.

The accepted native response-wait summary is now eligible for publication only
with committed finalization and current exact chat binding. Attachment tool
descriptions name all required arguments and bounds; the native tool-contract
fingerprint advances to v8 so resumed provider sessions get the new declarations.

Supporting verification on the combined source snapshot:

- Native-runtime directory: **1,253/1,253**, 33 files, 164.74s, including real
  processes (`native-cohesive-root-01.log`).
- Codex driver, completion schema and transport: **293/293**
  (`native-codex-luna-contract-root-01.log`).
- Response summary and native attachment catalog: **73/73**
  (`native-wait-summary-catalog-root-01.log`).
- Real PostgreSQL default-local workspace dispatch, retained legacy ownership
  and four unadmitted-intent recovery states: **6/6**, with 135 unrelated tests
  excluded (`native-workspace-outbox-recovery-root-01.log`).
- Deterministic browser contracts: **9/9** on their isolated fixture server,
  not live provider accounts (`chat-ui-native-followup-root-02.log`).
- Shared and UI typechecks passed. The full chat integration snapshot initially
  passed **286/294**; it exposed Slack slash-command fence propagation, replay
  expectations and receipt-aware fixture gaps. Those fixes and retry readiness
  regressions passed the focused cohorts. The final fresh PostgreSQL rerun
  passed **295/295** in 103.76s (`inbound-wakeup-full-11.log`), with durable
  scheduler **8/8** and targeted compatibility regressions **12/12**.
- Explicit Board wake attempts for four unadmitted-intent states now return an
  actionable 409 instead of silently doing nothing. Those **4/4** real PostgreSQL
  tests also prove no run, receipt, action rewrite or adapter execution occurred.
  This is not a reauthorization bypass.
- Full server/runner build and subsequent emitted server typecheck passed
  (`native-chat-cohesive-build-root-01.log`,
  `native-chat-cohesive-tsc-root-02.log`). The lockfile is unchanged.

These checks do not qualify the still-failing visible photo/file and final-reply
journeys. The next deployment and live provider outcomes are recorded separately.

### Live results on `78caec9f6` (September 8, 06:27 UTC)

The clean committed/pushed revision restarted at 06:27:37.664 UTC and reported
ready at 06:27:45.434 UTC. No Maya runs were active at restart. The historical
seven native recovery holds were left intact rather than rewriting old evidence.

- Slack `b3d8f284-36fe-4817-b556-3971246f0e75` completed in **14.71s** and
  displayed the exact `SLACK-LUNA-READY` reply, replacing its working message.
  [Visible reply](https://papercliplabs.slack.com/archives/C0BUT55N9RV/p1788848899973669?thread_ts=1788838921.759279&cid=C0BUT55N9RV).
- GitHub `2c41782e-cef3-4f6d-af68-a1d1c647a1d3` completed in **13.65s** and
  displayed `GITHUB-LUNA-READY` in the same inline thread, still present after
  reload. [Visible reply](https://github.com/cryppadotta/paperclip-chat-e2e-enabled/pull/3#discussion_r3954971454).
  Both used `external_chat_response_waiting`, materialized one authorized final
  comment, and published into the existing working message. Their actual native
  execution inputs have separate task-owned cwd paths outside the agent home.
- Telegram `7aaded5c-2e90-40f7-bf2f-1a656afdcb69` finished in **32.53s** and
  reported successful original-photo inspection and exact-file preparation.
  However, its decision was `governed_response_waiting`; its visible message was
  still only “Maya E2E completed this turn,” with no delivered image. Discord's
  `485d2467-67f0-4f2c-9f01-0c5e131a2cf4` likewise displayed only completion and
  no files. Neither media journey passes. The current wait gate is being
  investigated without bypassing genuine approval or review authority.

The three-message Slack burst preserved order and delivered each marker exactly
once across two turns. Its wall time is not a valid awake latency benchmark:
macOS power logs record 174 seconds of sleep from 06:31:08 UTC, then 931 seconds
from 06:34:47 UTC. Those pauses account for most of the observed long waits.
At 06:51:46 UTC a 30-minute, process-scoped `caffeinate -is` assertion was started
for testing; it does not keep the display unlocked or change persistent settings.
The next two immediate Slack messages produced ordered, nonduplicate responses
with run durations **11.86s** and **13.08s** (`519f8c91-97d5-47fe-9b56-f004d4d2761c`
and `baff6436-526b-45a7-abdf-f75307ca2842`). The durable wake ledger contains one
receipt per input, including deferred and coalesced aliases; no input was lost
across the host sleep.

Independent tool evidence confirms actual `turn_context.model=gpt-5.6-luna` in
both new Telegram and Discord provider rollouts, not just saved configuration.
Telegram's historical reader returned the exact verified staged JPEG, and its
`view_image` call opened that same path. Reuse prepared attachment
`07e93350-24da-417b-a5f0-680e98815129` with unchanged source hash and size.
Discord read and inspected both original fixtures and prepared a 128-byte note
and 2,111,878-byte PNG with the original hashes. Its v8 calls used valid list
bounds, both read identifiers, all four reuse fields and stable idempotency
keys; native completion succeeded on the first try. Neither channel queued an
attachment publication. Both remained in review with no scheduled extra turn.

The blocking gate is a genuine pre-existing system-native completion review
whose `supersedeOnUserComment` is explicitly false. New chat input must not erase
or approve it. The follow-up fix separates permission to present the current
chat answer/files from permission to resolve that review.

The successful Slack run was also opened through the Board's native Runner
Inspector. Canonical events and final-presentation decisions are available with
raw capture off. The overview incorrectly labeled this state “Expired” beneath
a successful run. It now says “Raw capture off”; the live hot-reload retest,
UI typecheck and token gates pass. All **8/8** inspector tests pass after
explicitly selecting Overview before asserting its label
(`native-inspector-status-root-03.log`). No raw capture or credential exposure
was enabled.

### Review-preserving chat presentation and receipt recovery (September 8)

The follow-up separates a current authorized chat answer from resolution of a
pre-existing native completion review. A server-minted proof binds the committed
decision, accepted canonical result and assessment, exact review policy, causal
requester and destination. It permits only the canonical final summary and
selected files; generic governed waits, new questions/approvals, raw provider
output and forged markers remain private. Current permission, task status,
review policy and destination are rechecked at comment creation and transport.
A later valid chat wait under the same unchanged review does not invalidate
files already queued by an earlier turn.

Independent reviews also closed crash and contention edges: proof/result
projection is recoverable from the committed tuple, reconciliation materializes
the reply/files exactly once without resolving the review, and an atomic
ownership guard preserves a concurrently installed recovery hold. Completed
presentations take a cheap existence fast path, including operator-deleted
comments, so recovery neither recreates them nor repeatedly performs expensive
authorization transactions. Comment retries release all transaction locks;
pre-provider authorization contention is retryable, not ambiguous delivery.

The duplicate-ingress stress test initially exposed an omitted receipt on the
existing-message retry path. That path now recovers its idempotent reaction
only after a durable wake receipt. A deterministic endpoint-lock test proves
one comment, one wake and one visible receipt after the retry. The broader
duplicate storm test now permits only the specific transient lock error from
direct synchronous SDK callbacks and verifies the durable queue drains.

- Focused native review/recovery tests: **76/76**
  (`native-review-presentation-08.log`), including concurrent ownership holds,
  repeated crash replay, later same-review decisions and operator deletion.
- Full chat integration plus reviewed binding/interaction compatibility:
  **313/313**, including **296/296** chat integration tests
  (`native-review-chat-compat-root-02.log`). The earlier 311/312 result exposed
  the receipt-recovery defect and is not recorded as a pass.
- Both independent code reviews passed. The full native-runtime cohort passed
  **1,277/1,277** across 33 files in 81.62s
  (`native-review-full-root-01.log`), and emitted server compilation passed
  (`native-review-emitted-tsc-root-01.log`). These precede two narrow follow-ups:
  skipping redundant metadata restoration for the latest already-materialized
  decision and excluding only adapter-managed `paperclipRuntimeServices` and
  `paperclipRuntimePrimaryUrl` display fields from the otherwise unchanged
  context hash. Those final differences passed **78/78** focused tests
  (`native-review-presentation-09.log`) and server typechecking; changed causal
  wake data still denies publication.
  Live media qualification remains pending until the new server is restarted.

### Live media passes on `3ab1384f9` (September 8, 07:25 UTC)

The clean committed/pushed revision started at 07:25:36.405 UTC and was ready at
07:25:40.416 UTC. There were no active Maya runs at restart; all seven historical
recovery holds remained intact. The final emitted server compile also passed
(`native-review-emitted-tsc-root-02.log`).

- Telegram run `7a26a46f-931e-4394-b6a5-3596393c39d0` completed in **31.005s**
  on actual Codex `gpt-5.6-luna`. The original JPEG was read, viewed and reused
  with its unchanged 221,327 bytes and SHA-256. The canonical reply and image
  each published once to messages `417200359:76` and `417200359:77`, with durable
  outbound message links. Request-to-image delivery took about **36s**. The
  in-app browser visibly rendered the original orange tabby photo. The genuine
  completion review remains pending and the task remains `in_review`.
- Discord run `a4d3e502-9f49-4ae8-a639-9888f37e81e8` completed in **62.412s**
  on actual Luna. All six dynamic tool calls succeeded without malformed
  inputs. The 128-byte note and 2,111,878-byte PNG matched their original hashes
  and published to Discord messages `1546783913744146503` and
  `1546783919049809982`. The browser showed the native text-file preview,
  correct verification phrase and rendered cat PNG. The original human-only
  review remains unresolved; no additional run or monitor was scheduled.
  Power logs show no sleep in this interval: this is an awake latency result.
  Recorded tool execution accounts for 2.818s; the runner turn is 59.163s, with
  the remainder between tool calls attributable only to combined model/provider
  orchestration from the available evidence, not pure model inference.
- GitHub's post-deployment inline smoke run
  `ac222e50-07b3-4e30-a92c-97dfbe2324d0` completed in **12.75s** and the browser
  showed `GITHUB-LUNA-VERIFIED` after reload in the existing fixture thread.

Both media answers still include the model-time phrase “provider delivery is
not confirmed,” although transport confirms and displays the files seconds
later. This is not a delivery failure, but it is a remaining wording issue:
prefer neutral file labels and actual content over transport implementation
details, without asserting delivery before it happens. The native Runner
Inspector for the successful Telegram run shows 88 canonical events with raw
capture off; no private reasoning or raw provider trace was sent to chat.

The final Slack post-deployment smoke encountered a separate ingress delay:
provider message `1788852525.310329` is timestamped 07:28:45, but its Paperclip
delivery was not created until 07:30:23.026 and was processed at 07:30:23.794.
The final reply was displayed once as `SLACK-LUNA-VERIFIED` at bot message
`1788852624.382399`. Native run `7c2e2e0c-7522-428f-b5da-ca2e760cfb80` took
**11.305s**, with **12ms** queue time. The event was `subscribed_message`, proving
the subscription survived restart. The approximately 98-second gap precedes
durable admission, but that does not establish HTTP-arrival time: development
logs omit request duration/start and Slack retry headers. The gap remains
unattributed, not proven to be Slack or Paperclip initialization. The 07:34:06
repeat did not reproduce it: ingress took **0.526s**, queue time **10ms**, native
Luna run `abda130f-c886-4e39-b2fc-ceb921ebf136` **12.439s**, and total
message-to-final **15.004s**. `SLACK-LUNA-QUICK` published once on existing working
message `1788852848.668699`, with one delivery/wake/eyes action. The in-app browser
confirmed the exact final reply. Request-start/duration and retry metadata are
still needed to attribute a future pre-receipt outlier reliably.

### Timed ingress and transport revocation checkpoint (September 8, 07:48 UTC)

Committed/pushed `eb0cb2841` (file-answer guidance), `2924ec872` (local webhook
timing), and `fa3a0b63f` (real-database transport and admission regressions).
The clean `fa3a0b63f` process started at 07:48:25.276 UTC and recovery was ready
at 07:48:27.230. All seven historical recovery holds remained intact and no
Maya run was active at restart. The webhook-only public proxy remained running.

- Root's full chat integration passed **299/299** in 58.37s against fresh
  embedded PostgreSQL (`native-webhook-transport-full-root-01.log`). The three
  new transport cases build a genuine committed native review response and
  selected files, then revoke the original requester or change the exact gate
  before draining publications. All three parts cancel without a provider post,
  edit, upload or receipt lookup. A held policy row instead produces a definite
  pre-provider retry, then exactly one text and two file sends after release.
- Mounted timing/body-parser/route tests passed **10/10**; with the real Slack
  adapter/PG admission-failure case, **11/11**. Forged signatures and failed
  inserts never report a durable receipt. The accepted retry records its real
  committed row before acknowledgment. Events contain only closed numeric,
  timing, provider/row identity and bounded retry-hint fields; no body, URL,
  arbitrary header, credential or raw error is logged. This is local logging,
  not telemetry or externally exported tracing.
- File/prompt tests passed **123/123**, adapter compilation passed, and emitted
  server compilation passed (`native-webhook-presentation-emitted-tsc-root-01.log`).
  These tests do not prove the model will follow the wording guidance.

The first live Slack message after this restart, `SLACK-TIMING-0908`, gives an
actual HTTP boundary. Its provider timestamp was 07:49:22.930; HTTP arrived at
07:49:23.520. Cold runtime initialization took about **6ms**, the durable receipt
was recorded at **21.856ms**, and the 200 acknowledgment finished at **24.047ms**.
Run `2250a8ec-52d0-40c4-a65c-200e94010a79` took **11.861s**. The single final
`SLACK-LUNA-TIMED` was visible and published at 07:49:37.302, **14.372s** after
the provider message. The earlier 98-second outlier did not recur; its historical
cause remains unknown rather than retroactively attributed by this new sample.

GitHub's inline `GH-TIMING-0908` returned `GITHUB-LUNA-TIMED` visibly in the
same fixture thread. Run `db757de7-0f20-456a-9aa4-6c0adf0babf1` took **14.932s**.
The webhook durably staged ingress and returned 202 in **82.379ms**, then
initialized the runtime and admitted the message asynchronously under the same
diagnostic request identity. No repository operation was requested or performed.

Both native file retests delivered once: Telegram run
`bf0eb51f-bc9e-49c2-9827-212fa4a3bcbb` took **38.171s**, with text/image messages
`417200359:82` and `417200359:83`; Discord run
`afc3ad5d-6c63-468a-bd83-e90cb57c5490` took **63.188s**, with the original note
and PNG at `1546789814529957918` and `1546789820725071932`. The in-app browser
showed the images and Discord's note preview. The wording retest **did not fully
pass**: Telegram retained prepared/waiting boilerplate and Discord still said
provider delivery was unconfirmed. Scoped boolean checks confirm the updated
guidance reached both actual Codex user-input messages, not just stored server
context. This is an instruction-following/wording defect, not a failed file
transport or missing-prompt claim.

### Native answered-question continuation defect (September 8, 07:43 UTC)

On the earlier deployed `3ab1384f9`, Discord and Telegram each received a natural
request to choose Amber or Cobalt through a clickable prompt, then return only
the chosen color. Actual `turn_context.model` records for all four source and
continuation runs are `gpt-5.6-luna`.

- Discord source run `f93e89a8-6e36-447f-b523-11d7853be886` produced interaction
  `00de7efd-2876-45d1-91a4-0cf6e5a15722`. One Cobalt click settled the visible
  card to **Answered: Cobalt** and queued exactly one response continuation,
  `a54a834d-55b1-4f0c-8a9a-941de93a4471`.
- Telegram source run `c8b117fc-caf8-41d6-810c-b1d70e32e501` produced interaction
  `40e22877-3354-46b0-a033-48458ab28373`. One Amber click removed the keyboard,
  showed **Answered: Amber**, and queued exactly one continuation,
  `5628e9a3-e3c4-4fb2-8b46-1463a15f92e9`.

The continuations succeeded in 14.952s and 15.619s, but both provider finals
said **Maya E2E completed this turn** instead of the selected color. Their
accepted semantic summaries contained workflow bookkeeping, and no authorized
review-preserving presentation proof was minted. The exact source-comment
lineage survives, but the `issue.interaction.respond` wake is not recognized as
an authenticated external answer for prompting and presentation. Separate human
completion reviews remained pending and must not be bypassed by the repair.
This is a failed end-to-end answer scenario, despite successful cards and
exactly-once response delivery. A narrow attested-continuation fix is in progress.

### GitHub inline edit audit (September 8, 07:55 UTC)

Edited only our existing comment `3955555016` through GitHub's **Edit comment**
UI, appending harmless marker `GH-INLINE-EDIT-0908`. The update was saved at
07:55:19.257 UTC. Paperclip received one `message_updated` event
`f373ca14-06b8-4c86-971d-3d15e0538272` and processed it at 07:55:21.673.
It appended correction comment `964922f1-c620-433f-ae40-d130d31a4f0b` to the
existing `CHA-10` task and preserved the original comment. No new run was
created. GitHub visibly retained the corrected text. In Paperclip's `CHA-10`
activity, expanding **System update · An external message was edited** showed
the same correction and marker. No PR code, review resolution, installation
or repository settings were changed.

### Native answer repair checkpoint (September 8, 08:05 UTC)

`5d329ba4d` fixes Discord terminal-card edits to send explicit empty components,
so Discord removes answered controls instead of retaining the previous buttons.
The adapter patch passes **39/39** tests and applies cleanly to pristine 4.39.0;
the patched scratch module matches the installed module. The combined root
Discord/prompt/file cohort passed **167/167**.

`fb905c844` adds a distinct server-attested native answered-question path. It
binds the exact source run/comment, processed provider choice, canonical answer,
durable response receipt, target wake/run, current linked actor and destination.
The marker alone grants no authority. Finalization and transport revalidate it;
lost authorization is revoked rather than an excuse to schedule generic work.
The existing human completion review is preserved. A real PostgreSQL overlap
test verifies advisory-before-identity locking during concurrent unlink.

The focused native files passed **58/58**, server typecheck passed, and the
independent guard review found no remaining blocker in this bounded repair.
Root separately passed **299/299** chat integration tests, shared/UI typechecks,
adapter compilation and emitted server compilation. These are installed-tree
checks, not clean frozen-install qualification.

This repair currently covers a single-choice provider answer sourced from one
direct-chat comment. Questions created by an already resumed answer turn and
multi-comment source batches are deliberately not covered; arbitrary sequential
question chains remain a release gap. Live requalification of the repaired
answer, Discord controls and wording is still required at this checkpoint.

### Live native answer repair passes (September 8, 08:06–08:10 UTC)

The clean `bb7531a4a` process reports that version from `/api/health`. Root's full
native runtime suite passed **1,305/1,305** across 33 files in 86.90s before
restarting the idle live server; the verified webhook proxy was left running.

- Telegram source `06225db3-09bb-4dfe-bb77-150146497b8a` created the clickable
  question in 10.072s. One Amber click settled interaction
  `600c46ba-26dc-4c7a-a495-1d6247d00e0c`. Continuation
  `b0aa2657-2541-405d-b2bc-be1c553dc2f4` took 14.412s and visibly returned exactly
  **Amber** at `417200359:86` (08:07:24.682). The answer keyboard disappeared.
- Discord source `431d7909-fc69-49b6-9077-08cd033681a5` created its question in
  25.738s. One Cobalt click settled interaction
  `02a31169-ebfe-4fcb-b21f-1e2141b07f7a`. Continuation
  `03b4aee5-a6b5-4f59-b580-6a232ba26934` took 16.460s and visibly returned exactly
  **Cobalt** at `1546794131576197221` (08:07:57.437). The settled card had no
  choice buttons. Publication `40787c5c-d413-46b2-ad90-d21f209c7476` encountered
  one definite pre-provider policy-lock retry, then updated the same work
  message once; it was not an ambiguous delivery or duplicate response.

Both answer deliveries had one attempt and zero errors; both continuations have
persisted answer attestation and authorized presentation. The separate original
human reviews remain pending with no resolution timestamp. An independent check
of actual Codex `turn_context.model` events confirms `gpt-5.6-luna` in all four
source/continuation runs, not merely in the agent's configured model.

The Telegram answer run page shows **PAPERCLIP RUNNER openai / gpt-5.6-luna**,
the canonical **Amber** result and 51 events. Its Runner Inspector works with
raw provider capture **off**, exposing canonical events and persisted
presentation decisions privately in Paperclip. External chats received the
selected answer, not private reasoning or tool events.

The stronger wording instruction still did **not** fully pass the live media
retest: Telegram `71c44d92-9026-436e-ad03-384a44494e7e` (30.960s) retained
prepared/waiting boilerplate; Discord `1a7341d9-4f54-43ec-a868-050c3dfcb91d`
(70.375s) still added an unconfirmed-delivery caveat. Their original files were
visibly delivered once, all on publication attempt one: Telegram image
`417200359:89`, Discord note `1546794573777604631` and PNG
`1546794580345749514`. Transport passes; model wording remains a quality gap.

The independent earlier-file latency audit attributes the Discord/Telegram
25.017s difference mostly to provider/model time between additional inspection
and reuse steps, not scheduling. Explicit provider-start queue was 117–162ms.
Discord's 63.188s run comprised 1.934s startup, 51.378s provider/model residual,
4.231s preceding tools, 0.194s finish tool and 5.451s settlement. That settlement
includes the deliberate five-second semantic-result grace before controlled
provider cancellation; reducing it requires a separate correctness proof for
durable suffixes and session suspension. These overlapping runs are one workload
sample, not a controlled model benchmark or proof about the earlier 98s outlier.

### Atomic chains and completion-field contract (September 8, 08:24 UTC)

Committed/pushed `67bdc52f4` for bounded sequential questions and `161212685`
for completion-field descriptions. Root passed **1,322/1,322** native runtime
tests, **299/299** chat integration tests, **89/89** runner completion/actual
Codex transport tests, **33/33** checkpoint tests, emitted server compilation,
and runner TypeScript build. The deterministic chat browser suite also passed
**9/9** (all five setup flows and four Board file-batch recovery states).
No Rust binary, generated protocol artifact or lockfile edit was needed.

Chains now support at most eight linked single-choice answers from one original
direct-chat comment. Every ancestor is reconstructed from durable answer/action/
delivery/wake records and current identity/reach; cycles, duplicates, altered
ancestors and a ninth hop fail closed. Authorization and response materialization
share a short nonblocking-lock transaction. A real PostgreSQL barrier test
blocks a coherent answer/action/receipt rewrite until the authorized input is
captured, then rejects the changed chain on the next read. No provider I/O holds
those locks. Answers enter the existing immutable native execution input used
for replay; this is not a zero-persistence claim and creates no extra durable
wake/chat/task answer copies.

The clean `161212685` live process reports the correct loaded health version.
All four real provider-session declarations contain the updated completion
schema and description. The existing fingerprint mechanism correctly starts a
new Codex session with full task context while retaining each Paperclip
conversation, task, attachments and audit history. Actual `turn_context.model`
events confirm `gpt-5.6-luna` in all four initial runs and the Discord correction.

- Slack `3b9b46c4-e636-4a2f-8240-3cc126fc329c`: 14.864s run; exact visible
  `SLACK-LUNA-CONTRACT-READY`, one publication at 08:24:38.554.
- GitHub `2ac53402-2024-4203-b4d9-fea5fa21cdf0`: 13.299s run; exact visible
  `GITHUB-LUNA-CONTRACT-READY` in the same inline fixture thread, comment
  `3955842490` at 08:25:03.120. No repository operation.
- Telegram `3e644cd2-b25a-4c5d-affc-22ff161b9ea1`: 41.235s run; original photo
  visibly delivered once at `417200359:92`. Waiting/unconfirmed-delivery wording
  disappeared, but an unnecessary prepared-attachment sentence remains.
- Discord's initial sequential request `b747a717-e0ff-4a84-88c6-91f9ec6a7bfc`
  did **not** create a native question: its canonical summary fabricated relative
  choice links, which the safe renderer reduced to a text list. A natural
  correction `37800c84-281e-486f-9e63-15241221f6c4` then used `paperclip_block`
  and falsely claimed the choice interaction was unavailable. Neither run
  invoked `request_human_input`; no question interaction was created.

The actual Discord session's 23-tool declaration does contain
`request_human_input`, including its required fields and question interaction
kind. This is not a missing-tool or provider-outage finding. Its current live
description says **active mock task**, and the native chat prompt gives no
structured-question exception to the zero-API text shortcut. Production
descriptor/guidance correction and another live test are required; these failed
requests do not qualify sequential interaction behavior.

The next correction keeps the generic mock catalog unchanged and overrides only
the real authority's advertised description. Native external-chat guidance now
explicitly selects the real structured-question tool, forbids fabricated answer
links, and explains one-at-a-time continuation. Its documented argument shape is
`payload.questions`, matching the production authority and declared schema;
there is no `questionSpec` argument. The retained-tool fingerprint advances to
v10 so already-open Codex sessions receive the corrected declaration without
resetting Paperclip task history. Root's combined prompt/authority/checkpoint
suite passes **56/56**, with server typecheck passing. The real authority test
creates the documented question on an in-review, human-review-required task,
replays it idempotently, and verifies the original task/review state and one
audit event. Live requalification is still required.

### Live sequential questions pass (September 8, 08:38–08:40 UTC)

The clean `7df7d4ca1` live process reached startup-ready at 08:38:32.585;
the verified webhook proxy stayed running. Root repeated the same natural
two-question request in the existing Discord and Telegram conversations.

- Discord: source `1e79740e-670f-4926-8752-a65bd06ae9a4` took **10.192s** and
  displayed real Amber/Cobalt buttons. The Cobalt click at 08:39:12.587 settled
  `dd3a3984-0844-498c-bd52-0ec519cba4eb`. Continuation
  `a7a34328-1dfb-44a4-8134-a78faaa2501f` took **15.268s** and displayed a new,
  separate Apple/Pear question (`303e8bba-7d8f-4c4e-8a38-61d4e7d72531`).
  The Pear click at 08:39:42.027 led to
  `5c5394c1-0ec1-4bf3-817c-357076b28513` (**19.009s**) and exactly
  **Cobalt Pear**, visibly delivered once at `1546802203795390525`,
  08:40:04.504 (publication attempt one).
- Telegram: source `926f9adb-1d73-407d-9da7-e8e9a65b1329` took **9.071s** and
  displayed real Amber/Cobalt buttons. The Amber click at 08:39:21.032 settled
  `f374a67e-f48f-4097-b3bc-cc318937ce96`. Continuation
  `cb7468ef-5ccc-4203-ad7d-13aed9b1f388` took **13.344s** and displayed the
  separate Apple/Pear question (`1be9f0f0-0335-4e71-bd82-509c7bc4bc16`).
  The Apple click at 08:39:55.677 led to
  `5742e514-7e3f-464c-80cc-0d7ed41c7c04` (**17.804s**) and exactly
  **Amber Apple**, visibly delivered once at `417200359:96`, 08:40:16.984
  (publication attempt one).

Both provider UIs removed the controls from each answered card. There were
exactly two questions and three runs per conversation, with no duplicate answer
or follow-up work. Screenshots show the resulting cards and final Discord
answer; Telegram's settled answer was verified in its live accessibility state.
The original independent human-review interactions remain pending with no
resolution timestamp. These journeys pass functionally and the interaction
experience is substantially improved: actual controls, one question at a time,
visible working feedback, and a concise answer preserving both selections.
All four answer deliveries have one claim attempt, zero errors, and exactly one
fallback-wake target. Both tasks remain in review.
An independent audit of actual Codex rollouts confirms **gpt-5.6-luna in all
six turns**, four real `request_human_input` calls using `payload.questions`,
and two real `paperclip_finish` calls yielding to `response_wake`. All four
provider-session declarations contain the corrected real-task question and
completion descriptions. Each channel retains its task-scoped workspace;
the first question uses a fresh provider session and the two answer turns
share a resumed provider session. No Terra substitution occurred.
The final-answer click-to-publication times were **22.477s** (Discord) and
**21.307s** (Telegram), distinct from run duration and not a general latency SLO.

An independent source audit also confirms the native tracing boundary: rich
run events and the Runner Inspector remain private in Paperclip. External
providers currently receive only coalesced queued/working/waiting/completed/
failed milestones, authorized final responses, files, and supported question
controls. Raw tool activity is not relayed. Long turns still have coarse
"working" feedback; richer public progress would need its own closed,
cadence-limited phase mapping, not forwarding Board snippets or tool names.

One run-log timing presentation gap remains: the final Discord run's
`task.run.measured` span reports 69.091s because its start comes from the
original provider comment at 08:38:49.891, including the preceding question
and human-answer wait. The current run actually starts at 08:39:42.527 and
finishes at 08:40:01.536 (19.009s). This is an ambiguous aggregate-span label,
not evidence of a 69-second current model call. The latest run and its private
Runner Inspector are open in the Board for inspection; raw capture stays off.
