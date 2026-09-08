# Chat queue, Gateway admission, and GitHub reconnect checkpoint

## Execution target

The isolated live agent remains Maya E2E, `31f56712-3944-423e-b7c7-404bb8fbb993`,
using `paperclip_runner` and `gpt-5.6-luna`. The staged runner binary remains
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
exception is being implemented; it must retain current actor/reach checks and
reject stale deliveries across reconnect.

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
