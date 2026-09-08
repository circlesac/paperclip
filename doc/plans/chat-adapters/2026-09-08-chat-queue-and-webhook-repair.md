# Chat queue, Gateway admission, and GitHub reconnect checkpoint

## Execution target

The isolated live agent remains Maya E2E, `31f56712-3944-423e-b7c7-404bb8fbb993`,
using `paperclip_runner` and `gpt-5.6-luna`. The initial live runner binary was
`af19f64dfdf7e2e4efb5b41275e26cd873338315207c36fd4d108bdb69bae3c1`.
Actual Codex app-server source/continuation evidence and measured Slack,
Discord, and Telegram timings are recorded in the
[runner integration checkpoint](2026-09-07-upstream-runner-integration.md).
Terra was not substituted. Raw reasoning, tool arguments, and private logs
remain on the private control plane, not in external chat.

## Changes

- Pre-run FIFO admissions now have one durable, closed-text queue notice per
  canonical wake and destination. Current actor, reach, generation, admission,
  and exact source-comment checks run again at transport claim. Promotion before
  send suppresses the notice; the exact eventual run may reuse its message for
  working, question, or final output. A predecessor or second final cannot
  overwrite it. These notices do not become Slack session/Stop state or attach
  outbound activity to the user's inbound comment.
- Review caught and fixed two stale-notice cases: an admitted run failing before
  its first working update, and deletion of the original coalesced input. The
  latter uses only “This queued message was removed.” against the original
  still-visible notice; it never says the surviving batch failed to run and
  cannot overwrite an answer that won the race.
- Discord fresh message admission renews only the exact Gateway owner token
  inside its database transaction. Local expiry updates happen after commit.
  A paused obsolete callback cannot write after a standby has taken ownership.
- GitHub reconnect reconciles only the verified App's callback URL, stored
  secret, JSON encoding, and TLS verification through its normal App JWT path.
  The fixed provider host, redirect rejection, bounded response, closed errors,
  lease checks, and intent/completion audits prevent credential exposure and
  false success after ownership loss. No repository permission, subscription,
  installation, or provider Active toggle changes. Historical signed-ping
  evidence is not fabricated; a fresh chat round trip is still required.
- The actual GitHub reconnect screen incorrectly repeated App-creation and
  installation instructions. Reconnect now hides those steps, names the repair
  correctly, and explains saved-credential reuse. First-time setup is unchanged.
- Teams personal/channel tests now cover closed progress, same-message edits,
  question/final precedence, replay suppression, and reach revocation. These are
  deterministic tests, not live tenant qualification.

## Verification

- Fresh PostgreSQL full chat integration: **364/364**, final frozen backend,
  75.62 seconds. The preceding full run had 359/360 with a socket hang-up in the
  existing publication-batch read test; that case passed independently and the
  final complete rerun passed. The earlier run is not counted as a pass.
- Focused queue/publication/GitHub webhook helpers: **72/72**.
- Server and UI source typechecks passed; token gates and diff checks clean.
- Deterministic browser suite: **9/9** before the final reconnect heading and
  no-create-instructions assertions. The final focused GitHub rerun passed
  **1/1** (29.2 seconds), including those assertions and reconnect after secret
  rotation. Mocked browser tests are not live webhook evidence.
- Independent review found the two queue defects above and confirmed the final
  corrections without an authorization/privacy bypass.

Logs are retained under `.paperclip-runtime/chat-adapters-live/` with the
`chat-queue-gateway-webhook-full-final-0908`, `chat-queue-webhook-unit-final-0908`,
and `github-reconnect-copy-browser-final-0908` prefixes.

`origin/master` still resolves to `297d8741f5f192c66abbec325b1e956cf0e5e667`.
The lockfile SHA256 remains
`313c6a80f077364abe06d237d518ba555ccaf03745f3504a1f7df36e7baf8040`.
Master ancestry/frozen-install reconciliation and the previously documented
whole-workspace build/test gate remain open. This checkpoint does not declare
all providers production-qualified.

## Live qualification on `1f28e0da9`

The clean committed server started at 11:51:10 UTC on September 8, with the
same staged runner and Luna configuration. No server pause or restart occurred
during these probes.

### GitHub callback repaired; answer withheld (failed chat test)

The normal reconnect UI reused saved credentials. The App webhook sync was
audited at 11:51:29.306 (started) and 11:51:29.453 (completed); reconnect finished
at 11:51:29.961. Historical signed-ping evidence remained unchanged. No new
login, private key, repository permission, or installation was required.

The browser-created PR comment `5584695046` arrived at 11:51:59.660. Run
`f5260e73-6b0b-4a31-9098-192db2d455be` used `codex_app_server`, ran from
11:52:00.458 to 11:52:16.909, and produced the exact final summary
`GH-RECONNECTED-LUNA`. However, finalization recorded
`external_chat_response_wait_authorization_lost`, created no answer comment,
and GitHub showed only “Maya E2E completed this turn.” Both transport
publications succeeded on their first attempt against comment `5584695856`.
This proves restored ingress, not a successful setup round trip. The endpoint
remains in its legitimate reconnect test state; it was not manually activated.
The bound-conversation authorization helper required endpoint status `active`,
although normal setup admits test traffic while `verifying`. This creates a
setup/finalization cycle. A narrowly scoped current-generation test-window
exception now retains the existing actor/reach/ownership checks. Every exact
bound delivery must have been received and processed within the current test
window, carry the current runtime generation and canonical credential-fence
shape, and pass current policy again at commit. Arbitrary verifying states and
old-generation events remain denied. Positive tests for all five providers
reach an actual pending answer publication; reconnect and activation overlap
tests prove the final authorization recheck. The full external-chat wait suite
passed 106/106 and server typechecking passed. This fix is included in the
deployment candidate but has not yet passed its fresh live qualification.

### Slack upstream retry and queue failure are separate findings

The first source message `1788868365.043179` was sent at 11:52:45.043, but the
first matching local HTTP request arrived at 11:53:45.946: **60.903 seconds
before Paperclip received it**. The request carried retry 2 / `http_error`
hints; those hints are diagnostic, not authenticated authority. No earlier
matching request appears in this server log. Paperclip acknowledged the
received request in 22.738 ms. Run `e007b44a-a6d9-4f17-92ba-19ee10c44552`
took 22.542 seconds and its actual answer was published at 11:54:09.815:
84.772 seconds from source to answer. All publications used one attempt and
reused message `1788868427.157569`. Its displayed Slack timestamp is the
original placeholder time, not when the final edit appeared. The source of
the upstream transient has not been established.

The next source `1788868603.774119` received working feedback on
`1788868606.501909` within about three seconds. Follow-ups
`1788868619.821029` and `1788868619.986369`, sent during that run, coalesced
into wake `2982635e-5de7-4305-81a5-83854593cb5e`. One “Your follow-up is
queued.” notice appeared at 11:57:01.497 on `1788868621.466899`; both source
messages received acknowledgement reactions. Safe progress updated only the
predecessor's working message.

This is **not a passing FIFO round trip**. Predecessor
`61b59b46-d382-4701-910c-ece9e4323dc1` failed at 11:57:30.118, and promoted
successor `94bebeda-5c90-4810-8567-4ccc365df826` failed at 11:57:30.293.
Their closed failure messages edited the correct separate provider messages,
leaving no stale queue notice. The local diagnostics report a missing durable
suspend proof followed by a runner-state identity mismatch; investigation is
ongoing. These are not evidence that Luna itself is unsuitable, nor evidence
that recovery or final-answer delivery succeeded.

The predecessor had already emitted an accepted result and terminal event at
11:57:14.660 and 11:57:14.669. The later failure happened while establishing
durable suspension. Its retained runner had acknowledged only sequence 51,
while the controller had committed sequence 625; 609 `item.delta` events
remained in the durable outbox. Stop/suspend commands remained pending. The
automatic recovery `b217e9ac-c82e-4468-8e9d-bdf85909eb38` exhausted its retry
budget at 11:58:36.424. No state was deleted, forged, or manually marked
successful. A control-loop backpressure regression and fix are in progress.

## Runner corrections and pre-deployment verification

The new 1024-delta, post-semantic-result stress case reproduced the exact
missing-suspension failure against the prior staged `af19f64d…` binary. The
correction gates new provider ingestion while a sent durable prefix is still
awaiting controller acknowledgements. Authenticated control frames continue
in order; every individual event save and cumulative ACK save remains intact.
There is no timeout increase or discarded durable output.

Independent review required two additional safeguards. Backpressure still
advances bounded, already-pending receipt-limit cleanup without starting a
provider, and observes terminal events before deadline fallback. A safely
stopped `prepared` checkpoint can rebind the next run without requiring its
old process to exist, but a resumed provider reporting unexpected active work
is stopped and rejected before any buffered tool is exposed.

Candidate debug verification passed:

- Rust library: **223/223** on the final rerun. The first run had one unchanged
  ACPX process-liveness fixture failure; its isolated rerun and the full rerun
  passed. The initial run is not counted as a pass.
- Targeted real transport: **3/3**, including the original 48-delta case,
  1024-delta saturation with **two actual turns**, and rejection of an unexpected
  active resumed checkpoint. The successor retains the exact provider thread,
  has a distinct turn identity, invokes the semantic handler once, and proves
  exact durable suspension. This is not merely a session-read test.
- Real Codex unacknowledged-terminal maintenance: **1/1**.
- Runner and server TypeScript checks passed; independent review found no
  remaining production blocker in these changes.

