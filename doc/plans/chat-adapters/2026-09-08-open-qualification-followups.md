# Temporary chat qualification handoff

This note is for the implementing agent. **Delete it when the remaining items
are fixed or moved into permanent verification documentation.** It is not a
release-completion claim. Completed work and historical failures are recorded
in [the permanent qualification log](2026-09-08-chat-queue-and-webhook-repair.md).

## Current work: exact chat retry, accepted answers and session recovery

Current deployment (September 9, 01:09 UTC): server **66**, PID **61423**,
handle **47172**, is healthy on **127.0.0.1:3137**, loaded code `807e2ace2`.
The private Tailscale Board URL and webhook-only proxy are unchanged. Server 65
drained with zero interrupted runs and closed; server 66 startup recovery is
ready. No new heartbeat was created and historical Discord/Telegram maintenance
attempt counts stayed 1/2 respectively: the new path fix did not replay them.
Normal staged runner remains SHA `4acf2d1dbe99a6202d07b6d0be73b469ebf153103cda2bbd097e5e4233fcd57a`.

Next: once the user unlocks the Mac, run the same two-file native Discord/Slack
journey against deployed batching guidance and compare actual end-to-end
latency/tool cycles, including provider redelivery. Verify the GitHub unavailable-
file response gives the new safe fallback. Do not substitute fresh requests for
the blocked historical Telegram B and call it recovery. Finish tenant-qualified
Teams and broader provider fault/media coverage only when the needed real
access is available. Forward provider-startup receipt design remains a separate
hardening item; it needs exact no-launch failure-evidence ordering and cannot
infer whole-provider retirement from a leader-exit fact.

September 9, 01:08 UTC: the paginated SQLite path repair is frozen and
independently reviewed. Two genuine additional regressions covered mixed-case
table trigger lookup and foreign-key update cascades; both now deny before
launch. **252/252** executor cases and server types pass. The actual pinned
Codex 0.153.4 canary proves exact stale-path failure, then same-thread paginated
resume in staging and after canonical activation, without any model turn or
original fixture mutation. Root reproduced it twice and promoted the portable
opt-in canary to `scripts/tests/native-cleanup-paginated-codex.mjs` with an exact
version pin, fresh-home path validation and bounded child shutdown.

The Mac locked during browser inventory; no further browser actions were
attempted. The user has been asked to unlock it. Automated/code work continued;
live batching A/B and remaining provider qualification are paused, not passed.
The latest GitHub fallback guidance passed the composed 36-case instruction
cohort and is pushed as `53e039149`; batching is `18068c865`.

Slack's delayed restart check is conclusively provider retry #2 / `http_error`:
61.530s before durable ingestion, 0.792s to run admission, 13.062s execution and
0.306s final publication, **75.690s total**. The retry received HTTP 200 in 23ms;
no original request reached the local proxy. Initial upstream failure remains
unknown. Historical Discord `mZx1xU` and Telegram still lack sufficient ownership
evidence. A forward-only receipt design needs separate authenticated spawn and
failed-initialization cleanup facts before durable command failure; leader exit
alone must not be called whole-provider retirement. No such eligibility change
has been implemented or authorized by later process absence.

September 9, 00:58 UTC: `e0494d8d8` is pushed; root's full deterministic
chat browser suite also passed **22/22** (2.5 minutes) after the Board repair.
Post-restart exact replies succeeded in all three existing Discord/Slack/GitHub
tasks and native sessions. However Slack's provider timestamp preceded local
delivery ingestion by about 62 seconds; its run itself took 13 seconds. Boole
is tracing that pre-ingest delay; do not report execution time as user latency.

James proved the historical Discord failure in pinned Codex's actual paginated
thread resolver: it refuses the absent canonical SQLite rollout path rather
than scanning the copied sessions tree. The narrow repair is rebasing only the
exact selected path in a new private snapshot, then back to the canonical path
after proved stop and before activation. Its failed `mZx1xU` runner has an exact
exit-1 receipt, but failed provider initialization has no new authenticated
provider-exit proof. Keep that historical attempt and Telegram closed to retry.

Media timing attributes roughly 56–60 of the 68 seconds to provider/model work
across 6–7 sequential tool cycles, not file IO or the inbound queue. Native-only
batching guidance passed 36 focused tests and server types; deployment and
same-input A/B measurement remain pending. Do not shorten shutdown safeguards.
Exact App REST reads also confirmed GitHub's current private generic-file
fixture has no signed download target, while the image fixture does. Retain the
safe omission; no cookie or credential forwarding workaround is authorized by
that evidence. Provider/file coverage and actionable fallback remain explicit.

September 9, 00:52 UTC: server **65**, PID **68642**, runs `d47f2099f` on
loopback 3137. Server 64 drained with zero interrupted runs and closed cleanly.
The new canonical lane automatically preserved and archived Discord CHA-29's
original owner, then staged the complete 51,434,930-byte provider home. Its
control-only maintenance still became `operator_required`, request
`native-cleanup:75e0faf7-bc67-4a4b-b206-ce0c0f4340be`, staging `cleanup-mZx1xU`.
James is diagnosing that exact failed copy read-only. Do not retry from the
original or manually move either directory. Archival success is not settlement.

