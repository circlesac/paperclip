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