The release build completed successfully. Its staged, ad-hoc-signed SHA256 is
`a0fd27895142f333696df720d66c426793c9051f7361288e54f6c2c16cf7ccd8`.
The full staged transport suite passed **87/87** in 56.31 seconds; its digest
was unchanged afterward. Actual Codex integration passed **66/66**, plus its
intentionally ignored subprocess helper invoked by the parent test. Logs use
the `runner-ack-fairness-` prefix under the ignored live runtime directory.

Fresh live round trips remain pending. Restart of the clean `857bd57c2` server
failed closed during native finalization recovery: an assessment belonging to
the failed Slack run already had a valid same-run supersession link, but
effect materialization tried to replace it with the current issue decision's
assessment from another run. PostgreSQL correctly rejected that cross-run
reference. No constraint or data was changed to bypass it; the failed-start
process was stopped. The scoped fix preserves the already-recorded run-local
assessment parent and separately links the issue-wide status decision.
Cross-run, intermediate same-run ancestry, and replay regressions passed;
independent focused PostgreSQL verification passed **4/4**. Root's full status
corpus plus finalization recovery passed **12/12** in 9.15 seconds, and the
server package typecheck (including its runner contract/build prerequisites)
passed. The staged runner digest remains unchanged. Live restart and fresh
round trips remain to be verified after this correction.

The failed Slack session is retained in quarantine; an audited task-scoped
session reset after deployment will create a new provider session, not recover
or replay the failed accepted answer. Paperclip issue, message, file, and run
history will remain. No reset has been performed yet.

The ignored, local webhook-only qualification proxy now has closed timing
diagnostics, tested **6/6** without a real listener. They record only provider,
timestamp, duration, status, outcome, and byte count; no bodies, headers,
credentials, callback IDs, or URLs. The proxy was restarted with this diagnostic
code, retaining the same webhook-only routing and public/private exposure.

## Live restart and GitHub answer on `545c87c67`

The clean committed server reached startup `ready` at 12:27:46.904 UTC. The
assessment-lineage failure no longer prevents startup. A separate, nonfatal
workspace-recovery warning still attempted to use a directory-only run token
as an execution-workspace foreign key; its correction is described below.

A fresh, unmentioned follow-up in the existing PR conversation was submitted
at 12:28:39.398. User comment `5585134211` reached the webhook-only proxy at
12:28:41.889 (202 in 67.749 ms) and was durably received at 12:28:42.602.
Run `e12b49b9-5798-4700-8f01-e77b759f19e5` ran from 12:28:43.404 to
12:28:57.439 using actual `codex_app_server`; its persisted native provider
configuration is `gpt-5.6-luna`. It retained provider session
`01a080dc-602e-7033-8c92-e417668c57fb`, returned an accepted yielded result,
and published the actual answer `GH-LUNA-ANSWER-DELIVERED` at 12:28:58.566.
Working feedback and the final each used one attempt and the same GitHub
comment, `5585135215`. This is **19.168 seconds source-to-answer**, with
working feedback after 5.507 seconds; it is one measured short-answer sample,
not a latency percentile. The visible final was verified before clicking the
normal setup test button. GitHub became `active` / `complete` at
12:29:21.220 without editing provider permissions or exposing secrets.

The Slack task-scoped reset has **not** happened. Its native browser
confirmation stopped responding to the browser controls; the dialog API
reported no active dialog while click, keyboard, and close operations timed
out. The exact task-session row still references the failed recovery run.
Fresh Discord and Telegram requests are only prepared drafts: attempts to
submit them did not remove them from the composers or create inbound
deliveries. They are not counted as live probes. No provider login or model
substitution was used to work around the browser state.

## Subsequent scoped corrections

- Optional safe-progress projection skips contended issue/run rows and
  rechecks them on a later sweep. Milestone production and publication
  dispatch have independent coalesced, single-flight lanes, so a slow
  projection cannot hold unrelated already-committed answers/questions.
  Authorization, per-run phase limits, final precedence, and closed payloads
  are unchanged. Red-before/green-after PostgreSQL contention tests and
  independent review cover retry, intervening questions/finals/revocation,
  and draining both lanes on shutdown. This does not claim every provider
  lane is universally lock-free.
- Workspace-finalization recovery uses an execution-workspace FK only when
  the candidate resolves to a company-owned row. Directory-only tokens stay
  nullable; prior-operation cwd recovery requires exact company/run/issue
  binding. Tests cover a real owned workspace, a directory-only run token,
  and rejection of a foreign workspace / mismatched prior issue.

Root's combined coordinator and
workspace-recovery check passed **16/16**; source TypeScript checks passed.
The final full chat integration run passed **369/369** on fresh PostgreSQL
in 68.90 seconds. Its preceding run had **368/369**: an existing assertion
assumed unordered database rows matched insertion order, although both exact
stale placeholders were correctly cancelled. The assertion now requires exact
cardinality and both exact row contents without imposing an unspecified order;
the isolated case and complete rerun passed. No production behavior was changed
for that test correction.
Long text-only generation still uses coarse working feedback rather than
streaming raw deltas or private reasoning into external chat.

The clean `84a601459` deployment reached startup `ready` at 12:40:30.035 UTC,
with the same staged `a0fd2789…` runner. Neither prior recovery error recurred.
The retained failed Slack run's directory-only workspace check was recorded
as a separate successful recovery operation with a null execution-workspace
FK; its historical failed operation and run remain intact. No new external
publication was created by this restart. Fresh post-deployment provider
qualification and the Slack task-scoped reset remain pending the browser
confirmation/input problem above. The server is available locally on 3103;
the private/public Tailscale routing boundary is unchanged.

## Fresh native Luna qualification after browser recovery

Browser input became responsive again. The earlier prepared drafts were not
counted; the following are newly submitted, provider-visible requests on the
`84a601459` server and staged `a0fd2789…` runner. All four active endpoints
(Slack, Discord, GitHub, Telegram) still bind to Maya E2E with adapter
`paperclip_runner` and configured model `gpt-5.6-luna`. Each run below also
independently records `driver_kind=codex_app_server` and the same model in its
native execution profile. No Terra substitution or legacy adapter was used.

- **Discord long answer and queue:** source message `1546864944140787752`
  submitted at 12:49:01.858 UTC, received at 12:49:02.057. Run
  `e9b877f2-4087-413e-bc3d-4f1edd313420` succeeded in 59.769 seconds.
  Working feedback appeared at 12:49:03.800; a safe native progress update
  reused the same message `1546864951203864586`. The complete long answer
  was delivered as `paperclip-response.md` in message `1546865203755614239`
  at 12:50:04.135, **62.277 seconds** after submission. The attachment was
  opened in Discord's whole-file preview, not inferred from an outbox flag.
  Two follow-ups submitted at 12:49:19.640/.670 shared one queued notice,
  message `1546865026105606204`. Successor run
  `04bd1506-2f5d-41a4-b65e-e4377b420a70` succeeded in 15.608 seconds and
  reused that exact notice for working then `GARNET-QUEUE-A` / `GARNET-QUEUE-B`
  at 12:50:18.813. All publications used one attempt. The prior native
  suspension/acknowledgement failure did not recur.
- **Slack scoped recovery and queue:** the audited Board API reset only
  task `4268eb34-b15a-4ab6-91e7-6c184021690d` at 12:54:12.360. This was an
  authorized recovery-fixture API action, not a claim that the previously
  blocked browser confirmation passed. Failed history remains intact.
  Fresh message `1788872101.219689` was submitted at 12:55:01.100; proxy
  ingress followed at 12:55:01.986 and returned 200 in 44.052 ms. Run
  `593ad9cc-f81d-4008-8308-7e1c71082f1b` succeeded in 37.060 seconds; its
  600-word answer replaced the working/progress message `1788872104.327139`
  at 12:55:40.299, **39.199 seconds** after submission. The two new queued
  follow-ups used one notice `1788872120.702299`, then successor run
  `5e81a966-fc00-4bff-8455-4a8b4ae4d2c1` reused it for working and the exact
  ordered `AMETHYST-QUEUE-A` / `AMETHYST-QUEUE-B` answer at 12:55:58.289.
  Both outcomes were read in Slack. All publications used one attempt.
- **Telegram ingress localization:** the first fresh request was submitted
  at 12:49:02.157 but first reached the local webhook proxy at 12:52:56.592:
  **234.435 seconds before local ingress**, not time spent queued in Luna.
  The proxy returned 200 in 703.024 ms; run
  `584dc938-5d8c-4752-8042-aff378da4a9d` then succeeded in 13.433 seconds.
  `TELEGRAM-NATIVE-LUNA-READY` was visibly delivered on the same working
  message `417200359:115`. A second independent request at 12:55:01.547
  reached the proxy in 0.583 seconds without a reconnect/configuration change.
  Run `a2207faa-ff35-4bac-9e1a-fbc0270f5d96` succeeded in 13.603 seconds,
  and `TG-FAST-READY` replaced `417200359:117` at 12:55:17.775:
  **16.228 seconds end to end**. Both final outbox rows used two attempts;
  neither duplicated the provider message. The earlier pre-ingress delay is
  localized, not yet explained or declared permanently fixed.
- **GitHub native question:** new PR comment `5585485583`, submitted at
  12:56:45.673, started run `1ac82077-478b-444a-a459-efa52aaf9d4d` at
  12:56:49.409. It succeeded in 12.884 seconds and visibly published
  “Choose Quartz or Jade” with its normal Paperclip link. Opening that link
  reached the actual pending Board question. Its answer is intentionally
  pending deployment of the separately reproduced native Board-answer
  continuation correction; question creation is not a completed round trip.