The Board accepted-answer fix now passes 282 focused cases, contract/UI types,
token gates and live UI retest. Original CHA-29's full 1,340-character checklist
is visible across all three sections after reload; its later failed B remains
correctly separate. A steering-anchor regression ensures an accepted response
split from its terminal renders exactly once. No provider publication, semantic
result or historical failure was rewritten. Native image+text round trips in
the fresh Discord and Slack threads also passed, with actual provider previews;
both took about 68 seconds. Epicurus is measuring model/tool versus transport
latency without changing live state. Teams and historical Telegram gaps remain.

September 9, 00:48 UTC: server **64** (PID 61627, port **3137**) is running
`58de1c105`, including the normally staged runner below. Fresh Discord CHA-32
and Slack CHA-33 completed checklists and separate follow-ups. Genuine overlapping
pairs then passed on Discord, Slack, and GitHub QA PR 3: the second source arrived
while the first run was active, and the second run began 53–61ms after the first
finished. Each pair retained its own task/native session, both results were
accepted/committed, and provider UI showed the requested distinct answers once.
Discord C/D ran 26.72/11.59s, Slack C/D 38.31/12.19s, GitHub A/B 28.21/12.95s
(execution durations, not end-to-end latency; queued requests waited for their
predecessor). Maya uses `paperclip_runner`, `codex_app_server`, `gpt-5.6-luna`.
No false Discord edit events were generated for the fresh thread. Native agent
image/document inspection and exact-file return are now running in both fresh
Discord and Slack threads; direct Board uploads already passed, but do not
conflate those two paths.

James is implementing canonical source archival with an evidence-preserving
prepared-intent ledger before rename, including a durable normal-admission guard.
Executor tests pass 244/244 and types pass; real-database discovery verification
and independent fail-closed review are still in progress. Do not deploy this
moving slice or mutate old sources manually. Boole reproduced a separate Board
rendering defect: accepted `response_wake` answers are complete but blanket
`yielded` filtering hides them. He is fixing a narrowly authoritative same-run
accepted-result marker; ordinary waiting/attention/proposed results must stay
hidden. Telegram's old epoch-1 receipt remains missing; Teams live qualification
still requires a Microsoft 365 bot/tenant setup, not merely personal Teams login.

The following entries are historical checkpoints, not the current deployment.

September 9, 00:38 UTC: the composed chat integration suite passes **578/578**
on fresh `chat_adapters_discord_upload_20260909_full01` (121.61 seconds), zero
skips. Discord's pinned Gateway repair suppresses metadata-only updates only
with complete, exact old/new authored snapshots. Attachment-only revisions
remain distinct, and real edits still invalidate exact native attachment
read/reuse. The adapter/runtime/hydration cohort passes 152/152 and server
typechecking passes; independent review found no blocker. Inline upload and
pending-send feedback fixes are pushed as `8adc6c8a5`, with browser 22/22 plus
final changed cohort 5/5, UI unit/draft 26/26, types and token gates passing.

Next deploy the frozen combined code as server 64, then qualify fresh native
Discord/Slack turns. Do not conflate those with recovery of the old failed
turns: read-only audit found Discord's exact completed owner remains at a
nonempty canonical root, which current maintenance refuses before archival.
James has a narrow evidence-preserving archive-under-lease plan, awaiting
root's post-deployment GO. Telegram BufsxY still lacks an exact epoch-1 exit
receipt; no safe automatic retry is currently supported. Never manually move
either source directory or rerun the accepted answers.

Latest verification (September 9, 00:34 UTC): the definitive stop no longer
issues a second cooperative interrupt. Its genuine regression failed after
30.04 seconds before the fix. Rust verification passed 239 library cases,
72 provider cases (one existing helper ignored in that target, run separately
and passed), 10 native-wrapper cases, and five focused stop cases. Bounded
provider-home preservation and exact-child-completion changes passed 223
executor and 100 transport cases, server/package typechecks, and independent
review. Root built and staged the normal optimized runner, SHA-256
`4acf2d1dbe99a6202d07b6d0be73b469ebf153103cda2bbd097e5e4233fcd57a`,
verified its strict signature, and ran all 12 real-process maintenance cases
against that default artifact (51.26 seconds, no debug override). It is not yet
deployed: server 63 still runs the earlier loaded code. Historical BufsxY is
still operator-required; the new proof does not manufacture its missing exit
receipt. Discord's metadata-only source-update repair remains in progress.

The user is signed into Discord and the session works. A separate Board-to-
Discord media journey succeeded: newly uploaded image and document, explicit
Send to channel, then actual image and text preview in the provider thread.
The three publication parts completed once each in 2.1 seconds without another
agent run. Root is finishing UI tests for inline upload and a misleading
in-flight delivery warning. This is not an agent-response/recovery pass.

Latest live checkpoint (September 9, 00:17 UTC): `1b81b6a39` is pushed.
Server 63 is PID 45413 on **127.0.0.1:3137**, not 3103. Other worktrees' test
processes repeatedly occupied 3103, so servers 61 and 62 selected 3108. Both
were stopped gracefully through their exact live handles while idle. The
dedicated server's bound port and completed startup are verified. Private
Tailscale Board HTTPS still uses the same hostname, now forwarding to 3137.
The existing public webhook-only proxy remains on 3104 and now targets 3137;
its public ports, host/path restrictions and Funnel exposure are unchanged.
Do not operate on another worktree's listener or use 3103 for this instance.

