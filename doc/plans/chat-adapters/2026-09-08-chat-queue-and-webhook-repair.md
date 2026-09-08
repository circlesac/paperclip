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
