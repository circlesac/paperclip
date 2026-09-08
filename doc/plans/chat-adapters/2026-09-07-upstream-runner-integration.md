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