These are individual live samples, not latency percentiles. Private reasoning
and raw tool/diagnostic events stay in Paperclip; external progress uses the
closed, safe phase projection. Teams still lacks a qualified Microsoft 365
tenant and is not counted among these four active live endpoints.

The whole-file inspection found two remaining quality defects: the old
Discord placeholder still said “preparing” after its attachment arrived, and
the runner over-redacted ordinary game-token prose. The attachment handoff
now uses a timeless message-limit explanation, which does not claim delivery
before the attachment's own outbox row succeeds. Both existing Discord and
Telegram long-document tests pass (**2/2**, fresh PostgreSQL), including
retry, rejected attachment, ambiguous delivery, and lossless safe-text bytes.
The runner prose-redaction correction is being tested separately with secret
canaries; no broad redaction bypass is authorized.

## Authored-answer preservation and native GitHub answer authority

The parallel audit reproduced an actual progress-lane collision: a run can
legitimately yield an authorized selected answer and later fail, but the
failure milestone reused the old working-message ID after that ID held the
answer. The reverse order could erase the truthful failure notice. The fix
checks the current exact outbound message link, scoped to company, endpoint,
conversation and issue, before either the run lane or older queued-wake lane
can be reused. Authored answers and failure notices consume their lane;
ordinary working→failure and interleaved task-status updates retain their
existing single-message behavior. Twenty Slack/Telegram order/status and
deferred-admission cases failed before the fix and pass afterward; the final
compatibility subset passed **29/29**. No run status or review decision is
rewritten to make the presentation pass.

GitHub's link-only question fallback exposed a separate native-authority gap:
answering in the authenticated Board creates no provider callback action,
while the native continuation attestor required one. A real PostgreSQL native
fixture reproduced the denial. The correction recognizes a distinct Board
answer receipt for GitHub only, bound to the server-created response delivery,
exact original linked user, published question, source/run/wake chain and
current runtime generation. Existing membership, reach and review checks
remain; it does not invent a chat action or make an answer grant governance
authority. The native question suite passed **130/130**, including wrong
responder, revoked identity/membership/reach, stale generation/receipt and
forged-marker denials, plus native file registration/reuse and idempotence.

Root's full chat-channel integration run passed **390/390** on fresh
PostgreSQL in 74.10 seconds (68.98 seconds in tests); source server TypeScript
checking passed. A new Discord pre-link reaction test also covers durable
replay across service reconstruction without additional task work. These
focused results do not remove the separately documented frozen-install/
lockfile release limitation or qualify the missing Teams tenant.

The first and second Telegram final attempts above were authorization-lock
deferrals: the log explicitly records that no provider send was attempted
on the first claim. The retry count is not evidence of a duplicate Bot API
request.

## Live Discord lease expiry

With no active Maya run, root paused the actual server PID for 30 seconds
using an independent automatic-resume timer: 13:00:05.357–13:00:35.358 UTC,
past the 15-second Discord Gateway lease. New message
`1546867734644662432` and an added reaction on the long-answer attachment
`1546865203755614239` were sent while paused. On resume they became exactly
one processed message and one processed reaction delivery, both in the
original CHA-4 conversation. Only one run started:
`1ca2ec88-9c7e-489b-8b1b-bf6f1a85faf5`, actual native Luna, succeeded in
15.982 seconds. Its working notice was edited into `DC-LEASE-RESUMED` on
message `1546867860427644999`, one attempt each, visibly verified.

The reaction removal was performed **after** resume, at 13:00:52.774, and
was durably processed once at 13:00:52.992 without starting another run.
It is not counted as an in-pause removal. A second independent follow-up was
submitted at 13:01:16.676 to verify continued Gateway operation. Run
`9a05c338-4e43-4bb2-ac99-bed85d2c7c6d` succeeded on native Luna in 14.476
seconds; `DC-CONTINUITY-OK` visibly replaced its own working message
`1546868033899986944` at 13:01:32.493, **15.817 seconds end to end**,
one attempt per publication. This proves expired-owner recovery,
not live takeover by a second server process; stale-owner takeover remains
covered by the deterministic integration tests.

Independent review of the GitHub Board fallback found no additional blocker
and reran **24/24** authorization cases successfully. The Discord reconstruction
test was strengthened to assert one exact Activity row plus its original
thread/message/reaction target across a repeated drain; that final focused
case also passed. The server corrections were subsequently deployed from
`1c4a45f0e`; the Rust change remained a separate build and qualification batch.

## Deployed GitHub Board answer and runner build

After server readiness, root selected Jade on the actual linked Board
question `fb33198f-975c-4e1a-b674-4e8e6f0c9ef6`. The native Luna continuation
`73a59f86-9a7c-40f8-9a67-00100ee8cac9` ran from 13:05:30.342 to
13:05:48.198 UTC, **17.856 seconds**, and succeeded. The original question
message `5585486661` changed to “Answered: Jade.” The new working message
`5585598569` became a single Jade final reply at 13:05:49.207. Each publication
used one attempt. The actual GitHub thread was opened and visibly verified.
This confirms the real link-only Board-answer transport; separate negative
tests, not this visible reply alone, establish governance and authority denials.

The narrow game-token prose redaction correction was committed in
`47ddc4f8e`. Root's unrestricted local runner-core suite passed **223/223**;
the earlier sandbox-only socket failures are not failures of this rerun.
The standard release build staged and signed binary SHA-256
`a61275f338b78b7272633490ef4f48684a3c1dca4bf285ec2846fd477c12da41`.
The staged Codex transport suite then passed **87/87** in 67.01 seconds.
These are build/transport results, not a fresh live prose qualification.

## Master reconciliation and review preparation

Merge `e91b236ff` incorporates upstream `297d8741f`. All sixteen conflicts
were inspected and resolved to the already tested branch implementation.
An automatically duplicated tool-authority test was removed. An exact-content
check confirmed that these resolutions preserve the pre-merge source.
Upstream's 244 migration journal entries are the exact prefix of the branch's
254; no migration renumbering was necessary. The merge inherits upstream's
lockfile, with no lockfile change relative to master.

Release preparation adds a default-off chat-connector visibility experiment
without removing production GitHub tools. Superseded generated wireframes are
archived in Git history so one review can remain below the 500-file limit.
Broad post-merge checks and experimental-gate browser coverage are in progress;
neither PR creation nor these focused results is a production-readiness claim.

## Fresh prose and attachment follow-up

Slack's fresh `TOKEN-PROSE-LIVE-0908` submission at 13:16:27.903 UTC produced
all three requested ordinary game-token sentences without redaction. Run
`001e58df-687b-459e-ac02-8bb6e076af59` used actual Codex app-server Luna,
13:16:29.648–13:16:45.771 (**16.123 seconds**). Its working message
`1788873390.611459` was edited to the final at 13:16:46.116, one attempt,
**18.213 seconds end to end**, visibly verified in the original thread.

Discord's fresh sapphire plan was submitted at 13:16:40.547. Run
`fb1665bd-059b-4b88-be6d-d735e45e5816` used actual native Luna for
**58.630 seconds**. Working/progress message `1546871910300917770` became
the timeless message-limit explanation; attachment `1546872156825198685`
arrived at 13:17:41.919, **61.372 seconds end to end**. Every publication
used one attempt. Root opened the actual whole-file preview and verified the
required “One token can equal one standard game.” sentence. Other ordinary
token phrases in that same document were still redacted. The narrow regression
passes; overall prose-redaction quality is not yet fully fixed.

Post-merge full workspace `pnpm -r typecheck` and `pnpm build` both passed.
A fresh final chat integration rerun passed **390/390** in 119.23 seconds.
The broad `pnpm test:run` is still running and has reported a CLI guidance
allowlist failure; no broad-suite pass is claimed. Experimental-gate focused
coverage passed 252 UI, 96 server settings, and 32 shared tests, with token
gates clean. Independent merge regression coverage initially passed 1,228 of
1,229 tests; one heartbeat fixture read agent state before asynchronous
settlement completed. Its exact bounded state-wait correction passed both
the isolated case and all **141/141** recovery tests. No runtime permission
or dispatch behavior changed. The remaining ten merge-regression files passed.

Independent review also found a pasted-URL shortcut around the hidden gallery.
One visibility-filtered list now feeds both cards and URL matching, with
**106/106** AppsConnect tests passing, including hidden Telegram/Discord URLs,
GitHub tool links, and custom MCP compatibility.

The live server restarted from `56c096e5e` at 13:18:39 UTC and reached ready
at 13:18:48. Root verified the actual default-off Apps catalog: GitHub tools
remain visible and the Connect GitHub button opens the normal account/access
flow without a chat choice. Chat-only providers and existing chat connection
rows are hidden. Root then enabled the actual Experimental Settings switch
on this qualification instance and verified that all four existing active
chat connections and Microsoft Teams setup reappeared. Other instance flags
and provider lifecycles were unchanged.

## Landing CI and fresh native shutdown regression