The user logged Eigenjoy back into Discord. A new root in Clawd general created
thread `1547036525059907626` and task CHA-29. Run
`29d19d67-9591-469d-ada3-f72261b732d0` accepted its result, then failed physical
close after 36 seconds; automatic finalization subsequently committed it. The
provider still shows failure, not the requested checklist. Follow-up run
`6b6f6db4-7d3b-4b40-beb7-f385cb610cbc` and Slack run
`c848f62a-ec8b-449b-8652-119819842ae5` were blocked by the cleanup-domain
quarantine. Slack root is `1788912694.890079`, task CHA-30. No Slack B was sent.
This is a failed live A/B journey, not a FIFO pass or acceptable UX.

Two defects are being isolated in parallel. Discord generated an edit event
454ms after the root despite unchanged text and no edited timestamp; a real
adapter probe reproduces this with thread-only metadata. The exact live wire
payload was not retained, so that trigger is an inference. The accepted-result
close also queues a second synchronous interrupt before shutdown; it can wait
longer than the outer close deadline. Preserve all current source and native
evidence; do not clear the quarantine or rerun an already accepted result.

The earlier Telegram continuation also failed safely. Epoch 0 retired, but the
next provider resume had no rollout in its copied home: only three journals,
not the required provider history, had been copied. The new failed staging
directory is `cleanup-BufsxY`; its missing epoch-1 retirement must not be
replaced by a later process-absence guess. James owns bounded provider-home
copy and exact-child-completion regressions. Epicurus owns the new close
failure; Boole owns the metadata-only Discord edit regression. Media-routing
and separate retry-identity fixes passed root's combined full integration:
**576/576**, zero skips, on `chat_adapters_media_identity_20260909_full01`
(278.67s). Focused physical retry tests passed 20/20, retry service cases
39/39, media service cases 16/16, and real-adapter/hydration/error cases 107/107.
Server typechecking passed. These fixes are being committed independently;
the moving home-copy, close and Discord metadata repairs are not included.

Newest release evidence (September 9, 00:04 UTC): the ownership admission gate
is fixed and independently reviewed. A genuine red test reproduced commands
starting before the spawned-process receipt committed; a second reproduced a
pending peer being welcomed after another peer latched an integrity fault.
Both now fail closed. Controller tests pass 49/49, full transport 97/97, and
all nine real maintenance cases pass against the normally staged optimized
runner, SHA-256
`6a22b20ffd1c32a2866e804dc2b36e984618aaf8065c811533739deb79ec7d95`.
Strict code-signature verification, normal TypeScript build, package no-emit
checks and server typechecking pass. Live deployment and the original Telegram
file retry are the next actions, not yet established outcomes.

Slack's exact active bot `U0C05EDC10R` is still a member of private test channel
`C0BUT55N9RV`: authenticated provider reads confirmed membership and three
members. The browser's one-member display and similarly named app suggestion
are not grounds to change access. Refresh and select the exact current bot.
Discord's Eigenjoy browser session was restored by the user and verified live.
No bot token rotation or provider access changes have been made.

Newest evidence (23:55 UTC): the browser is available again. Root retried the
original GitHub B run `38dfc3ec-4fa7-4ed4-8563-7650dfce3d47` through its Board
Retry control, producing run `7c4827a6-705a-4295-8196-f51a821a4af3`. It ran on
Paperclip Runner / Codex / `gpt-5.6-luna`, succeeded in 15 seconds, and updated
GitHub comment `5593571969` to exactly `CONTROL-FIRST-B-READY`. Refresh and visual
inspection confirmed the result in QA PR 3. The old failed-attempt notice is
still visible above it: functional retry succeeded, but historical-failure
presentation still needs judgment. No new source request was substituted.

The strict copy-only legacy proof now accepts the actual 91 receipts with both
retained snapshots unchanged. It matches Rust's explicit nullable command
fingerprint fields, validates complete envelopes/wrappers, exact diagnostic
suffix and expired capability pointers. Pure-proof/discovery tests pass 60/60
and server typechecking passes. This is **not** a runner-exit or live-cleanup
claim. The new controller still needs a pre-authentication barrier that prevents
command delivery until its spawned-process receipt commits. Do not deploy or
invoke maintenance until that moving slice passes composed tests and review.

Cold terminal reconciliation is repaired in the producer and both native
wrappers. Its separate physical-cleanup marker blocks ordinary work until a new
exact stop proves exit. Journal-capacity and pre-authentication timeout tests
preserve the old terminal receipt instead of making its state unreloadable.
Rust verification: 239 unit tests, 70 Codex provider tests, and 10 native-selector
tests passed; the existing ignored subprocess helper executed separately and
passed. The normal release build succeeded, but has not been staged or deployed.

Source-revocation full-suite verification now passes **560/560** on fresh database
`chat_adapters_revoked_edits_20260908_full03` (124.07s), with focused 25/25 and
server typechecking also passing. The exact provider edit remains an invalidation
after the editor is revoked and later regranted; it never admits new content,
downloads a file, or wakes the agent. Full01 was
558/560: one broad fixture queue sweep admitted unrelated earlier Slack work,
and one old expectation still required filtering rather than content-free
invalidation. Both were corrected without weakening no-wake/no-content checks.
Full02 was 557/560 with three timeouts aligning with recorded Mac sleep periods
(including 453-second and 186-second sleeps). Do not increase test deadlines or
claim either earlier full run passed; the successful repeat used command-scoped
idle-sleep prevention, never a thermal-safety override. These source fixes are
not yet deployed to server 60.

