# Temporary chat qualification handoff

This is a working note for the implementing agent. **Delete this note when
the items below are fixed or recorded in permanent verification documentation.**
Do not treat this list as a release-completion claim.

## Landing priority

The user has now asked to prepare pull requests for master while testing
continues. This supersedes the earlier instruction not to tend pull requests.

1. Put chat connector UI behind a default-off **experimental chat connectors**
   setting. Keep existing production tool connectors, especially GitHub,
   available without the chat/tool choice when the experiment is disabled.
2. Master reconciliation is committed as `e91b236ff`, against upstream
   `297d8741f`. The tested source and migration order are preserved; the merge
   inherits upstream's lockfile with no PR lockfile delta.
3. Use the fewest reviewable PRs. Check the actual changed-file count against
   Greptile's 500-file limit; do not split channels unnecessarily. Retained
   prototype/wireframe iterations currently inflate the branch's count.
4. Fill the repository PR template, report verification limits honestly, and
   obtain reviews before claiming the work ready to merge.

PR [#13038](https://github.com/paperclipai/paperclip/pull/13038) is open as
one 473-file review against master. It is mergeable; CI and review must still
pass before landing. Master is incorporated through `b97101893` by
`1a442f5a0`, including the new project repository selection flow. Independent
compatibility checks passed 138 UI and 19 server tests. Full workspace
typecheck and build passed again after that second merge.

The visibility flag is committed as `56c096e5e`; the pasted-URL shortcut
correction and exact recovery-test settlement wait are in `2feb8375f`.
The real default-off GitHub tool flow and enabled chat catalog both passed
browser inspection. Chat connectors are enabled on the existing live test
instance so qualification can continue. Full workspace typecheck/build and
the final 390-test chat integration rerun passed. The broad suite is still
running. Its CLI guidance failure was caused by ignored historical runtime
recordings, not current source guidance. Commit `9beee1d14` excludes only the
root recordings directory; all 38 focused guard tests pass without changing
the command allowlist. Do not upload the earlier failure log, which quotes
captured prompts. The first browser run passed all six catalog/provider
journeys, then found that the four Board-send fixtures still needed to opt
into the new experiment. After correcting those mocks, the full browser suite
passed **10/10** on isolated port 3199 and a fresh external PostgreSQL database. Local
embedded PostgreSQL exhausted macOS IPC slots during concurrent test work;
one orphan from this task's own completed browser run was cleared without
deleting database files or touching another worktree's processes.

CI on the initial PR head is **not green**. Follow-up work covers the clipboard
fallback guard, a uniform cross-company identity-preview response, legacy
migration and route fixture compatibility, a buffered-tool diagnostic test
race, and a bundled ACPX patch applicability failure. Native recovery now
passes **9/9**, the migration rollback test **1/1**, and the corrected durable
diagnostic assertion's full staged transport suite **87/87**. Greptile's
automatic review refused the 100-file soft limit; the requested explicit
`@greptile-apps` override is posted, but no review-start acknowledgment or
completed review is visible yet. Do not report the review as accepted.
The issue route fixtures also pass **92/92** after adding the missing left-join
mock and the fifth database argument to comment assertions. The clipboard and
identity-preview cohort passes **37/37**, with both server and UI typechecks.
The parked-answer fixture now uses real durable linked-user lineage and checks
revocation before dispatch: **16/16** batching tests pass. Both ACPX patch files
were regenerated with pnpm after reproducing GNU patch's asymmetric-context
failure; their resulting vendor files are byte-identical to the intended code.
Packaging **15/15** and actual fresh GNU-patch staging **2/2** pass. No lockfile
was edited. These fixes are committed; the next CI run must confirm them.

## Current tested/deployed state

- The server fixes in `1c4a45f0e` are committed and pushed. The live server
  was restarted with them; verify readiness before the next browser action.
- All four active live connections use the immutable Maya E2E agent with
  **Paperclip Runner → Codex app-server → `gpt-5.6-luna`**. Verify the actual
  persisted execution profile for each new live run; do not substitute a
  legacy adapter or silently switch to Terra.
- Server-only qualification: full chat integration **390/390**, native
  external-chat question/wait integration **130/130**, server source typecheck,
  independent GitHub authority review **24/24**. A final strengthened Discord
  Activity/target assertion also passed independently.
- The narrow Rust prose-redaction fix is committed as `47ddc4f8e`. Root passed all
  **223/223** runner-core tests, built/staged/signed the release binary, and
  passed **87/87** staged Codex transport tests. The staged SHA-256 starts
  `a61275f338b7`. Existing live sessions can still use the prior binary; a
  fresh Slack reply now preserves all three exact regression sentences.
  A full Discord document inspection still found other ordinary token phrases
  redacted, so broader prose quality remains open.
- Follow-up `7e4960695` narrowly preserves “a/the transparent token system”
  and sentence-final punctuation without weakening credential canaries.
  Root independently passed **225/225** core and **87/87** rebuilt/staged
  transport tests. The new signed binary SHA-256 starts `dfb434e487ac`.
  This newer binary has not yet received fresh live qualification.

## Immediate unfinished tests/fixes

- **GitHub:** the live native Quartz/Jade round trip passed after deployment.
  The original linked user selected Jade on the actual Board question card;
  the question was marked answered and exactly one Jade reply appeared in
  the original GitHub thread. The continuation used native Luna and took
  17.856 seconds. Separate negative tests cover governance and identity;
  this live result alone does not prove every review gate. Do not merge or
  edit the disposable test repository as part of this chat test.
- **Runner prose redaction:** ordinary board-game prose containing phrases
  such as “one token for” and “one token can equal” lost words. A narrow
  grammar exception passed review and tests, with assignment, quoted, CLI, compound,
  JWT/Bearer and known-secret canaries. The fresh Slack exact-sentence test
  passed in 18.213 seconds end to end on native Luna. The new Discord whole
  file preserved the required sentence but still showed “transparent token
  [REDACTED]”, “one token [REDACTED]”, and “token [REDACTED]” elsewhere.
  Investigate those false positives without granting broad redaction exemptions
  or rewriting historical replies to manufacture a pass.
- **Attachment handoff:** the stale “preparing” message was replaced in code
  with a timeless message-limit explanation. Discord/Telegram long-document
  retry/ambiguous-delivery tests passed; confirm the new wording on a fresh
  live long response after deployment. Discord's fresh sapphire plan now
  passed: the timeless handoff and real whole-file preview were verified;
  final attachment arrived once in 61.372 seconds end to end. Native Luna
  used 58.630 seconds. Telegram's equivalent fresh attempt failed at native
  shutdown, so neither its handoff wording nor delivery passed that attempt.
- **Telegram/native shutdown:** the fresh long-answer run
  `f262ca93-3c29-4338-a625-0d2239757e38` accepted a successful native result,
  but failed to durably suspend before checkpoint. Its transport quarantined
  on provider-event teardown timeout, then repeatedly failed cleanup.
  Telegram correctly showed failure rather than a fabricated success, but
  the authored answer was not delivered. Investigate the event drain and
  shutdown sequence; do not treat accepted result metadata as delivery proof.
  Durable inspection found 128 delta events committed by the controller but
  not yet ACK-persisted by the runner; stop and suspend commands were delayed
  behind that traffic. A subsequent Slack run also failed on incomplete
  prior-session cleanup, so further live sends are paused while the runner
  fairness/cleanup regression is fixed. Do not clear safety state to force
  a green result or increase deadlines in place of fixing command progress.
  Commit `440ae9bbd` batches cumulative ACK persistence at 16 advances while
  preserving replay and command/lifecycle save boundaries. Root passed all
  **226/226** core tests, the refined before-command persistence assertion,
  and **87/87** tests against signed binary SHA-256 `3c69ea061539…`. The real
  socket backlog/suspension/rebind case is included in those 87 tests. Live
  recovery and retesting remain pending; verify exact prior process ownership
  and let startup reconciliation settle without changing durable history.
- **Telegram latency:** one message took 234.435 seconds _before reaching the
  local webhook proxy_, then Luna ran for 13.433 seconds. The next independent
  message reached the proxy in 0.583 seconds and answered in 16.228 seconds
  total without configuration changes. The intermittent upstream delay is
  localized but not explained; do not call it fixed or blame model time.
- **Discord recovery:** a real 30-second server pause exceeded the 15-second
  Gateway lease. One paused message and reaction addition recovered once;
  removal happened after resume and did not wake a run. The next live turn
  succeeded in 15.817 seconds end to end. Live second-process takeover is
  still unqualified; deterministic stale-owner/reconstruction tests pass.
- **Teams:** no qualified Microsoft 365 tenant/admin setup is available.
  Deterministic coverage is not live Teams qualification. Continue other
  channels while this external gate remains.

## Guardrails while continuing

Work only in the existing chat-adapters worktree. Root owns live browser,
server and Git operations; delegate disjoint local implementation/tests.
Use the signed-in in-app browser for provider actions. Do not expose raw
reasoning, tool arguments, logs, credentials or private file URLs in external
chat. Preserve history, current permission checks and one-thread/one-task
identity. Keep the private Board separate from public verified webhooks.

Detailed run IDs, timestamps, test commands and historical failures are in
`2026-09-08-chat-queue-and-webhook-repair.md` and the other qualification notes.
Do not include instance-local identifiers or tailnet links in a public PR
description.