PR [#13038](https://github.com/paperclipai/paperclip/pull/13038) is open as one
review, currently 473 changed files. Merge `1a442f5a0` also incorporates
upstream `b97101893`; a later fetch found no further master commits.
Workspace typecheck and build passed after that merge. The corrected browser
cohort passed **10/10** on isolated port 3199 and a fresh database, including
the default-off GitHub tool flow and all four file-send refresh outcomes.
Follow-up native recovery **9/9**, legacy rollback **1/1**, issue routes
**92/92**, and clipboard/identity-preview **37/37** passed. These focused
results do not make the still-running broad suite or CI green. Greptile has
not yet produced a review after the requested file-limit override.

Telegram's fresh long-answer submission at 13:28:03.761 UTC created run
`f262ca93-3c29-4338-a625-0d2239757e38`, native Codex app-server Luna. It ran
13:28:05.910–13:29:17.661 and failed with
`provider_transport_failed: runner did not durably suspend before checkpoint`.
A 4,092-character native result and successful terminal metadata had been
accepted, but that was not enough to complete cleanup or authorize final
delivery. Working, progress and failure publications each used one attempt
against Telegram message `417200359:119`. The actual chat showed failure;
no successful long-document handoff was observed.

Durable inspection found a 128-delta suffix (source sequences 174–301) already
committed by the controller while the runner's persisted ACK remained 173.
The stop command waited about 9.8 seconds before entering the command journal;
suspend had not entered it when the bounded close failed. No host sleep/wake
occurred in this interval. This is acknowledgment/control-command starvation,
not slow model inference. The proposed fix batches cumulative ACK persistence
without weakening replay, command durability, or suspension proof.

Slack's subsequent `TOKEN-SYSTEM-LIVE-0908` submission at 13:40:12.298 UTC
also failed. Run `2c17e336-f6b2-4763-9d8f-ba9a3c8b296a`, native Luna,
13:40:14.272–13:41:17.434, ended with `native_session_retry_exhausted` and
`native_session_cleanup_quarantined: prior session cleanup remains incomplete`.
The visible working message became a truthful failure. Further live sends
are paused until safe recovery and the shutdown regression are addressed;
the newly staged prose fix is not claimed to have passed live on this attempt.

## CI follow-through and the next live failure boundary

The broad local command completed its general-server phase with **8,117
passed, 34 skipped, and four failed**, then stopped. Each failure has a
focused passing correction: ignored-recording CLI guidance, exact native
recovery ownership, durable parked-answer attestation, and formatted
read-only route extraction. This is not a full broad-suite pass. CI at
`28dd9ee9f` subsequently passed build, typecheck, canary packaging, all three
browser shards, and non-server workspace tests. Three server shards still
failed. All three now have focused passing fixture corrections: comment-call
arguments, formatted route extraction, and waiting for the exact completed
slash-admission receipt rather than an earlier mock wake callback. The last
fix (`cba5aa51c`) also passed an independent full **390/390** chat integration
rerun on a fresh database after 254 normal migrations. CI still needs to
confirm these follow-ups. Greptile has not completed review.

The ACK persistence correction in `440ae9bbd` passed **226/226** core and
**87/87** staged transport tests, including the real socket backlog,
suspension, and authority-rebind case. Binary SHA-256 is
`3c69ea06153944eff3573b28e439de5eed31b5972ff3b18da4c54f1147b47492`.
Before the controlled server restart at 13:55 UTC, root verified that the
old runner process/group and provider process were absent. Startup found
no new unresolved ownership claim. No durable rows or checkpoint files
were manually cleared.

The next Telegram request, run `d0ae1646-c13d-497c-bf6b-a0fef0ff6693`,
failed immediately at 13:57:15 with `runner_state_identity_mismatch`.
The prior heartbeat was terminal while its checkpoint was not suspended;
existing product recovery safely retained the old state in quarantine and
deliberately rejected that first replacement request. This sacrificed turn
is an operator-recovery UX gap, not a reason to bypass identity checks.

After verifying that retention and the absence of the old processes, root
submitted `TG-AFTER-RETIRED-CHECKPOINT-0908` at 14:00:46.314. Run
`a4938fcc-dc2c-4146-a776-12512cf4b613` started at 14:00:47.771 using
Paperclip Runner, Codex app-server, and Luna. The configured low-effort field
was later found not to reach this native path; effective effort is unverified.
The provider produced `paperclip_finish` at 14:01:26.348, but the run stayed
active without delivering its answer. Working/progress publications each
used one attempt against Telegram message `417200359:123`.

Read-only inspection isolated a different defect: the only pending runner
outbox event, semantic tool input source sequence 44, passes schema and
identity/correlation checks but fails its content digest. The finish summary
was sanitized/truncated before hashing and then truncated again while
enqueuing the envelope. Controller commit remains at 43; repeated connection
resets replay the same uncommittable event. This is not model inference or
outbox backpressure. A narrow final-sanitization-boundary fix and long-input
regression are in progress. Do not count this run as a successful delivery
or repair its persisted digest by hand.

The run eventually failed at 14:17:07.520 with
`native_session_retry_exhausted` / incomplete cleanup. Root attempted the
normal Board Cancel only afterward; the control had disappeared and no
cancellation was applied. At 14:19 UTC there were no active Maya runs. The
retained runner checkpoint was suspended with source 44 still unacknowledged;
the provider checkpoint was prepared. No chat-adapters runner/provider process
appeared in the process inventory. Other worktrees' native test processes
were left alone. This state remains evidence, not a success to reinterpret.

Commit `65bd25a22` separately makes the exact irrecoverable, memoized cleanup
failure a typed operator-recovery hold. Independent review confirmed that
temporary failures still retry and new admission cannot bypass retained
ownership. Runtime **74/74**, executor **159/159**, and transport **88/88**
pass, with runner/server TypeScript checks. The composed real transport test
was placed in the binary-built transport suite rather than adding native
prerequisites to the scheduled lightweight runtime suite. The live server
has not yet deployed this change.

## Final-sanitization repair and four fresh long-answer proofs

`f91282130` fixes the digest/sanitization ordering and preserves authored
finish/block summaries up to the existing 12,000-Unicode-codepoint result
contract. Generic diagnostics remain 4 KiB. Invalid incoming semantic digests
are rejected before receipt lookup or queueing, and the persisted envelope is
sealed over its final sanitized input. Existing invalid history is untouched.
Independent review found no weakening of identity, replay, receipt or size
guards. `d8bfdad98` fixes a test-only port-reuse collision in the provider
lifetime-fence fixture without changing production ownership behavior.

Root's final unrestricted core run passed **231/231**. A release build was
staged and code-signature verified, then **88/88** tests passed against staged
binary SHA-256
`ea2986e2d9f24225d80093354a4361a71afee1859319e13814232046187e360c`.
After confirming no active Maya runs, root gracefully replaced only this
worktree's server at 14:32:32 UTC (PID 22469, log
`server-experimental-landing-43.log`). Startup found no pending ownership
claim or evidence reconciliation work. Historical blocked entries and
quarantined state remained intact.

The following fresh requests were sent through the signed-in in-app browser.
Every persisted execution profile is native Codex app-server / `gpt-5.6-luna`.
Times below distinguish runtime from submission-to-final-provider-publication.

| Provider | Run                                    |  Runtime | End-to-end | Authored summary | Visible result                                                                                 |
| -------- | -------------------------------------- | -------: | ---------: | ---------------: | ---------------------------------------------------------------------------------------------- |
| Slack    | `3ccea4de-8f55-4219-895a-1702853b6e50` | 46.999 s |   49.281 s | 6,775 characters | Full thread reply, ending `SLACK-LONG-COMPLETE-0908`                                           |
| Discord  | `fa3862fe-1c10-4d4e-ba8e-4452cf75e0d9` | 44.616 s |   47.426 s | 6,331 characters | 7 KB Markdown attachment expanded through its final `DC-WHOLE-ANSWER-COMPLETE-0908` marker     |
| GitHub   | `741f9f7c-d334-4df9-94f6-ff14b76bbc24` | 45.183 s |   48.105 s | 5,803 characters | Full disposable PR conversation reply ending `GH-LONG-COMPLETE-0908`                           |
| Telegram | `ae666e16-338c-400a-bc9b-7792f97c1770` | 42.526 s |   44.989 s | 5,876 characters | 6 KB Markdown attachment opened in Telegram Instant View through `TG-FRESH-LONG-COMPLETE-0908` |

Both required ordinary sentences were retained in every result: “One token
can equal one standard game.” and “Use a transparent token system for the game
swap.” Each working/progress/final publication operation used one attempt.
Slack reused message `1788877996.440839`; GitHub reused comment `5586825404`.
Discord delivered one full file as message `1546891437210079363`; Telegram
delivered one full file as `417200359:128`. Discord and Telegram's existing
working message became the timeless message-limit explanation, not a stale
claim that the attachment was still being prepared.

Telegram fresh-task setup is important: `/new` was submitted at 14:40:29.672
and its acknowledgment was published at 14:40:32.267. Only after that visible
acknowledgment did `/task TG-FRESH-LONG-SUMMARY-FIX-0908` start new issue
`CHA-26` at 14:40:45.615. Failed `CHA-24` and the unacknowledged historical
semantic event were preserved. This is a fresh-task success, not proof that
the corrupt session resumed. A read-only recovery audit also found that the
targeted run-detail reset uses an issue UUID while the latest chat session can
use its identifier; alias-aware operator reset is being qualified separately.

Functional outcome: all four fresh long answers reached their provider and
were usable beyond the former truncation boundary. Experience quality still
needs improvement: ordinary phrases such as “token system” with other
punctuation/context, “token design”, and other game-token wording still show
`[REDACTED]`. No historical reply was edited to hide these defects. Permanent
authenticated protocol faults also need prompt, typed user-facing failure
instead of reconnecting until the execution deadline. Teams live qualification
and multi-process Discord takeover remain open.

