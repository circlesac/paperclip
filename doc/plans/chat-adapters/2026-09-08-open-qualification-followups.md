# Temporary chat qualification handoff

This note is for the implementing agent. **Delete it when the remaining items
are fixed or moved into permanent verification documentation.** It is not a
release-completion claim. Completed work and historical failures are recorded
in [the permanent qualification log](2026-09-08-chat-queue-and-webhook-repair.md).

## Landing status

- Code head `ea8e45e17` is pushed and mergeable in PR #13038, **500 files**.
  Greptile reviewed that exact head at **5/5**, explicitly all 500 files,
  with zero new comments or unresolved findings. Full merged workspace
  `pnpm -r typecheck` and `pnpm build` passed. Normal build staging replaced
  the runner inode but preserved its exact signed bytes and hash. Consult
  the PR for current CI status; run `34262337249` was still running without
  failures when this evidence was recorded. Do not treat earlier green lanes
  as proof that its remaining lanes passed. The latest documentation checkpoint
  must also receive its normal final-head gates.
  Server 51 now runs that merged code. New native Luna continuations passed
  in Slack/GitHub/Telegram in **16.188 / 17.441 / 14.776 seconds**. A separate
  Slack in-flight pair proved durable deferral, exact per-comment isolation,
  no overlapping runs and one queued→working→final provider message. The
  permanent log below records the timing and visual-proof boundaries.
- Fixture follow-up `9668530e1` passed the exact CI Rust release-workspace
  command: **480 passed / zero failed / one ignored**. Debug Codex and native
  backend targets also passed **66 + 10**, with the existing Codex subprocess
  helper ignored. The signed/staged binary hash is unchanged. The current
  master merge incorporates `f65991a5f`: managed GitHub sandbox PATH and the
  extracted run-dispatch module. Preserve cancelled interaction continuation
  in the new shared classifier and source-only status-event projection from
  the committed run. Two classifier cases went red to green; the final
  classifier suite is **16/16**. The initial merged server typecheck identified
  the missing source bridge; its final check passes after repair. Pure merge
  compatibility is **298/298**, status/context consumers **12/12**, module
  boundary tests **3/3**, and the new PostgreSQL adapter **19/19**, including
  eight source-projection cases. Three serialized database suites then passed
  **52/52**: retry scheduling, stale-queue invalidation and task-drain admission,
  including rollback and handoff-lock checks. All fixtures cleaned up normally.
  Server and adapter-utils TypeScript and the
  actual module-boundary check pass. The combined PR is **500 files** after
  archiving only the superseded v3/v4 design notes in Git history. Current
  designs, generators and qualification evidence remain available. Final
  merged-head CI/review remain required; the later deployment is recorded below.
- Preceding pushed head `a756325e0` received Greptile **5/5**, with all 497
  files reviewed and no unresolved finding. Its CI `34260240654` exposed a
  Rust import-order mismatch in the fake provider: standalone formatting had
  used a different convention from the workspace's edition-2021 check. Both
  Build and Typecheck stopped at `cargo fmt --check`; their downstream build
  and release-registry steps did not run. The preceding runner Vitest suite
  passed **1,703 tests / three skipped**, including the 1,024-event suffix
  case in **7.823 seconds**. That observation does not establish the cause of
  the older first-close failure. Fix the formatting with the exact workspace
  command, not standalone defaults.
  Additional local compatibility passed **88/88** staged transport tests,
  then exposed seven positive-completion wait failures in the Rust provider
  tests (**59 passed / seven failed / one ignored**). Empty polls wait up to
  one millisecond; 16/32 iterations are not a reliable subprocess completion
  deadline. Condition-based waits preserve exact identity and authority checks.
  The missing-ID fixture also must buffer its completion before the malformed
  reply intentionally triggers process termination. A further interrupt wait
  went red to green with a controlled asynchronous terminal. The final debug
  Codex target passed **66 tests / one ignored**, with eight positive waits
  corrected and all safety assertions retained. The adjacent native backend
  and full release-workspace gates subsequently passed as recorded above.