Latest checkpoint: `9ef354692` is pushed and deployed as server 60 (PID 11488,
port 3103; log `server-experimental-landing-60.log`). The earlier recovered-answer
replacement and Telegram sizing fixes are also deployed, but their changed
behavior still needs live UI retesting.
The previous qualification turn made progress: Telegram's original accepted
photo answer was automatically presented, without another heartbeat or provider
run. The next turn handled only the requested PR image removal; qualification
has now resumed. Physical session cleanup and the original file retry remain
unproved. Read this latest live outcome before relying on historical notes:

Server 60 authenticated and attempted automatic maintenance at 22:52:39.684 UTC,
request `native-cleanup:8065a025-239b-4f83-8589-57d58e75819e`. It recorded 91
content-free cleanup events, then stopped with `operator_required`. The new
staging directory is the exact scope's `cleanup-A2FMbq`; its original pending
stop/suspend commands now report supervised `codex` spawn `ENOENT`. Inspection
found the maintenance caller omitted the native host environment: unlike normal
execution, it supplied neither executable search path nor source login home.
The copied provider state is byte-identical to the original, generation 21 with
128 pending events and no new provider identity. The runner is suspended with
empty outbox; canonical state is still empty. No new heartbeat was created and
all three original quarantine hashes are unchanged. Do not retry from the older
original snapshot, clear history, or manually move this failed copy. James owns
the bounded environment fix and a proof-driven continuation of this exact
no-launch maintenance failure. The original Telegram/GitHub requests stay intact.

The environment correction is verified independently: **200/200** executor
tests, four staged-runner maintenance cases (including bare executable discovery
and source login-home lookup), and server/runner typechecks pass. It does not
admit the historical failed copy. That copy's pending failed terminal receipt
and missing maintenance-runner exit evidence require separate producer/ownership
work. Do not treat a simple process search or the still-live server PID as exit
proof. Future attempts need durable per-epoch spawn/exit receipts; cold terminal
reconciliation must not launch a provider or silently claim it was cleaned up.

The Codex already-ended-on-resume shutdown repair (`4bc52cdbe`) passed
the full provider target (69 passed, one deliberate subprocess helper ignored).
Its active/ended/no-authority regressions retain exact process-exit and
same-thread/no-new-turn assertions. Three pre-existing immediate-poll fixtures
now wait for their positive event with bounded deadlines; their original
semantic assertions remain. Root's executor/discovery cohort passed 205/205,
and shared/server/UI typechecks passed. The scoped ingress fault and adjacent
`/close` cohort passed 4/4. The final fresh combined chat suite passed **526/526**,
the normal staged transport suite **91/91**, and deterministic browser **21/21**.
The preceding full attempt was 524/525: the held-lock fixture's one-second
observation expired. Its bounded five-second condition still completes while
the lock remains held, preserving the nonblocking-publication proof.
The composed 218-event maintenance fixture passes for both active and already
ended turns. Committed activation markers now pass exact read-only retry proof;
uncommitted/foreign markers remain denied. Shutdown joins original database
callbacks even after a maintenance timeout; the real abort/deadline canary and
three heartbeat lifecycle cases passed. Final server typecheck passed.
Server 58 was stopped gracefully while idle; server 59 started at 22:19:25 UTC.
Root reopened the actual Telegram conversation and verified the recovered answer
visually. Its one canonical comment produced messages 153 and 154 at
22:19:29.382 and 22:19:31.328 UTC, each with one publication attempt. A read-only
recheck confirms zero new runs since deployment. The original B run remains
failed/observed at attempt zero, and no Retry has been submitted.
The signed staged runner SHA-256 is
`3cb217996132fa0cbbb3fa169dacd4250e3318840ed15f3fa3d2961536f34ce9`.

Physical cleanup is ready for a controlled deployment, not yet proved live.
Historical generic recovery left an empty canonical session directory; the
repair preserves that exact inode in an archive during authenticated activation.
The raw runner journal is now bound to the normalized driver identity and the
server-accepted result, with a separate namespace for content-free maintenance
receipts. Executor tests passed **200/200**, resume tests **36/36**, and server
typecheck and independent review passed. A shortened live diagnostic initially
omitted two control-plane evidence rows; the actual three-row production query
passes the predicate. No safety predicate was relaxed. Do not erase the
directory/quarantine, rewrite historical events, or rerun the accepted request.

The recovered answer arrived as two new messages while old failure 150 remained.
Boole owns a narrowly authorized same-run committed-answer replacement of the
old failure lane, with real outbound-link topology and negative tests. Do not
re-arm the already delivered answer merely to manufacture cleaner live proof.
Root owns integration, deployment, docs and actual original-request retries.
The Mac is currently locked, preventing browser operation; code/test work can
continue. After unlock, recheck the browser and use the exact failed run's Retry
control, not the unrelated generic continuation's task-level action.

Root also traced the unnecessary split to the fixed 1,600-code-point threshold:
the original answer is only 1,985 characters. Whole-message sizing now checks
the pinned Telegram adapter's MarkdownV2 and plain fallback renderings, including
emoji conversion, against its 4,096-UTF-16-unit truncation boundary. Responses
that fit stay native and intact; larger prose retains durable FIFO parts, and
larger structured Markdown retains its lossless document fallback. New tests
failed 4/4 before the fix. Independent review found a rich-source truncation
case hidden by Markdown reference definitions; its additional red-to-green
regression now guards the rich-message source ceiling as well. The final
stream/real-adapter cohort passes 74/74 and
fresh-database medium/long publication cohort passes 4/4. These are automated
results; the changed behavior has not yet been deployed or retested live.