Master is now incorporated through `0cc796b7b` in `baada1375`. Full workspace
typecheck/build passed after the merge. Release-registry **109/109**, combined
preview/ACPX **23/23**, and source-root patch-routing **6/6** passed; the last
six use synthetic preimages derived from actual patch hunks, not fresh npm
installs. CI on prior head `683067cea` passed build, typecheck/release,
packaging, all browser shards, all workspace suites and four of five general
server shards. The remaining general shard found one real stale-read race in
concurrent identical Slack modal submissions (**2,261 passed, six skipped,
one failed**). The race is being fixed with a deterministic regression. Review
and CI remain merge gates; no Greptile review has completed yet.

## Modal race, scoped resets and final prose regression

`3182b0373` corrects concurrent Slack/Teams modal callbacks that both load an
issued token before one commits its answer. The stale callback now rechecks
current authorization under the existing locks and requires the exact processed
token receipt, canonical answered interaction and original resolving user.
Another token, revoked membership/link, or a relinked active operator cannot
clear that form. The deterministic two-provider case failed before the fix;
the final focused cohort passed **11/11**. Independent review found no new
answer or wake authority and no weakened destination/runtime/identity checks.

`6dab18bba` fixes targeted operator session resets when the UI supplies an
issue UUID but saved chat sessions use the issue identifier. The DELETE resolves
only the current same-company issue's aliases within its own snapshot and
retains agent/adapter scoping. Arbitrary custom keys remain exact-match; model
or run context grants no alias. Seven real-PostgreSQL cases passed twice,
including a root rerun; the combined compatibility cohort passed **217/217**
and server TypeScript checks passed. This does not clear quarantined native
state or establish live corrupt-session recovery.

Root's next full chat run was **389/390**. All modal cases passed. The sole
GitHub lifecycle count failure was traced through the retained database:
exactly four GitHub inbound actions had four wake receipts, each attempt one,
and its seven lifecycle receipts had no wakes. An earlier synthetic Telegram
retry-exhaustion fixture had left one issued action eligible after 30 seconds;
the global worker correctly picked it up during the GitHub fixture. Test-only
`finally` cleanup now removes that exact synthetic action after preserving its
strict six-failure and retryability assertions. The GitHub four-wake assertion
and production worker are unchanged. The fresh full rerun subsequently passed
**390/390** in 91.68 seconds on
`chat_adapters_test_20260908_confirmation_cleanup_laplace_full01`, after all
254 normal migrations. Test/service hashes stayed unchanged during the run.
The prior retry fixture plus GitHub lifecycle focused pair passed **2/2** and
server TypeScript checks passed. Log:
`landing-confirmation-cleanup-laplace-0908-full390.log`.

`d99773a5c` extends only the closed grammatical exception for ordinary game-token
phrases observed in the four long answers. Low-entropy bare token values,
assignments, quotes, compound/CLI keys, credential suffixes and nested secrets
remain redacted. Unknown token-noun phrases can still conservatively redact;
there is no arbitrary-English-word or entropy-based exemption. Independent
review passed. Root passed **231/231** core and **88/88** real transport tests
against newly signed/staged binary SHA-256
`e758b7cdb6ba7c9f176d89cbd17b98dc4c42975326012582d6a7cdf230fb0373`.

After verifying no active Maya run, root gracefully replaced only this server
at 14:52:05.363 UTC, log `server-experimental-landing-44.log`. Startup was ready
at 14:52:11.882 with no ownership claims or awaiting-evidence runs. The
previous five historical blocked run IDs remained unchanged.

The exact observed prose paragraph was then sent in all four existing
conversations. Every visible bot reply preserved economy, station,
reconciliation, limits, rules, design, values, exchanges, count and one-token
limit/rule wording, without a redaction substitution. No old reply was edited.
Every run used native Codex app-server / Luna and succeeded; each working/final
publication operation used one attempt.

| Provider | Run                                    |  Runtime | Submission to final publication | Provider message      |
| -------- | -------------------------------------- | -------: | ------------------------------: | --------------------- |
| Slack    | `f91f3343-1df6-491e-a21f-430c9f65ff0e` | 23.945 s |                        26.578 s | `1788879170.708099`   |
| Discord  | `3c39ed83-0409-4095-abc4-eb27c8d77653` | 24.645 s |                        26.546 s | `1546896106515071038` |
| GitHub   | `2c839667-9c83-4963-b60e-f6941ab0f383` | 25.678 s |                        27.459 s | `5587104571`          |
| Telegram | `7f1c72fd-c22d-48f8-a2f2-0cadb2df2c26` | 24.366 s |                        27.770 s | `417200359:130`       |

These results qualify the observed prose repair and the four existing-task
follow-ups. They do not settle intermittent upstream Telegram ingress delay,
old corrupted-session recovery, prompt permanent-integrity failure feedback,
unfamiliar prose redaction or the remaining Teams/multi-process/file cases.

## Current-master skill preparation merge

`6f90d368a` incorporates master `c723bb4df` (validated runtime skill revision
caching). The two additive import conflicts retain both the chat ingress and
heartbeat preparation timing helpers and upstream failed-skill-preparation
tracing. Independent review found no change to safe external-chat progress or
permission/continuation behavior. Full workspace typecheck and build passed.
Focused merged-source verification passed **80/80** skill service/cache,
**203/203** workspace/session, **38/38** native trace/runtime/progress and
**2/2** native preparation executor tests. The staged runner binary is unchanged.

Greptile completed review of `cd5970276` with **4/5**, finding one P2: the
renumbered interaction-wake migration retains its original 0245 label in
deduplication metadata and operator error text. Migration-history hash
compatibility must be preserved while correcting that provenance. CI and a
clean review of the final pushed head remain merge gates.

After verifying no active Maya run, root gracefully restarted the isolated
server with merged source at 15:04 UTC, log `server-experimental-landing-45.log`.
Startup preserved the same five historical blocked IDs, with no claimed or
awaiting-evidence runs. In the existing Slack thread, a normal follow-up at
15:05:14.176 produced exactly `SKILL-CACHE-MERGE-READY`. Native Luna run
`8b9e0a0e-3d0d-4e86-9009-679783d80799` ran from 15:05:17.542 to 15:05:33.125
(15.583 seconds). Final publication at 15:05:33.462 makes end-to-end time
19.286 seconds. Working/final operations each used one attempt and updated the
same message, `1788879918.356759`. The provider UI visibly cleared its working
indicator and showed one clean final reply. This checks post-merge continuation
on one provider; it does not replace the broader earlier qualification.

## Forward-only migration provenance repair

Greptile's migration label finding is addressed by `e3cfc400e`. The original
0251 SQL remains byte-for-byte identical to its deployed 0245 form, SHA-256
`5e181169a724173d17865d537bd84c385e97e6f78e71aa795cad91734cd37ea0`.
Changing those bytes would break hash-based history recognition and could
replay the duplicate-wake repair. New custom Drizzle migration 0256 instead
corrects only exact legacy `migrationDedupe.migration` values and the matching
generated final audit line. It preserves all wake state, run links, keys,
timestamps, unrelated payload and free-form errors. Primary-key batches are
bounded to 500 rows; locks still last through the migration transaction.

The new cases failed **2/2** with an empty migration, then the complete
reconciliation cohort passed **5/5**, including fresh and deployed-history
upgrades, unchanged original hashes, malformed/unrelated metadata, later
terminalized history, unrelated-only batches and idempotent reapplication.
Root independently passed **48/48** migration/client/snapshot/safety tests.
A fixture JSON typing error found by root's build was corrected; DB build and
typecheck then passed. Independent final SQL/test review found no issue.
The generated snapshot adds no schema delta; the journal now has 255 entries,
11 beyond master. No migration client behavior or historical SQL was changed.

## Database-pool master merge

Master advanced again to `023e640a7` with database pool defaults and orderly
pool closure. Merge `21061f4de` preserves the chat teardown in the sole app
shutdown conflict: unsubscribe publication signals, stop reconciliation and
its timer, await producer/consumer drain, then await chat runtime cleanup.
Upstream's final shutdown awaits that app cleanup before ending the database
pools. The scheduler is stopped once within the awaited app teardown.

Full workspace typecheck/build passed again. A merged-source six-file cohort
passed **71/71**: database client options, client, provenance reconciliation,
server shutdown, chat publication reconciliation and app lifecycle coverage.
Independent ordering review found no regression. Log:
`landing-db-pool-shutdown-merge-laplace-0908.log`. The PR remains one branch,
**483 changed files**, with no lockfile delta relative to current master.
The live server still runs the earlier skill-cache merge (`6f90d368a`);
this last pool/shutdown merge has automated checks, not a new live restart
qualification. CI and final-head Greptile confirmation remain outstanding.

## Permanent protocol-failure propagation

The historical Telegram checksum incident exposed an additional feedback
problem: the controller rejected an authenticated bad semantic digest by
closing its socket, while higher layers kept reconnecting until the turn's
900-second deadline. The current fix distinguishes a proven permanent fault
from an ordinary dropped connection or failed persistence attempt.

`NativeSessionProtocolIntegrityError` carries an allowlisted reason and the
existing `native_event_replay_conflict` disposition. The controller validates
authentication, complete run/turn/item/source identity and source sequence
before latching it. Bad semantic bytes and conflicting committed replay bytes
cannot be committed, ACKed or dispatched. A successful commit already in
flight also cannot reopen dispatch after the latch. Lifecycle command results
remain available for exact-owner suspension; the fix does not discard durable
history or manufacture cleanup success.