- Earlier continuation: documentation head `179fb5a53` received Greptile
  **5/5**, with no open finding. Its CI `34257833081` failed the runner Build
  lane: the real-transport 1,024-event suffix test rejected its first close
  with `NativeSessionCloseUnrecoverableError`. This is a test failure, not a
  dependency-restore or PostgreSQL bootstrap failure. Investigate the stop,
  drain and suspension boundaries without weakening fail-closed assertions.
  The completed CI run has only that failed lane and its failed aggregate;
  the remaining lanes passed. Merge `7401e6a72`
  then incorporated master `db85bf4b7` (simpler production GitHub repository
  controls) cleanly. The six-file UI compatibility cohort passed **221/221**,
  and all four token gates passed. Final-head gates remain required.
- The first-close failure passed in isolated release/debug repeats. A pair of
  concurrent debug stress fixtures exposed a separate fake-provider state race:
  one first close succeeded, then a truncated state file reset its counter and
  successor turn identity was correctly rejected. The fixture now uses atomic
  writes, persists before terminal output and rejects malformed existing state.
  Three deterministic cases went red to green; all **seven fake-provider unit
  tests**, a concurrent **2/2** stress repeat and final **3/3** staged transport
  cases pass. Runner TypeScript and merged UI TypeScript pass. The standalone
  Rust-format check missed the workspace convention, corrected above.
  Closed failure diagnostics
  retain the original and successor epochs without raw payloads. No production
  runner guard or deadline changes. This does not explain the original CI
  first-close failure; preserve that qualification and renew final-head checks.
- The user asked to prepare the PR while testing continues. This supersedes
  the earlier instruction not to tend PRs.
