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