Boole's recovered-answer replacement is frozen with 54/54 focused integration
tests. Target selection now occurs after acquiring the endpoint publication
lane. A competing-link fixture proves a different owner that wins while the
worker waits cannot have its message edited. Source/actor/generation and
ambiguous-delivery exclusions remain intact. The complete fresh integration
suite passed **536/536** (129.18s), and server typecheck passed. The first
deterministic browser run reached **16 passes / one failure / four not run**:
Slack's catalog navigation remained blank before setup, timing out while waiting
for the Connectors heading. Its saved screenshot is completely blank; the
first run did not retain a trace. The fresh diagnostic run with tracing enabled
passed **21/21** (3.6 minutes), with no retries or skips and no assertion/timeout
changes. The earlier blank page was not reproduced and remains unexplained;
do not describe it as fixed. These chat UX changes were pushed in `93d958946`,
separately from the physical-cleanup work.

Boole's next bounded investigation is verified Slack deletion while reach is
disabled: current filtering may fail to preserve an invalidation tombstone,
allowing reuse after access is re-enabled. The proposed regression must prove
that exact sequence before implementation; any fix must remain content-free,
current-runtime and exact-source bound, with no comment or wake on disabled
reach. Two real-service regressions (PNG and text) reproduced unauthorized reuse
after re-enable. The content-free deletion-only fix and stale-event negatives
passed **13/13**. The combined fresh suite then passed **541/542**: three new
fixtures left eligible conversations behind, so a later global milestone scan
counted four instead of one. Their exact rows were identified in the failed
test database. Retiring only those fixture conversations after assertions
reproduced red-to-green in the joint **7/7** cohort without weakening the
one-message expectation. The final fresh complete suite passed **542/542**;
server typecheck passed again. The verified slice is ready to deploy.

The next Slack slice now passes the complete fresh **550/550** integration
suite. Authorized disabled-channel edits preserve content-free invalidation;
the pinned adapter recognizes file-only changes with unchanged text/time, and
the lifecycle revision includes a digest of stable attachment metadata. The
signed real-adapter suite passed **74/74** and focused service cohort **26/26**,
with red regressions captured before implementation. This slice is being
checkpointed, not yet deployed or live-qualified.

Another read-only audit found revoked-actor edit followed by relink/regrant can
still restore stale attachment authority. Boole owns separating verified source
invalidation from permission to admit new edited content, with exact source,
runtime, provider revision and feedback-loop protections. Separately, exact
native retry must keep provider thread and account/session identities distinct;
that fix is deferred behind the actual maintenance failure. Neither follow-up
is complete or live-qualified.

Base `63c8b5d8d` is pushed. All 24 CI jobs, quality, and Greptile's explicit
500-file review passed; PR #13038 still requires CODEOWNER approval and is not
merged. Do not spend the next qualification turn polling those unchanged gates.
Keep the checked-in lockfile identical to origin/master; CI owns regeneration.

User-requested wireframe cleanup is now pushed separately as `5ed80f70a`:
all 67 remaining generated images and the gallery are excluded from the PR,
which now has **432 files**. Written plans and production icons remain; archive
links preserve the exact historical images. The focused UI contract suite
passed. The retry/presentation changes below are pushed separately in
`b235e87fd`; they are not part of the wireframe cleanup commit.

The exact failed-run retry implementation now uses the selected failed run ID,
not mutable client task/comment context. It persists a distinct idempotent retry
intent, proves the original admitted comment batch and actor, rechecks current
source/access at enqueue, deferred promotion, execution and publication, and
disables coalescing for that exact retry. Recovery-card resolution and retry
intent creation commit atomically. Original deliveries are never re-armed;
native integrity/quarantine evidence remains intact. Accepted/uncertain results,
old conversation generations and unsupported interaction lineage are refused.
Fresh combined integration passed 498/498; the deterministic browser suite
passed 21/21 on a separate throwaway instance (no provider network calls).
An ordinary positive native retry still requires live qualification after the
physical-session recovery below; fixtures are not a substitute for that result.

Slack source-edit invalidation passed live on server 58: the disposable file
reply `1788900766.028899` was edited through Slack, then native Luna was asked
to reuse its exact earlier source/attachment pair. The actual reuse call was
denied with `paperclip_runner_chat_attachment_source_denied`; exactly one
plain final said “The old attachment is no longer available to reuse.” No file
or substitute was published. Receipt-to-final was 19.421 seconds. This proves
edited-source invalidation, **not deletion**. The permanent log has exact IDs.

The subsequent Telegram queued-media journey **failed** on CHA-26, generation
10. Image run `fd7011b6-323b-461a-bc43-a81835bece5f` accepted its semantic result
at 21:05:05.377 UTC, but failed ten seconds later because the runner did not
durably suspend before checkpoint. Document B was genuinely queued 15.743
seconds before A finished, started 32ms after A finished, then failed with
`runner_state_identity_mismatch`. Automatic recovery run
`3fa4a4e7-9137-45cd-b191-c90e7c5dd057` also failed with
`native_session_cleanup_quarantined`. No final answer or returned file arrived.
The original inputs and accepted-result/quarantine evidence must be preserved;
do not rerun accepted A, clear quarantine, or mint a new session to hide this.