The same class instance passes through transport requests and notifications,
the Codex event queue, the harness backend and runtime cleanup. It takes
precedence over buffered success or synthetic governed-wait output. Ordinary
errors and objects that merely resemble its code stay on their existing
paths. A database-confirmed replay conflict now uses the typed class after
the existing authorization and exact-run lock. The server's recovery decision
is permanent/operator-owned, and external chat receives only a safe request
to have a Paperclip admin review the run.

Initial verification passed **130/130** controller/staged-transport tests,
**238/238** Codex-driver/backend tests, **78/78** runtime tests, and **183/183**
executor/coordinator/external-copy tests. The controller cases use genuine
encrypted authentication and cover wrong identity, out-of-sequence input,
repeat faults, transient persistence, in-flight commit and suspension. One
initial transport cohort hit an existing intermittent backlog/turn-ID failure;
the isolated repeat and two later complete transport cohorts passed. Its
original failed log is retained, not rewritten as a pass.

Independent review then found that ancillary executor logging or a failed
recovery-state write could replace the primary fault. Four red regressions
established that gap. The final executor **166/166** pass covers preservation
of the exact original error, continued recovery projection after logging
failure, and no fabricated task/run updates after a failed transaction.
The finalization admission boundary and composed negative-path test are being
qualified separately before deployment; these initial counts are not a
claim that all subsequent edits have completed verification.

## Composed damaged-session replacement proof

A new **35/35** resume cohort includes a real PostgreSQL, runnerd, driver,
native runtime and Paperclip control-plane path. Only the Codex provider
process and a generated historical corruption seed are synthetic. A normally
suspended disposable root receives an invalid pending semantic event. A
nonterminal prior database owner prevents rotation without changing its bytes.
After normal terminal-owner eligibility, the real selector/rebind path tries
warm attachment, which rejects the actual pending-event guard. The governed
continuity-break path then creates one replacement provider turn and persists
exactly one accepted result on the same task and agent.

The archived prior runner-state bytes are SHA-256 identical; the invalid
pending provider event is retained, never repaired or leaked into the new
run. The old provider starts zero turns and the replacement starts one.
This fixture uses persisted execution v2; existing context-guard cases cover
other versions. It is stronger than a mocked selection/rebind or a test that
stops at the replacement callback, but it is not live Telegram `CHA-24`
recovery or proof of external publication. That original live root remains
untouched. Independent server typecheck and formatting/diff checks passed.

## Landing and latest sandbox-recovery master merge

At pushed head `2ded499ed`, Greptile returned **5/5**, with the provenance P2
resolved, and CI run `34248557216` passed every lane. This applies to that
published head, not the later uncommitted integrity work.

Master then advanced to `5752d6bd9`, adding stuck sandbox-plugin setup
classification and bundled-plugin boot recovery. Clean merge `48767c1c0`
retains the native held-owner guard, nonretryable preflight classification,
chat idle handling and unadmitted-wake exclusions. Its internal plugin failure
details are not included in external milestone messages. A six-file
compatibility cohort passed **246/246**, including bundled/loader behavior,
heartbeat recovery, operator notices, chat publication and the composed
damaged-session proof. No migration or runnerd contract changed upstream.

The fresh full chat integration passed **390/390** in 75.93 seconds using
`chat_adapters_test_20260908_integrity_root01`, after all **255 journal
entries through migration 0256**. This run preceded the final sandbox master
merge; the 246-test cohort covers that merge's relevant paths. Full workspace
typecheck and build subsequently passed, along with the final **10/10**
deterministic browser retest. Broader tests are still running.

### Completion admission and primary-error follow-through

The finalization regression is now fixed. Between preparing a semantic result
and invoking `completeRun`, control-plane replay/appends can yield. A final
local snapshot observation rejects a typed fault latched in that interval;
ordinary snapshot/enrichment failures retain their previous behavior. Once
`completeRun` has been invoked, a timeout may mean that its transaction
committed and the acknowledgement was lost. Its deterministic retry therefore
cannot veto that potentially committed result based on a later observation.
This is a local completion-admission boundary, **not an atomic fence with the
remote database commit**. The tests explicitly cover a pending completion
call and both final-event and completion acknowledgement loss.

The two initial pre-admission cases went red-to-green; seven new boundary
cases bring the runtime cohort to **85/85**. The final combined runtime plus
Codex-driver/backend cohort passed **323/323**, with direct TypeScript and
diff checks clean. Required cleanup, quarantine and original startup-race
error preservation remain intact. A composed authenticated negative-path
test subsequently passed as described below.

### Authenticated negative-path composition and live restart

The final negative-path fixture uses a genuine encrypted socket through the
actual durable controller, runner transport, Codex driver, harness backend
and `executeNativeSession`. It injects the invalid frame only after run
admission and a real mapped `turn.started` event. The pending transport read
and runtime reject the same typed object after required cleanup. The fault
fails within five seconds despite a 900-second reconnect setting; source
ACK stays at two, no bad payload is dispatched, no result is accepted and no
replacement process is started. The repeated controller/runtime/driver cohort
passed **132/132**. The synthetic process launcher and in-memory persistence
port mean this is not a Rust-emission, live-provider or server-database test.
Those boundaries have the separate staged transport, scoped coordinator,
executor and composed recovery evidence above. Final runner primary/surface
TypeScript checks passed after adding this test.

Root restarted only the isolated live instance at **16:26:24 UTC**, from
merge `48767c1c0` plus the verified uncommitted integrity patch, using
`server-experimental-landing-46.log`. There were zero active/queued runs;
the prior server gracefully drained zero interrupted runs and shut down its
chat gateways. Pending provenance migration 0256 applied normally. The signed
runner digest remains
`e758b7cdb6ba7c9f176d89cbd17b98dc4c42975326012582d6a7cdf230fb0373`.
All four configured endpoints are active; the Discord gateway connected.

Fresh ordinary continuation `INTEGRITY-LANDING-0908` requested exactly
`NATIVE-LUNA-READY` on existing tasks. Root submitted through the signed-in
provider browsers and saw each final reply with its working state cleared:

| Provider | Run                                    | Native Luna duration | Submit to publication |
| -------- | -------------------------------------- | -------------------- | --------------------- |
| Slack    | `a0f1d707-c6e3-4fd5-90b0-f5d4ba05c48c` | 11.237 s             | 13.146 s              |
| GitHub   | `73ce21b7-9cd8-4380-9bd7-69c9f6992dfb` | 12.686 s             | 17.148 s              |
| Telegram | `823d811f-daad-4bd3-91c0-c1dbdf587e3f` | 14.046 s             | 16.602 s              |

Persisted execution profiles confirm `gpt-5.6-luna` for all three. Each
working/final operation used one attempt and the same provider message:
Slack `1788884841.421029`, GitHub `5588442165`, Telegram `417200359:132`.
No duplicate final reply was observed. Slack's browser initially retained an
older scrolled thread and needed a reload to restore its composer; the new
message then sent normally. This is provider-browser navigation friction,
not evidence of a failed Paperclip delivery.

Discord's Eigenjoy browser login had expired, so no new Discord live send is
claimed. Its login tab was left open and the user notified; the bot connection
itself is active. Teams still lacks a qualified tenant. No corruption was
introduced into live state and the old damaged Telegram task was not reset.

### Final-head review and normal old-task retry

The integrity work was committed and pushed as `d886f52c0`, with **493** PR
files and master `5752d6bd9` incorporated. Greptile reviewed that exact head
at **5/5**, with no outstanding finding. CI `34251447214` hit fourteen
pre-install failures in the lockfile-artifact restore step; sampled job logs
all report `ListArtifacts` HTTP 403 from an intermediary. The policy artifact
exists and five sibling jobs restored it successfully. Running jobs and the
broad local test command are not yet complete. This is not a green CI claim.

Root navigated through Board Tasks to the old Telegram **CHA-24** and clicked
its ordinary **Try again** at **16:35:06.919 UTC**. The UI immediately showed
working state; native Luna run `91a2e169-9674-4853-87ef-22b0d924321e` started
at 16:35:06.982 and succeeded at 16:35:31.003, with one accepted result.
However, this is **not** successful damaged-session recovery:

- The new run used the task UUID as its session key and resumed older provider
  session `01a0802c-06af-7671-b96d-d63d2f5e9b8f`. The damaged run used key
  `CHA-24` and provider session `01a08152-4af9-75a0-bbcb-f40b2f67115d`.
- The new wake reason was `issue_status_changed`, with no `retry_of_run_id`.
  The model acted on the original photo-resend description, not the latest
  failed 900-word request. It reported attachment-binding denial and did not
  resend the photo. A successful run status does not mean the user goal was
  achieved.
- The old Telegram generation 9 remains completed; generation 10 still maps
  to CHA-26. Zero publications were created for the retry. The newer chat did
  not receive an old-task response, and obsolete attachment access was not
  restored. This is the correct safety boundary, not a delivery failure.
- Both damaged root files remained byte-identical: runner state SHA-256
  `b8eedccd5fddbda3f8d099f96ea2e4658360815a133830cfc94a39ecfa011399` and
  provider state `b98888368bfe175e826f6709f34f42b5a1a10c16a6664850b2e24fa6d5a2b09b`.

Experience quality still needs improvement. The task list called the
Board-owned terminal recovery **Observing active run**, the retry's intent
did not match the failed request, and a **Native completion review** remained
visible during execution. No completion was approved. The label is being
corrected below; retry-context and retired-conversation feedback remain a
follow-up. No direct database or saved-runner-state repair was used.

