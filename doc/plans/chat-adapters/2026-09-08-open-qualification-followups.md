# Temporary chat qualification handoff

This note is for the implementing agent. **Delete it when the remaining items
are fixed or moved into permanent verification documentation.** It is not a
release-completion claim. Completed work and historical failures are recorded
in [the permanent qualification log](2026-09-08-chat-queue-and-webhook-repair.md).

## Landing status

- The user asked to prepare the PR while testing continues. This supersedes
  the earlier instruction not to tend PRs.
- [PR #13038](https://github.com/paperclipai/paperclip/pull/13038) is open, not
  merged. Keep one PR: the current local diff is **483 files**, below 500.
- The default-off **Experimental > Chat connectors** setting is implemented.
  Production GitHub tools remain visible and open directly without the
  chat/tool choice when disabled. Default-off and enabled browser flows passed.
  This is a UI visibility gate: active connections continue delivering until
  explicitly paused.
- Master is incorporated through `023e640a7` in merge `21061f4de`. Full
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
  Independent code review found no issue. Request final-head review. Do not
  mark review accepted, CI green or the PR ready to merge without evidence.

## Current deployed state and evidence

The live server was restarted after the master merge at **15:04 UTC**, log
`.paperclip-runtime/chat-adapters-live/server-experimental-landing-45.log`.
It runs through `6f90d368a`; later fixture/documentation-only changes need no restart.
Its private Board is at `http://127.0.0.1:3103`. Keep the public verified
webhook proxy separate from the private Board.

All four active connections use immutable Maya E2E with **Paperclip Runner →
Codex app-server → `gpt-5.6-luna`**, low reasoning. Verify the persisted
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

## Remaining work

1. **Finish landing verification.** Update/push the verified fixes and PR
   description, then obtain green CI and Greptile review. The final fresh chat
   rerun is **390/390**; fix any new CI findings without weakening assertions.
   Leave checklist items unchecked while their evidence is missing.
2. **Prompt permanent protocol-fault feedback.** An authenticated semantic
   digest mismatch currently closes the socket and can leave “using tools”
   visible until the 900-second deadline. Independent design review calls for
   a typed, latched integrity callback after exact correlation validation,
   wired through transport, notification/backend and runtime boundaries.
   Preserve the primary fault through cleanup failure; use the permanent
   integrity disposition. Do not ACK/dispatch the bad event or replace its
   provider. Add unauthenticated/wrong-identity, repeated replay, transient
   commit and failed-suspension negatives before claiming a prompt failure path.
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