Control-command starvation behind durable provider output was repaired in
`b810d60be` without weakening checkpoint proof. James now owns the missing
exact-authority, control-only session cleanup implementation and its tests.
Epicurus owns accepted-response finalization; Boole traced the reviewed GitHub
admission failure; root owns integration, UI and live qualification. Server 58
still runs the earlier server code; UI HMR includes current UI edits and future
native launches will use the rebuilt binary. Do not restart merely to erase
the in-memory quarantine. Verify the retained physical state and use a tested
recovery operation first.

Fresh read-only inspection found A automatically became `succeeded`/`committed`
at 21:06:16.107 without another provider attempt, but its accepted summary was
never made into a comment or provider publication. The old adapter error also
remained on the successful run. Epicurus is now adding independently authorized
committed-response presentation, keeping later task status/governance intact.
The Rust control-first fix passed 234 library tests and was staged with hash
`4d06a271a91eedd4a317a59f097e39c6de5fc924296aafebf9b0d8031b6cc9aa`;
strict signature verification passes. Root's first transport cohort was 87/88:
an exact-resume test assumed its asynchronous resume event preceded the
authenticated snapshot. A bounded event wait keeps the exact count/identity
assertions; the final full transport cohort passed **88/88**. Workspace
typecheck passed. The full fresh PostgreSQL chat suite was **474/475**: the
existing joined-recovery drain test counted seven global wakes instead of
three. Boole reproduced four valid retry intents left by earlier fixtures,
then added a precondition drain before the join test stages controlled work.
All original assertions remain. The six-case fresh-database reproduction went
from 5 passed / 1 failed to 6 passed. The complete combined integration suite
still needs a fresh run. The root route/API/UI contract cohort passed 195/195
on an unchanged rerun after one earlier transient socket hang-up; UI typecheck
and token gates pass. The retry/finalizer slice remains uncommitted; the
independently verified native control-first repair is pushed as `b810d60be`.

GitHub's real PR-level continuation at 21:29 UTC exposed the scope of the
Telegram cleanup quarantine: it blocks every execution in the same company
and backend, including Maya's other channels. CHA-9's first new message failed
with `native_session_cleanup_quarantined`; its next message failed with
`reviewed_chat_execution_binding_not_authorized`. Neither reached a provider
turn, so this is not live qualification of the rebuilt runner. Both displayed
the same generic failure/task link in GitHub. Stop feeding blocked conversations
until the exact old cleanup is settled. James is implementing a bounded
control-only recovery path with exact old authority and process-absence proof;
Boole is investigating the second message's reviewed-binding failure.
Do not clear quarantine, reset a task, or restart solely to erase the in-memory
gate. The accepted Telegram answer can be presented independently, but that
does not prove its provider session is safe to reuse.

The GitHub binding failure was a separate pre-start invokability mismatch:
attestation denied an agent in `error` status even though the canonical
invocation policy permits it. The narrow fix uses that canonical policy and
keeps every source, owner, identity, conversation and approval check. Both
direct-input and answered-question regressions failed before the fix; the full
external-chat-wait suite passed 142/142 afterward. Paused, terminated and
pending-approval agents remain denied. The original B request is intact and
must be retried through exact-source recovery, not replaced with a new comment.

The broader 142-case suite also caught a real finalizer regression: clean,
already-materialized successful runs were being rewritten on reconciliation.
The conditional projection now leaves them untouched. Diagnostic recovery
captures current locked-row error fields rather than stale pre-lock values;
two forced interleavings reproduced loss of the newer diagnostic before that
repair. These corrections preserve the accepted answer, later task status,
existing JSON evidence and telemetry deduplication. Final native coverage passed
31/31. Root reran the 23 accepted-response cases on another fresh database after
the last diagnostic-capture refinement: 23/23 passed, 475 unrelated cases
intentionally filtered. The retry/presentation slice is checkpointed separately
from unfinished session maintenance; no live server restart has deployed it yet.

The next continuation found that settling A alone does not make the old queued
requests retryable. GitHub B failed before native execution with the exact
reviewed-attestation diagnostic; a narrow positive legacy retry now requires
that sole system error and absence of provider/native/output evidence, while
retaining the original source and current permissions. Boole owns this path.
Telegram B is an observed native run with zero attempts, not an exhausted
failure. James must derive its separate pre-provider retry eligibility from A's
authenticated settled maintenance receipt; never rewrite B's state or attempts
to manufacture exhaustion. Root's read-only qualification recheck confirmed
Discord's Eigenjoy browser session currently requires login again.

Maintenance remains uncommitted and unqualified live. James owns exact old-run
lease/copy/activation and same-session proof. Epicurus owns the real Codex
already-ended-on-resume shutdown gap: even an already-ended turn must stop its
restored provider before claiming a prepared, no-launch drain state. Root added
a per-database joined, bounded, keyset-advancing discovery lane after accepted
finalization in startup and periodic recovery, tracked for shutdown. It does
not create wakes, alter task state, or treat discovery as physical authority.
The discovery/finalization test file passed 18/18 after correcting its fixture
teardown method; the first run passed all assertions but failed teardown.
The real heartbeat lifecycle/adjacent cohort passed 11/11 and server typecheck
passed. GitHub's exact pre-provider retry cohort passed 28/28. Fresh full chat
runs were 512/513 and 511/513: one one-second lock observation failed initially
and passed unchanged later; the second run proved a Discord renewal consumed
Slack's globally mocked transaction fault, then an un-restored spy cascaded
into the `/close` fixture. Boole owns the scoped fault/finally repair. Preserve
these failed-run records and rerun the complete suite after fixture isolation.
Do not deploy the partially finished physical recovery or mark the live A/B
journey passed from these fixture results.