The shared recovery badge now displays **Recovery needed** for a Board-owned
watchdog, including terminal native faults. The expanded card says that a
human decision is needed instead of claiming a silent active run. Existing
agent observation, resolved/cancelled/escalated precedence and authorized
controls remain intact. Four cases demonstrated the old error before the
fix; the final four-suite UI cohort passed **125/125**. UI TypeScript and all
four mandatory `check:token-gates` checks passed. A separate forbidden-name
`check:tokens` command still reports unrelated existing fixture/Storybook
content; no broad cleanup was performed.

Root reloaded the live UI, navigated through Tasks and Inbox, and visually
verified the corrected badge on existing failed **CHA-6**. No run or recovery
action was changed during that check. The expanded card has component-test
coverage but was not visible in this live chat-interface journey. The final
PR diff remains below the review cap at **497 files**.

Read-only comparison with master `5752d6bd9` confirmed the generic retry
context loss predates this PR. The follow-up must bind an explicit failed run
on the server, preserve exact request/comment and task-key lineage, and
revalidate current chat generation, identity and reach before any mutation.
A retired conversation must yield actionable guidance and no queued run.
Concurrent restart/newer input, duplicate retries, cross-company references
and operator-required native faults need negative tests. This is not fixed
by restoring stale chat credentials or bypassing corrupt-session guards.

### Early semantic input versus turn admission

The subsequent broad local run stopped in general-server after **8,208
passed, 30 skipped and one failed** test. The composed real-runner recovery
fixture saw its event stream close before a terminal fact. Five focused
stable-environment repetitions and six whole-file repetitions (**35/35** each,
zero skips) did not reproduce it. Bounded failure-only runner and canonical
event diagnostics were added; none of the ownership, archive or result
assertions was relaxed. The exact historical failure cause remains unproven.

Independent investigation did produce a deterministic related failure: an
authenticated `paperclip_finish` can arrive on the semantic callback path
before the turn-start response establishes the driver’s active provider turn.
The driver rejected that valid call as `tool_binding_mismatch`. Waiting only
in the driver is insufficient because the transport had already copied its
temporary turn identifier into the callback parameters.

The fix adds two admission barriers. The transport waits for the exact
captured start to settle, then checks its epoch, controller, thread and durable
correlation again before constructing provider parameters. Failed startup,
close, detach, a newer start or a typed integrity failure cannot release an
old call into a different turn. The driver separately waits for admission
and then applies its unchanged exact thread/turn guard. Durable semantic
dispatch does not block command-result ingestion or cumulative ACK, so the
barriers do not deadlock that connection. No arbitrary delay, retry loop or
alternate identity was added.

Evidence for the final source:

- Deterministic driver repro went red to green; foreign-turn rejection remains.
- Authenticated controller → transport → driver → backend → runtime tests
  passed **16/16**, including withheld start response, a mismatched provider
  start, failed startup, typed faults, superseded epoch, close and detach.
  Valid early input waits and produces one accepted result. These tests use
  a synthetic launcher and persistence port, not a real provider or database.
- Full controller/staged-transport/Codex-driver/backend cohort passed
  **326/326** with the then-current 12 composed cases; the expanded 16-case
  cohort passed separately. Runtime passed **85/85**. Do not claim a combined
  330-test invocation that was not run.
- The real runnerd/PostgreSQL recovery file passed **35/35**, zero skips,
  after the production fix. Source hashes remained unchanged across that run.
- Full workspace typecheck/build and another fresh chat integration
  **390/390** passed. The integration database was created separately on the
  existing isolated PostgreSQL server and migrated through all 255 entries.

The remaining broad groups exposed separate local test-environment failures:
Workspace B passed **2,996** with 60 skipped; Workspace A passed **6,083**
with one skipped and three embedded-PostgreSQL bootstrap failures. The entire
affected CLI worktree suite then passed **63/63** unchanged with exclusive
database-test access. One serialized server suite hit the same startup error;
a later serialized run passed that suite but stopped on a `socket hang up` in
the unchanged company-import transfer suite. Its full isolated repeat passed
**24/24**. The local machine had 29–30 shared-memory segments against a limit
of 32. Contention is a supported inference, not captured historical stderr.
No global IPC state, unrelated PostgreSQL process or system limit was changed.

A new complete `pnpm test:run` was started after the final build with no other
agent starting an embedded database. Previous failed invocations remain
recorded; focused repeats do not turn them into broad-suite passes.

The admission fix was deployed to isolated server **47** at **16:57:20.764
UTC**, after the full build. No queued or running heartbeat existed. Server
46 drained zero interrupted runs and closed remaining idle HTTP connections
after its normal five-second deadline. The signed native binary hash is
unchanged. Root then sent the same `ADMISSION-LANDING-0908` request through
all three signed-in provider browsers at **16:57:53.655 UTC**, requesting
exactly `ADMITTED-NATIVE-LUNA` on the existing tasks.

| Provider | Run                                    | Native Luna duration | Submit to publication |
| -------- | -------------------------------------- | -------------------- | --------------------- |
| Slack    | `1edcefd6-00aa-41bf-8c82-d89ab2ba3fa6` | 11.743 s             | 14.741 s              |
| GitHub   | `ea8a948f-841e-4932-a29a-eff45118a048` | 13.354 s             | 18.018 s              |
| Telegram | `7a4e76f1-1a97-4ee3-b004-8bba06ff5426` | 13.267 s             | 15.940 s              |

All three runs succeeded and their persisted profiles specify native
`gpt-5.6-luna`. Root saw each exact final reply and the working indicator
clear. Each working/final operation used one attempt and updated one provider
message: Slack `1788886677.466519`, GitHub `5588819297`, Telegram
`417200359:134`. No duplicate final was observed. This is a continuation smoke,
not fresh coverage of every file/interaction permutation or old-task recovery.
Discord still requires renewed browser login; Teams still requires a tenant.

Before this admission fix, PR head `5aa2ac46c` passed all CI lanes in
`34252696878` and Greptile at **5/5**. Those gates must run again for the new
patch and latest master `be6bb768b`, which arrived during final qualification.

### Accessible-company master merge and final landing pass

Merge `49de75691` incorporates master `be6bb768b` after admission fix
`46a946aae`. The only manual conflict retained both the chat OpenAPI assertions
and upstream accessible-company query assertions. The review diff remains
**497 files** and has no lockfile delta. The merged compatibility cohort passed
**256 UI + 32 server tests**, covering company selection, catalog routes,
production GitHub tools, experimental chat visibility, authorization and
OpenAPI. Full workspace typecheck and build passed again after this merge.

Isolated server **48** started at **17:03:55.700 UTC** from `49de75691`,
with zero active/queued heartbeats before shutdown. Server 47's three live
native continuations above cover the unchanged native admission code; this
restart additionally loads the merged company route. The broad local test
invocation began before this small master merge and is still running; its
earlier failed invocations remain recorded. New final-head CI and Greptile
review are required before merge, even though the preceding published head
passed both.

Root reloaded the existing Board catalog. It showed the expected company,
all four configured connections as active, and the enabled experimental chat
surfaces without an error banner. The initial loading screen resolved and
the server health became ready. This is a catalog smoke on the merged server,
not a repeat of the separately qualified default-off or provider journeys.

Final independent driver review found one additional direct-transport edge.
An optimistic `turn/started` notification could set the active identity, then
a start response without `turn.id` threw without clearing it. An already
queued semantic call could consequently succeed despite failed admission.
The deterministic case failed before the fix. Clearing the provisional active
turn and started state before the existing throw now rejects that call and
preserves the original omitted-id error. The focused Codex cohort passed
**178/178** across nine files, including 17 integrity/composition cases;
runner no-emit TypeScript checks passed. No accepted/result/terminal completion
event escaped the failed start. The native transport has its own malformed
response guard; this closes the driver layer too. No further admission-fence
blocker was found. Build/deployment of this final small defense is pending;
server 48 still contains the preceding verified driver source. The broad run
started before this follow-up and is not exact-final-head proof for this hunk.

### Final driver deployment and live file qualification

At head `aaa74597f`, CI **34255076310** passed all lanes and Greptile scored
**5/5** with no outstanding finding. Master remained `be6bb768b`; the review
diff remained **497 files**, with no lockfile delta. A subsequent test-only
fixture cleanup and this evidence record require renewed final-head gates.

The final runner TypeScript build passed and isolated server **49** restarted
at **17:23:07.133 UTC**; health and startup recovery were ready at
**17:23:10.159 UTC**. The previous process had zero active or queued heartbeats
and drained without interrupting runs. The signed native binary stayed at the
same SHA-256; no Rust restaging was needed. The server loaded the final
malformed-response guard, with only test-fixture edits dirty at startup.

Root repeated the disabled-experiment journey on server 48 after the
accessible-company merge: **Settings → Experimental → Chat connectors off →
Connectors → GitHub → Connect**. Chat-only providers and existing chat
connections disappeared, but GitHub opened its production tool account setup
directly, without the chat/tool choice. Root canceled that setup without
creating a connection, restored the experiment through the UI, and verified
all four active connections. The expected company remained selected and no
error banner appeared. This covers the final company-navigation merge, not
every viewport or transition timing.

New signed-in browser file checks on server 48 used native Codex app-server
with persisted **`gpt-5.6-luna`** (effective reasoning effort unverified):

