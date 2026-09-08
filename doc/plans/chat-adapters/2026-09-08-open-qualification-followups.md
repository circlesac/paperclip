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
2. Reconcile the existing `codex/chat-adapters` branch with freshly fetched
   `origin/master`. Preserve work and upstream code. Do not edit the lockfile.
3. Use the fewest reviewable PRs. Check the actual changed-file count against
   Greptile's 500-file limit; do not split channels unnecessarily. Retained
   prototype/wireframe iterations currently inflate the branch's count.
4. Fill the repository PR template, report verification limits honestly, and
   obtain reviews before claiming the work ready to merge.

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
- Native binary still uses the previously qualified `a0fd2789…` build. The
  pending Rust prose-redaction change is not deployed merely because HEAD
  changed. Complete tests, build/stage/sign, and test the staged binary before
  assigning it live-qualified status.

## Immediate unfinished tests/fixes

- **GitHub:** a live native Quartz/Jade question is already pending on the
  disposable test PR. The normal GitHub link opened its actual Paperclip
  Board card. After confirming the new server is ready, answer the card as
  the original linked user; verify exactly one reply in the same GitHub
  thread and an untouched governance review. The code fix has already passed
  negative authority/identity/reach/generation/receipt tests. Do not merge or
  edit the disposable test repository as part of this chat test.
- **Runner prose redaction:** ordinary board-game prose containing phrases
  such as “one token for” and “one token can equal” lost words. A narrow
  grammar exception is in progress, with assignment, quoted, CLI, compound,
  JWT/Bearer and known-secret canaries. No broad redaction exemption. Test an
  actual fresh live reply after staging the reviewed binary; do not rewrite
  historical messages to manufacture a pass.
- **Attachment handoff:** the stale “preparing” message was replaced in code
  with a timeless message-limit explanation. Discord/Telegram long-document
  retry/ambiguous-delivery tests passed; confirm the new wording on a fresh
  live long response after deployment. The existing Discord file was opened
  in whole-file preview, exposing the separate redaction issue above.
- **Telegram latency:** one message took 234.435 seconds *before reaching the
  local webhook proxy*, then Luna ran for 13.433 seconds. The next independent
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