## Earlier work: Discord restart repair and final landing gates

The merged head `c52e98c9b` passed every CI job in run `34270590335`, but
Greptile's automatic review stopped at its 100-file soft limit. Request an
explicit complete review after pushing the final follow-up. The PR still needs
CODEOWNER approval; it is not merged. Keep it at **500 files**.

Server 54 exposed an unhandled Discord `Opening handshake has timed out` on a
clean restart. A real local-socket regression reproduced it. The repair closes
CONNECTING sockets before releasing their error handler, awaits adapter
destruction, and fences late login/packet continuations. Independent review
reproduced two adjacent late-retirement races; their tests now pass. Genuine
timeout recovery remains available. The agent cohort passed **84/84**; root's
independent Discord/transport/publication-error cohort passed **88/88**, with
no skips. Frozen offline install, full workspace typecheck/build and strict
runner signature verification pass; no existing dependency versions changed.
Fresh full chat integration passed **421/421** and the deterministic browser
suite passed **12/12** on separate new PostgreSQL databases, with no skips or
retries. Browser fixtures cover all five providers, the experiment off/on and
file-batch delivery states. They mock provider HTTP and are not live accounts.
The superseded v5 surface note is recoverable through an immutable Git link
in `wireframes-archive.md`; v6, current specs and tests remain in the worktree.

The fix was pushed as `55b91bedd`. Its quality gate correctly rejected the
accidentally committed locally generated lockfile: feature PRs must leave that
file to CI's regeneration/upload step. The packaging-only correction restores
origin/master's exact lockfile without reinstalling or changing any tested
production bytes. Manifest/patch configuration remains. Local frozen-install
proof refers to the generated verification copy, not the checked-in baseline.
Restoring the exact v6 historical note uses the freed slot; the PR stays 500
files. Push the correction and renew exact-head CI/Greptile; do not count the
failed policy run as passed or try to bypass it.

Server 56 loaded the patched dependencies at **20:13:21.244 UTC**, became ready
at **20:13:26.601**, and connected the real Discord Gateway. Its base is c52 plus
the frozen uncommitted repair. Server 57 then started clean `55b91bedd` at
**20:24:00.769 UTC**, ready **20:24:05.493**, and connected the real Gateway.
The old Slack thread remained stuck loading in Slack, with no composer and no
input sent. Root instead submitted one fresh root mention in the same QA
channel and visually confirmed exactly `SLACK-PATCH-READY` plus a usable reply
composer. Independent correlation confirmed one wake, one native Luna run and
one working-to-final message: **2.666 seconds** to working, **21.766 seconds**
to final. Both publication operations used one attempt; the task stays open.
Before this patch, clean-merge native Luna continuations passed in GitHub and
Telegram in **21.209 / 18.039 seconds**. Root owns provider UI; subagents
independently correlate delivery/run/publication records. Discord browser login
and a qualified Teams tenant still limit new provider-user interaction proof.

Two real Discord Pause/Resume cycles stopped the old listener and connected a
new one inside server 56. The first cycle exposed stale **Connected** copy
while paused. The Activity panel now shows lifecycle-first wording and labels
retained health as historical. Eleven assertions failed against the old
projection; **31/31** focused cases and root's three-file **49/49** cohort pass,
as do UI typecheck and token gates. Root visually rechecked the corrected paused
state and resumed the connection at **20:21:55.661 UTC**. It is active again.