- [PR #13038](https://github.com/paperclipai/paperclip/pull/13038) is open, not
  merged. Keep one PR: code/test checkpoint `dcc931d8d` is **497 files**, below 500. At its preceding production head `aaa74597f`, CI `34255076310` passed
  every lane. Greptile reviewed that exact production head at
  **5/5** with no outstanding finding. A reproduced early-turn
  semantic-call race is fixed in `46a946aae`. Master `be6bb768b`
  (accessible-company navigation) is incorporated in `49de75691`; the diff
  remains **497 files** with no lockfile delta. Renew final-head gates after
  the test-fixture cleanup and documentation follow-ups. The cleanup and live
  file/image record are pushed in `dcc931d8d`; final branch-head gates must
  include the subsequent reasoning-effort evidence correction below.
  A final direct-driver malformed-response edge is also fixed: clear the
  optimistic turn before rejecting a response without `turn.id`. Its
  deterministic repro went red to green; **178/178** focused driver tests
  (including 17 integrity/composition cases) and runner no-emit typecheck pass.
  The native transport already rejects this malformed response; the additional
  driver defense was compiled and deployed on server 49 after the broad run.
- The default-off **Experimental > Chat connectors** setting is implemented.
  Production GitHub tools remain visible and open directly without the
  chat/tool choice when disabled. Default-off and enabled browser flows passed.
  This is a UI visibility gate: active connections continue delivering until
  explicitly paused.
- Master is incorporated through `be6bb768b` in merge `49de75691`. Its
  accessible-company compatibility check passed **256 UI + 32 server tests**;
  full workspace typecheck and build passed again on the merged branch.
  Previously, master `5752d6bd9` was incorporated in `48767c1c0`. Its
  sandbox startup/recovery compatibility cohort passed **246/246**. Full
  workspace typecheck/build also passed with the integrity production changes.
  Previously, master through `023e640a7` was merged in `21061f4de`. Full
  workspace typecheck/build passed after this latest database-pool/shutdown
  merge. Chat reconciliation and runtime shutdown remain awaited before pool
  closure. The merged database/shutdown compatibility cohort passed **71/71**.
  The earlier skill-cache merge passed 80 skill-cache,
  203 workspace/session, 38 native trace/progress and two preparation tests.
  Both chat ingress timing and upstream skill-preparation tracing are retained.
  There is no PR lockfile delta. Preserve the upstream migration prefix and
  all deployed SQL hashes. A new provenance-only migration follows the
  original 254 migrations instead of changing their contents.
- CI at `683067cea` passed every substantive lane except one Slack modal
  race in general-server shard 1/5. The fix is `3182b0373`: deterministic
  Slack/Teams red-to-green, **11/11** focused tests and independent auth review.
  A subsequent local full run was **389/390** because an earlier synthetic
  Telegram retry fixture leaked into a later GitHub global drain. Exact fixture
  cleanup then passed a fresh **390/390** rerun in 91.68 seconds after 254
  normal migrations. The GitHub four-wake assertion and production worker are
  unchanged. Focused tests and server TypeScript checks also pass.
- Greptile reviewed `cd5970276` after the explicit soft-limit override and
  scored it **4/5**. Its one P2 is stale migration provenance: migration 0251
  still names its former 0245 number. Fix `e3cfc400e` adds forward-only 0256;
  it preserves all deployed SQL hashes and changes only exact provenance and
  generated audit text, never replaying retirement or rekeying. Two tests went
  red-to-green; the final reconciliation cohort is **5/5**, root's migration/
  client/snapshot/safety cohort **48/48**, and DB build/typecheck passed.
  Independent code review found no issue. Greptile subsequently reviewed
  `2ded499ed` at **5/5**, with the P2 resolved. CI run `34248557216` passed
  **all lanes** at that exact head. Greptile also reviewed integrity head
  `d886f52c0` at **5/5**, with no outstanding findings. CI `34251447214`
  encountered fourteen pre-install artifact-restore failures: HTTP 403 from
  an intermediary when listing the policy-generated lockfile artifact. The
  artifact exists and sibling jobs restored it successfully. The recovery-copy
  follow-up will start fresh final-head CI; do not rerun superseded jobs merely
  to make the older head green. If the new head has the same transient failure,
  let its jobs finish, inspect outcomes, and retry only failed jobs. Do not
  count unexecuted tests as passed or rewrite the lockfile.

## Current deployed state and evidence

The live server was restarted at **18:20:56.016 UTC**, log
`.paperclip-runtime/chat-adapters-live/server-experimental-landing-51.log`.
It started from clean head `ea8e45e17`, including the merged run-dispatch
module, source-only status bridge, final malformed-response guard and
turn-admission patch. There were zero active/queued runs before shutdown.
The normal five-second HTTP drain expired on remaining browser connections;
provider cleanup completed and the old process exited before restart.
UI files use Vite development middleware; root reloaded the Board and saw its
active connector catalog without an error banner. Full workspace build passed
after restart; normal staging preserved the exact signed runner bytes.
The same native production code on server 47 passed Slack/GitHub/Telegram
continuation smoke checks, returning exact answers in **14.741 / 18.018 /
15.940 seconds**, on the
same tasks using native Luna. The earlier server-46 restart applied migration
0256 normally and its smoke returned in 13.146 / 17.148 / 16.602 seconds.
Each working/final operation used one attempt and updated one provider message.
Its private Board is at `http://127.0.0.1:3103`. Keep the public verified
webhook proxy separate from the private Board.

All four active connections use immutable Maya E2E with **Paperclip Runner →
Codex app-server → `gpt-5.6-luna`**. The agent configuration retains a legacy
`modelReasoningEffort: "low"`, but the native execution path does **not**
forward that field. Effective reasoning effort is unverified; do not describe
these as proven low-reasoning runs. This is pre-existing on master and is
documented in the permanent record's reasoning-effort correction. Verify the persisted
execution profile for new runs; do not substitute a legacy adapter or silently
switch to Terra. The signed/staged runner SHA-256 is
`e758b7cdb6ba7c9f176d89cbd17b98dc4c42975326012582d6a7cdf230fb0373`.

- Root core **231/231** and real staged transport **88/88** passed after the
  latest prose fix. Authored finish/block summaries preserve the existing
  12,000-codepoint limit; generic diagnostics stay 4 KiB. Final sanitization
  occurs before sealing the persisted semantic digest; invalid incoming
  digests still fail closed before receipt lookup/enqueue.
- Typed irrecoverable cleanup: runtime **74/74**, executor **159/159** and the
  88 transport tests. Temporary failures still retry; retained ownership and
  quarantine are not bypassed.
- Targeted session reset `6dab18bba`: **217/217** compatibility tests,
  including seven new real-PostgreSQL alias cases independently rerun by root.
  Only the current same-company issue UUID/identifier is resolved; other
  tasks, agents, adapters, custom keys and model-claimed aliases are preserved.
  This fixes the UI UUID versus chat identifier mismatch, not runner quarantine.
- Deterministic browser **10/10**, native question/wait **130/130** and
  Experimental flag/UI/server/shared cohorts passed. Release compatibility
  **109/109**, preview/ACPX **23/23** and patch-routing **6/6** passed. The last
  six use synthetic actual-hunk fixtures, not fresh npm installs.
- Fresh long answers reached Slack, Discord, GitHub and Telegram in **45–49
  seconds** end to end; native Luna used **43–47 seconds**. Full provider
  replies or opened Discord/Telegram files retained the ending beyond 4 KiB.
  Discord/Telegram use a timeless message-limit explanation instead of stale
  “preparing” text. Each publication operation used one attempt.
- The later `PROSE-FINAL-0908` retest preserved all observed token-noun phrases
  in all four providers in **26.5–27.8 seconds** end to end. Historical replies
  were not edited. Closed grammar protects the known prose without exempting
  arbitrary English words, credential-shaped values, assignments or nested keys.
- Post-master Slack continuation also passed: `SKILL-CACHE-MERGE-READY` arrived
  in **19.286 seconds**, including **15.583 seconds** native Luna execution.
  The working indicator cleared, the same provider message was updated, and
  each operation used one attempt. This is one post-merge smoke check, not a
  repeat of the entire four-provider qualification.
- The broad local `pnpm test:run` originally stopped after its general-server
  phase: **8,117 passed, 34 skipped, four failed**. Those failures have focused
  passing fixes and the later CI lanes provide broader evidence, but do not
  claim that original full command passed. Do not upload that old log: its
  CLI-guard failure quotes ignored historical runtime prompts.
- The new broad run also stopped at general-server: **8,208 passed, 30
  skipped, one failed** in 1,140.14 seconds. The new real-runner damaged-root
  recovery test failed at `native-session-resume.test.ts:740` because its
  event stream closed before a terminal fact. An exact isolated repeat passed
  in 13.39 seconds; that does not resolve the broad failure. The fixture owner
  is adding bounded failure-only diagnostics and repeating under the stable
  wrapper's isolated environment. Keep every ownership/archive/result guard.
  The remaining workspace groups and serialized suites are running separately;
  the monolithic command did not execute them and must not be called passed.
- Workspace B finished **2,996 passed / 60 skipped**. Workspace A had **6,083
  passed / one skipped / three failed**; all three failures were embedded
  PostgreSQL bootstrap failures in the CLI worktree suite, before assertions.
  The full affected suite later passed **63/63** unchanged with exclusive
  database-test access. One serialized server suite had the same bootstrap
  failure (11 skipped), then the entire serialized group was restarted alone.
  macOS had 29–30 shared-memory segments against a 32-segment limit; contention
  is a supported inference, not captured historical PostgreSQL stderr. Do not
  alter global IPC settings, delete segments, or stop unrelated databases.
  The UI portion of Workspace A passed **5,608/5,608** across 570 files.
- The damaged-root test then passed five focused wrapper-environment repeats
  and six complete **35/35** file repetitions, zero skips. The original broad
  failure is still not causally proven. Separately, a deterministic driver
  test proved a valid `paperclip_finish` can arrive before turn-start admission
  and be rejected as `tool_binding_mismatch`; a wrong-turn negative also ran.
  The verified fix adds exact turn-admission barriers in transport and driver,
  with epoch/identity and typed-fault checks. The final authenticated composed
  cohort is **16/16**; controller/transport/driver/backend **326/326**, runtime
  **85/85**, and post-fix real-runner recovery **35/35**, zero skips. Full
  workspace typecheck/build and a fresh chat integration **390/390** pass.
  Do not substitute a timing delay or weaken the old-owner/archive/result
  assertions. Failure-only fixture logs remain bounded and contain synthetic
  fixture state only. The next complete `pnpm test:run` stopped in general
  server with **8,207 passed / 30 skipped / two failed**, in
  `admission-workspace-tests-final-0908.log`. It began before the small
  accessible-company master merge and
  final malformed-response defense; those changes have separate 288-test
  compatibility/typecheck/build and 178-test driver/typecheck proof.
  The two failures are now reproduced deterministically: an earlier active
  Slack rate-limit fixture retained a publication due after five seconds.
  A later global drain claimed it alongside the intended receipt fixture;
  that first failed assertion left a receipt which contaminated the next test.
  Advancing only Date by six seconds reproduces both strict-count failures.
  The repair is exact fixture teardown, not relaxed counts or a production
  worker change. The repaired full integration file passed **390/390** on
  fresh database `_06` in **102.93 seconds**. The only subsequent test edit
  caps failure-only diagnostics at 20 synthetic rows; final-byte focused
  confirmation passed **10/10** affected classifier/receipt cases.
- Continuing workspace groups separately: UI **5,614/5,614**; nine remaining
  workspace-B projects **2,170 passed / 19 skipped**; full DB project with
  one worker **122 passed / six skipped**. The original workspace-A command
  had **477 CLI passes / two failures**, and workspace-B stopped at DB with
  **89 passes / 38 skips / one failure**. Captured PostgreSQL stderr now
  confirms host shared-memory exhaustion for the CLI bootstrap failures.
  A separate CLI retry initially used noncanonical `/tmp` and failed 14 path
  guards; that invocation was an agent harness mistake, not a code regression.
  The corrected canonical single-worker run finished **478 passed / one
  failed**: a source/target embedded-PostgreSQL bootstrap still could not
  start with the host at 30 of 32 shared-memory segments. No global setting
  or unrelated process was changed. The serialized group then stopped at
  suite **97/143**, with **1,504 passed / 21 skipped** and no assertion
  failures. Queued-comments route fixture bootstrap failed; **46 suites were
  not reached**. Captured PostgreSQL stderr was `shmget ... No space left on
  device`, with host usage at **32/32** segments. No positively identified
  current-task cluster remained to clean up. Do not retry unchanged limits.
  These failed command results remain failed; serial reruns are separate
  evidence. Do not change global IPC limits or stop unrelated databases.
- New server-48 live file checks passed on native Luna: a new GitHub private
  main-conversation image imported exact fixture bytes and was inspected in
  **26.303 seconds**; a new generic private text file was truthfully reported
  unavailable in **21.116 seconds**, without substituting an older attachment.
  Slack and Telegram returned a new 152-byte text file in **46.266 / 54.863
  seconds**. Root downloaded the provider-returned copies through each real
  browser UI; both match the source SHA-256 byte-for-byte. This proves ordinary
  file handoff, not the attachment-reuse tool or every restart/revocation case.
  Server 49 then passed a new private GitHub **review-thread** image in
  **31.028 seconds**, with exact new source/root/body/asset and stored-byte
  matching. A post-restart Slack continuation returned its exact answer in
  **17.297 seconds**. Both used native Luna and one attempt per publication.
- A real signed GitHub **changed-source** replay passed on server 50. Root
  uploaded a new private image, changed only its source comment while ingress
  was unavailable, then redelivered the exact original failed event through
  the App's supported webhook API. The canonical body mismatch rejected the
  image before signed-target selection. There were no imported/generated
  attachments or view events; one native Luna run replied truthfully that the
  exact image was unavailable, **17.755 seconds from ingress**. This is not
  deleted-source or in-flight revocation proof. A separate bot-created callback
  received a **502 in 0.1 seconds**, before reaching the instrumented local
  proxy. Its destination exactly matched the App configuration and adjacent
  successful deliveries; its cause remains unproven. Do not call it a safely
  filtered self-event or a fixed transport defect.
- Explicit `reuse_chat_attachment` now has separate live proof in Slack and
  Telegram: one applied action receipt and matching reused-source work-product
  metadata per run, original inbound source and current conversation authority,
  and one-attempt file publication. Root downloaded both new provider files;
  both match the original 152-byte hash. File delivery took **24.163 / 27.865
  seconds**, including **20.647 / 24.747 seconds** native Luna execution.
  This is an explicitly requested action test, not a universal natural-language
  routing or all-permutation claim.

## Remaining work

1. **Finish landing verification.** Update/push the verified fixes and PR
   description, then obtain green CI and Greptile review. The final fresh chat
   rerun is **390/390**; fix any new CI findings without weakening assertions.
   Leave checklist items unchecked while their evidence is missing.
2. **Protocol-fault follow-through.** The original
   authenticated digest mismatch can leave “using tools” visible until the
   900-second deadline. Commit `d886f52c0` adds the typed, latched fault
   after exact authentication/correlation/sequence checks; bad events cannot
   ACK or dispatch, and ordinary persistence failures remain retryable.
   Controller/staged transport **130/130**, middle-layer **238/238**, runtime
   **78/78**, and root executor/coordinator/safe-copy **183/183** passed.
   Independent review then found executor diagnostic/cleanup writes could
   still replace the primary fault, and a pre-completion runtime observation
   gap. Both now have red-to-green fixes: executor **166/166**, runtime
   **85/85**, and combined runtime/middle-layer **323/323**. The final local
   integrity check precedes the first `completeRun` invocation; once admitted,
   acknowledgement-loss retries preserve potentially committed success. This
   is not an atomic fence with a remote database commit. The final encrypted
   controller-to-driver/runtime negative-path composition passed; its combined
   cohort is **132/132**, using a synthetic process launcher and persistence
   port. Full workspace typecheck/build and **10/10** deterministic browser
   tests pass. The production patch is deployed and reviewed at 5/5; exact-head
   CI passed at `aaa74597f`. Renew those gates for the test-only cleanup and
   preserve the broad local failure/environment qualifications above.
   Safe external copy directs users to an admin without exposing protocol
   details. No fabricated corruption may be injected into a live provider root.
3. **Damaged-session recovery.** Telegram `CHA-24` run
   `a4938fcc-dc2c-4146-a776-12512cf4b613` failed at 14:17:07 with a suspended
   runner but unacknowledged historical semantic event 44. Preserve that
   evidence. The successful Telegram long answer used normal `/new`, waited
   for its visible acknowledgment, then created **CHA-26**. This is not proof
   of old-task recovery. Qualify normal operator reset or the guarded
   corrupt-event → rejected warm attach → continuity-break replacement.
   Never hand-repair the digest or clear safety state to force success.
   The earlier first replacement request sacrificed to safe quarantine is
   also an unresolved operator-UX gap.
   New deterministic composed evidence: **35/35** resume tests, including a
   real runnerd + PostgreSQL + driver/runtime/control-plane path from a
   generated damaged historical root to exactly one persisted accepted result
   on the same task/agent. Active old ownership blocks rotation; archived
   runner bytes and the invalid pending event are preserved. Only the provider
   and historical corruption seed are synthetic. This uses persisted execution
   v2 and is not actual live `CHA-24` recovery or external publication proof.
   A normal Board **Try again** at 16:35:06 UTC produced a 24-second native
   Luna run on CHA-24, but resumed its older UUID-keyed session and retried the
   original photo request instead of the latest failed chat request. Therefore
   this does not qualify the damaged identifier-keyed root. Both archived
   state-file hashes stayed unchanged. The old conversation is completed
   generation 9; current CHA-26 is generation 10. No message was published to
   Telegram and attachment access stayed denied, correctly preserving that
   boundary. Investigate truthful retry context and explicit retired-chat
   feedback; do not restore obsolete access to make this check pass.
   The task-list label **Observing active run** also misrepresented a
   Board-owned terminal recovery action. The shared badge and expanded card
   now require a human decision for Board-owned watchdog recovery. **125/125**
   UI tests, UI typecheck and all four styling/token gates pass. Root reloaded
   the live UI and verified **Recovery needed** on existing CHA-6 in Tasks and
   Inbox. The expanded card has component coverage, not a live visual retest.
   The generic retry routes that lose the failed request already exist on
   master. Follow up with an explicit server-authorized failed-run retry:
   preserve exact task key/comment lineage, recheck active chat generation
   and current permissions, reject retired context before mutation, dedupe
   retries, and retain operator-required integrity recovery. Do not silently
   choose a different session or restore completed-generation access.
4. **Conservative prose redaction.** All observed game-token phrases now pass
   live, but unfamiliar token-noun phrases can still be over-redacted. Preserve
   low-entropy credential coverage; no arbitrary-word/entropy heuristic.
5. **Telegram upstream latency.** One request spent 234.435 seconds before
   reaching the local proxy; Luna then used 13.433 seconds. A later request
   reached the proxy in 0.583 seconds and finished in 16.228 seconds without
   configuration changes. Localized, not explained or fixed.
6. **Remaining provider permutations.** Discord's real 30-second server pause
   exceeded its 15-second lease and recovered a message/reaction once; later
   continuity passed. Live second-process takeover is still unqualified.
   Continue the remaining file/image/interaction cases in the browser runbook.
   Do not merge or edit the disposable GitHub test repository during chat QA.
7. **Teams external gate.** There is no qualified Microsoft 365 tenant/admin
   setup. Deterministic tests are not live Teams qualification. Continue other
   providers while this real external gate remains.
8. **Discord browser login required.** The current Eigenjoy browser session
   expired when reopening the conversation. Its login page is open and the
   user was notified. The bot endpoint remains active; Slack/GitHub/Telegram
   browsers are signed in. Do not claim a new Discord live retest until login
   and a visible conversation result are verified.
9. **Native reasoning selection.** The legacy configured-low field is ignored
   by the current native path. Luna is verified, effective effort is not.
   This behavior also exists on master. Keep the recorded qualification honest;
   a future closed-contract reasoning setting needs its own native new/resume
   tests and live provider proof, not a silent legacy-field passthrough.

## Working guardrails

Work only in `/Users/dotta/paperclipai/branches/chat-adapters`, branch
`codex/chat-adapters`; preserve uncommitted work. Root owns Git, the live
server and signed-in in-app browser. Delegate disjoint implementation/tests.
No filesystem/command approval prompts. Stop only for actual external login,
MFA, admin consent or a required secret the product cannot generate.

Never export raw reasoning, tool arguments, internal logs, credentials or
private file URLs to chat. Preserve current permissions and one external
thread / one task identity. Never replay `delivery_unknown` without the
explicit audited resolution. Keep all real credentials and runtime artifacts
out of Git. Do not put instance-local IDs or tailnet URLs into the public PR
description. Use a fresh fixture database for every full integration run.
