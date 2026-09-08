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
The live database has not been migrated by these checks.

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

## Remaining qualification

The loaded live server is still checkpoint `9277e0dc5`; these integration changes
must be built, staged and deployed coherently with a live database backup first.
The locked Rust build alone does not stage or qualify a replacement live binary.
Do not use old staged runner artifacts as evidence for the newly built revision.

The Rust-backed driver cohort passed 86/87 against the old staged runner, with
the cold-restore launch-binding regression failing against that old artifact.
Rerun it after staging the matching rebuilt runner. The whole-workspace build
and test suite have not been claimed green.

Live model qualification remains limited by the observed Codex capacity gate.
The in-app browser input outage also needs recovery, and Teams still requires a
work/school tenant and the necessary bot/admin setup. Real cross-person GitHub
push qualification needs two authorized users/accounts and a disposable repo.
New Slack delayed-upload receipt recovery, native overflow/history resend and
GitHub line-specific review replies still need the live passes described in the
existing qualification notes. This checkpoint is not a production-ready claim.