The recovery slice is committed as `e72a50480`; `c52e98c9b` incorporates
master `ebaeba40e` (agent onboarding, PR #13011). It preserves both sides of the
HTTP credential-redaction test and chat experiment guards in the
new always-on AgentDetail/sidebar. The merged server compatibility cohort
passed **110/110** and fresh full chat integration passed **421/421**;
the focused UI cohort passed **310/310**. A real merged typecheck failure
identified a missing `channels` description in the upstream Storybook
prototype. Its exhaustive record is fixed; plain UI/server typechecks and
token gates pass. The superseded v2 note joins v3/v4 in the linked Git archive
to retain **500 changed files**, without removing tests or production code.
Final merged workspace typecheck and build passed. The expanded browser suite
passed **12/12** on another fresh database, including agent Channels with the
experiment off/on and all five provider journeys. Live inspection found a
duplicate Channels heading after the upstream layout change. The new browser
test reproduced two headings; the panel now owns its single title, verified
again visually. The first additional browser attempt failed before any test
because embedded PostgreSQL could not initialize while host shared memory was
full. Using the existing isolated PostgreSQL with a new database avoided that
host limit; no unrelated process or global setting was changed. Final UI
typecheck/build and token gates passed after the heading fix. Remote CI passed
for that merge; new CI and explicit Greptile review must validate the follow-up.

This section supersedes the older in-flight CI snapshot below. Documentation
head `5988fb475` passed CI `34263294210`, including both required aggregates,
and Greptile reviewed all 500 files at **5/5** with no new finding. PR #13038
is open and mergeable, but requires CODEOWNER review; it is **not merged**.

The subsequent live GitHub queue probe exposed a pre-ingress failure: a real
user comment received a GitHub 502 and never reached the local proxy or durable
inbox. One supported redelivery also failed before ingress. Later fresh
GitHub and Telegram in-flight pairs passed exact-request isolation, deferred
admission, nonoverlapping native Luna runs and single-message progress/finals.
Those passes do **not** repair the missing callback or establish the cause of
the intermittent proxy/Funnel failure. Passive connection diagnostics were
added to the ignored qualification proxy without changing routing or timeouts.

Implemented recovery and retry safeguards (final-head CI still required):

- Use GitHub's App delivery-history/redelivery API to recover recent missed
  created comments. Keep genuine HMAC ingress authoritative; never synthesize
  a callback from historical JSON. Persist a content-free current-generation
  floor and immutable per-GUID denial/attempt ledger. Missing state starts at
  now; old history is not silently imported after deploy/reconnect.
- Check the exact App, callback, installation, enabled repository and canonical
  current comment. Existing local receipts, including terminal failures and
  content-free filtered receipts, suppress automatic remote requests. Delayed
  callbacks cannot cross endpoint/generation/credential changes or reset the
  local retry budget. Lossless decimal IDs avoid GitHub delivery-ID rounding.
- Bound recovery to one hour, three pages of 100 recent attempts, five detail
  inspections per scan and three redelivery requests per GUID. Request again
  only after a distinct newly failed provider attempt; an unchanged/ambiguous
  result is not evidence for replay. A separate joined coordinator lane must
  prevent a slow GitHub scan from delaying other providers' inbound retries.
- Activity must distinguish requested redelivery from actual receipt and expose
  scan failure/volume limits. Old message order cannot be retroactively
  restored after later turns already ran. Lifecycle/edit/delete recovery and
  higher-volume scans remain separate qualification work.
- Generic manual `retry_failed_run` admitted a contextless run with the issue
  UUID session instead of the original chat task key. A narrow guard now
  rejects it before mutations, including retired conversations and forged
  caller context; the real-heartbeat regression went red to green and its
  four-file cohort passed **304/304**. Positive exact-request retry still needs
  a server-authorized failed-run intent and deduplication. Re-reading the
  immutable admission receipt corrected an earlier attribution: historical
  Telegram CHA-24 was admitted by `retry_failed_run` at 16:35:06.982Z, with an
  issue-only payload. Its `native_status_decision` / `issue_status_changed`
  context was overlaid by a later coalesced intent at 16:35:30.999Z; it was not
  the original trigger. The guard covers that admission class. The separate
  recovery-action `restore` path had a separate pre-mutation gap. It now
  rejects unsupported chat `restored` → `todo` resolutions inside the locked
  transaction, before changing the task or clearing its recovery action.
  Five route cases went red to green; **153/153** adjacent route tests pass.
  Ordinary non-chat restoration and `done` / `in_review` resolutions remain
  available. This is safe refusal, not positive exact-request retry.

Live proof on server 52: a browser-submitted GitHub message at **19:12:08.074
UTC** received one deliberate pre-ingress **503**. No inbox row was created.
The normal background scan requested genuine redelivery at **19:12:44.032**;
signed ingress returned **202** and produced one exact-comment wake and one
native Codex app-server / `gpt-5.6-luna` run. One provider message changed from
working to the exact final at **19:13:07.462**: **59.388 seconds** including
the missed-callback delay, **19.255 seconds** of native execution. No operator
redelivery, manual input resend, or manufactured admission was used. The
one-shot ignored proxy fixture is disabled again; public Board routes remain 404. The older naturally lost callback remains outside this epoch and is not
claimed recovered. This mitigation does not establish the cause of Funnel's
intermittent 502s.

Automated checks passed: full chat integration **421/421**, helper/coordinator
**97/97**, independent helper/coordinator/Activity/API/OpenAPI **127/127**,
heartbeat retry cohort **304/304**, full workspace typecheck and build. These
PostgreSQL fixtures use mocked provider HTTP; the browser proof above is real.
A new-generation checkpoint blocked behind its old 24-hour backoff went red
to green. Live Activity then exposed a separate false-pending label after
receipt; the alias-join regression went red to green, including same-GUID
foreign-endpoint isolation. A subsequent review reproduced a same-secret
pause/resume race during staged replay; carrying its captured runtime fence
through both leased preflight and selected SDK runtime now prevents retargeting.
Cancelled minimal recovery tombstones also terminate without network calls or
retrying retained content. Both regressions went red to green before the final
**421/421** fresh-PostgreSQL run. Final server typecheck and build passed;
the deterministic browser suite passed **10/10**. Server 53 loaded all source
fixes at **19:22:49.015 UTC**. Root visually verified Activity's **received**
status and correct receipt-only explanation after restart. A normal GitHub
continuation on that final source returned exactly `GH-FINAL-CHECK-READY` in
**23.380 seconds**, including **18.478 seconds** of native Luna execution.
One exact-comment wake produced one run and one working→final provider reply;
both publication operations used one attempt. Root inspected the rendered
answer. Fresh exact-head CI/Greptile are still required; prior green gates do
not validate this slice.

Never claim the existing unanswered historical comment was recovered if it is
older than the new epoch floor. Continue other providers while real login or
tenant gates remain; keep this temporary note until the remaining defects are
fixed or moved to permanent documentation.

## Earlier landing checkpoints

These records are historical. Use the current-work section above for the
current source, deployment, dependency and review status.

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

## Earlier deployed state and evidence

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

1. **Finish real qualification before PR tending.** Commit and push coherent
   verified fixes along the way, but follow the active goal: repair and test
   the channels before tending PR reviews or merge gates. The newer combined
   retry/presentation slice needs fresh full integration and live recovery
   proof; earlier 421/421 evidence does not cover it. Leave completion claims
   and checklist items unfulfilled while their evidence is missing.
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