| Journey                                            | Native execution | Submission to useful result |
| -------------------------------------------------- | ---------------- | --------------------------- |
| New GitHub private main-conversation image         | 20.846 s         | 26.303 s                    |
| New GitHub generic private file, truthful omission | 15.912 s         | 21.116 s                    |
| Slack exact original-file return                   | 42.115 s         | 46.266 s                    |
| Telegram exact original-file return                | 49.995 s         | 54.863 s                    |

The GitHub repository remained private, with unchanged App permissions. The
new image imported with exact fixture bytes and the response accurately
described it. The generic text-file request received one current-input
`download_unavailable` omission, zero imported/generated attachments, and a
truthful unavailable answer rather than values invented from an earlier file.
The separate [private attachment authority record](2026-09-08-github-private-attachment-authority.md)
documents that narrow boundary and source/body binding.

For Slack and Telegram, root uploaded the same new synthetic text fixture,
asked for its content and exact original file, saw the correct values and a
native downloadable reply, and **downloaded each provider-returned copy using
the real browser UI**. Source, stored inbound blob, originating-run output
blob, and both downloaded copies are **152 bytes**, SHA-256
`e5ea1c89ad69c0ae9dffea0599c730e5d284816dbcd9dae44746c7a29f790293`.
All copies were independently rehashed. Telegram's download-event observer
timed out, but the new OS download existed and matched; root did not resend
or click again. This observer failure was not a delivery failure.

Each final publication used one attempt. Slack's accepted upload receipt was
processed once. Working and final text reused the same provider message;
file attachments appeared separately without a duplicate final or a lingering
working state. Scoped current delivery/action/wake/run/event/result/comment/
publication checks found no signed-query or credential leakage. These are
ordinary file handoffs, **not** proof of the specific attachment-reuse tool,
provider latency percentiles, or every restart/revocation case.

Functionally, the new Slack and Telegram files were useful end to end: visible
content matched and the downloaded files were usable. Their native execution
still accounted for most of the 46–55-second wait. The GitHub image path also
worked; generic private files remain a real provider limitation with truthful
feedback, not universal file support. Teams and renewed Discord browser
qualification remain separately blocked by their documented access gates.

Server 49 then passed `FINAL-GUARD-SMOKE-0908` in the existing Slack thread:
the exact requested final arrived in **17.297 seconds**, including **15.244
seconds** of native Luna execution. One working/final message was updated,
with one attempt each and no lingering working state. A fresh GitHub private
**inline review-thread** image also passed in **31.028 seconds**, including
**23.822 seconds** native execution. The stored bytes matched the new upload,
the exact review-root/source-body/current-comment binding held, and the
correct visible reply stayed in that review thread after refresh. This
qualifies the review-image path separately from the main-conversation case;
it does not replace changed/deleted-source or interrupted-download testing.

### Slow-suite Slack receipt fixture isolation

The latest broad local `pnpm test:run` stopped in general server at **8,207
passed / 30 skipped / two failed**. Both failures were strict worker-count
assertions in the Slack receipt cases, not a demonstrated duplicate live send.
The later workspace and serialized groups were not executed by that command.

An independent deterministic reproduction identified the causal chain. The
earlier rate-limit classifier fixture left its endpoint active and its
publication scheduled five seconds into the future. A later service's global
drain legitimately claimed that different endpoint's retry and its own upload,
returning two instead of one. The failed assertion then left an unprocessed
receipt, which the next test counted instead of zero. Advancing only Date by
six seconds reproduced both failures on a fresh database in **1.85 seconds**.
The same-attempt ownership guard itself remained intact.

The test-only fix wraps the classifier and four related receipt fixtures in
failure-safe teardown: stop their exact service, then pause only that fixture's
still-active endpoint. Publication/receipt audit rows and all strict counts,
retry-deadline and competing-owner assertions are preserved. An adjacent
fixture that intentionally retained a two-second retry receipt receives the
same cleanup. The deadline-crossing regression stays in the test; bounded
failure-only diagnostics report at most 20 synthetic rows. No production
worker or provider retry behavior changes.

The focused causal cohort passed **8/8**, server no-emit TypeScript checks
passed, and the repaired full integration file passed **390/390** on fresh
PostgreSQL database `_06` in **102.93 seconds** (113.74 seconds total).
The only subsequent behavior-neutral edit caps diagnostics on the failure path;
the separate classifier/receipt confirmation passed **10/10** on final bytes.
The original
failed broad invocation remains failed, not retroactively green.

Separate continuation groups passed UI **5,614/5,614**, the nine remaining
workspace-B projects **2,170 passed / 19 skipped**, and the complete DB project
with one worker **122 passed / six skipped**. The original workspace-A CLI
portion had **477 passes / two bootstrap failures**; captured PostgreSQL stderr
confirms shared-memory exhaustion. Workspace B had stopped at DB with **89
passes / 38 skips / one bootstrap failure**. A CLI rerun accidentally used
noncanonical `/tmp` and hit 14 path guards; correcting the wrapper yielded
**478 passes / one source/target database bootstrap failure**, not a complete
CLI pass. Host usage remained 30 of 32 shared-memory segments. No positively
identified database from these completed test roots remained to clean up.
Global IPC limits, unknown segments and unrelated databases were untouched.
The documented serialized group then stopped at suite **97/143** with
**1,504 passed / 21 skipped** and no assertion failures. The queued-comments
route fixture could not bootstrap PostgreSQL; **46 suites were not reached**.
Captured stderr reported `shmget ... No space left on device`, and host
shared-memory usage reached **32/32** segments. No positively identified
current-task cluster remained to clean up; no further unchanged retry was run.

### Reasoning-effort evidence correction

The live runs demonstrably use native Paperclip Runner, Codex app-server and
`gpt-5.6-luna`. Earlier notes also called them low reasoning because Maya's
agent configuration contains `modelReasoningEffort: "low"`. A final audit
found that this legacy field is **not projected by the native execution path**.
The measured timing, provider identity, bytes and delivery results remain valid;
verified low reasoning was an unsupported inference and is corrected above.

The provider resolver produces identical closed profiles for synthetic low and
high inputs: Codex, Luna and the configured approval policy. The native input
contract has no reasoning-effort field. The native Codex transport and Rust
provider omit it from thread start/resume and turn start, and the generated
isolated configuration and launch arguments add no override. Actual effort
may depend on provider defaults or resumed state; it was not measured here.
The decisive resolver, native contract, Rust provider, context materializer and
security-argument files are byte-identical to master `be6bb768b`, so this is
a pre-existing runner limitation rather than a chat transport regression.

Follow-up: if native reasoning selection is exposed, carry a validated value
through the closed provider contract, persisted execution identity and provider
request, test new and resumed sessions, and verify it with the live provider.
Do not silently inject legacy configuration into the closed native boundary
or expand the chat landing patch into an unreviewed runner protocol change.

### Changed GitHub source and renewed landing gates

The real private-image source-change journey now passes on isolated server
**50**, started from clean documentation head `179fb5a53` at
**17:39:47.681 UTC**. The native production code and signed binary are unchanged
from server 49. Root stopped the prior server only after zero active/queued
runs, uploaded a new synthetic private image through the GitHub browser while
ingress was offline, and edited that same source before recovery. The supported
App webhook API then redelivered only the exact original created event once.
The [attachment authority record](2026-09-08-github-private-attachment-authority.md)
records the exact source hashes and bounded proof.

Paperclip rejected the canonical body mismatch before selecting a signed image
target. The current input had one unavailable omission and no attachment or
view event. Native Luna took **14.881 seconds**; one final publication arrived
**17.755 seconds after ingress** and truthfully said the exact image could not
be imported. Root saw the final reply in GitHub. This is changed-body rejection,
not deleted-source or in-flight revocation qualification.

The test also exposed a separate callback failure: GitHub reported a bot-created
event **502 in 0.1 seconds**, with an empty response and no headers. Its
destination exactly matched the current App webhook and successful neighboring
deliveries. No matching request reached the local proxy or Paperclip. The later
bot-edit callback reached Paperclip and was correctly filtered, but that does
not explain the missing created callback. A bounded Tailscale/system-log query
found no matching failure diagnostic. Its pre-proxy cause remains open.

Greptile reviewed exact head `179fb5a53` at **5/5**, with zero new findings and
the previous thread resolved. CI **34257833081** failed its runner Build lane:
the real-transport **1,024-event suffix** case rejected the first close with
`NativeSessionCloseUnrecoverableError`. The runner cohort had **1,702 passed /
three skipped / one failed**; this was not an artifact-restore or database
bootstrap failure. Preserve stop/drain/suspension and ownership assertions
while investigating. Both remaining general-server shards subsequently passed;
the completed run failed only this lane and its aggregate gate. The preceding
production head's green CI does not erase this failure.

Merge `7401e6a72` then incorporated master `db85bf4b7`, preserving the simpler
production GitHub repository list and configuration link. The merge was clean;
the experimental entry-point gate is separate. Its six-file UI compatibility
cohort passed **221/221**, and all four token gates passed across 961 files.
Fresh final-head verification is still required before merge to master.

Root also repeated the real UI entry-point journey after this merge: account
menu → Settings → Experimental → Chat connectors off → Back to app →
Connectors → GitHub. It opened normal tool account setup directly, without
the chat/tool choice. Cancel created no connection. After restoring the flag,
all four active chat connections reappeared and GitHub offered the exact two
chat/tool choices. The UI uses Vite middleware and was reloaded; the backend
process stayed on server 50. Root inspected the rendered setup and chooser.
The flow was understandable and showed no error banner or unexpected sign-in
redirect. This is entry-point proof, not live permission-list population: that
upstream rendering has the separate automated coverage above.
