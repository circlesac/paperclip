# Temporary chat qualification handoff

Delete this note when the remaining items are fixed or moved into permanent
verification documentation. It is not a release-completion claim.

Updated September 9, 2026. Older scratch checkpoints are preserved in Git at
`f66bedd63`; they are intentionally not repeated as current work here.
The [permanent qualification log](2026-09-08-chat-queue-and-webhook-repair.md)
contains the chronological evidence and failed attempts. The
[browser runbook](2026-09-04-chat-adapters-browser-e2e-runbook.md) remains the
provider acceptance checklist.

## Goal and working boundaries

Finish production-quality Slack, GitHub, Microsoft Teams and Telegram chat,
plus the user's explicitly added Discord connector. Test real conversations,
files/images, interactions, races, queues, reactions, retries and the quality
of the experience. External chat is transport; Paperclip owns tasks, runs,
permissions and audit. Do not narrow completion to whichever tests pass.

- Work only in `/Users/dotta/paperclipai/branches/chat-adapters`, branch
  `codex/chat-adapters`. No additional worktree. Preserve user changes.
- Commit and push coherent verified fixes; do not tend PRs until the features
  work. The wireframe images have already been removed; do not recreate them.
- Root owns Git, live server, ordinary runner staging and signed-in browser.
  Use parallel agents for disjoint implementation or bounded review.
- No filesystem/command approval requests. Only real login, MFA, CAPTCHA,
  tenant/admin or unavailable-secret gates need the user.
- Use the signed-in in-app browser for live provider accounts. A mocked browser
  or successful API response does not establish a good live experience.
- Never export raw reasoning, tool arguments, private logs, credentials or
  private source-file URLs. Never replay `delivery_unknown` without its
  explicit audited resolution.
- One endpoint is one provider bot identity bound to one immutable agent;
  one external thread maps to one task. Recheck current source, reach,
  generation, identity and permissions at every consequential boundary.
- Use a fresh PostgreSQL fixture database for each full integration rerun.
  Never use a test to repair live records or manufacture recovery authority.

## Current deployment

Implementation `d5ec721f2` is pushed, including verified native recovery,
Discord denials and Telegram photo routing. Server **70** is running:

| Field                    | Verified value                                                          |
| ------------------------ | ----------------------------------------------------------------------- |
| PID / tool handle        | `54936` / `62091`                                                       |
| Listener                 | `127.0.0.1:3137`                                                        |
| Loaded server version    | `2026.831.0+591.git.d5ec721f2.dirty`                                    |
| Started / recovery ready | `03:57:19.082` / `03:57:22.072 UTC`, September 9                        |
| Native runner SHA256     | `6279d39ac731e4565a638b64c93673b8ca23e6dfbc0870e24d48422497f1826d`      |
| Live DB                  | `chat_adapters_live_3103` on local PostgreSQL `55439`, role `paperclip` |
| Last checked runs        | 290 terminal: 262 succeeded, 26 failed, 2 cancelled; zero active        |
| Last new run             | September 9, `02:15:47.812 UTC`                                         |

Both loopback and private Tailscale health returned 200/ready. Discord Gateway
reconnected bot `1546330979860221952`. The health response's Git commit is
dynamic; use loaded version and process start to identify deployed code.
The loaded `.dirty` suffix reflects only root-owned documentation edits at
startup; implementation files were committed and verified. Server 69 exited
cleanly after draining zero active runs. The qualified runner SHA is unchanged.

Private Board: `https://dottas-macbook-pro.tail29c1aa.ts.net`.
Public webhook-only proxy: port `3104` → `3137`; Funnel uses stable port
`8443` (also existing `10000`). Do not expose the Board or files publicly.
Port **3103 belongs to another checkout** and must not be touched.

Passive rejection diagnostics are committed/pushed as `6c5e9c215`. After
verifying zero active proxy connections, root replaced proxy PID 48112 with
PID **27961**, handle **3313**. Log: `webhook-proxy-rejections-0909.log`.
A non-mutating GET through public Funnel at 03:51:14 UTC returned the expected
404 and exactly one closed-label method-rejection record. This proves proxy
deployment/rejection visibility, not provider message delivery. Server 69 was
not restarted during this proxy-only change.

All local runtime material is under ignored
`.paperclip-runtime/chat-adapters-live/`, including:

- `start-server.sh`: configured isolated startup, no embedded credentials.
- `server-experimental-landing-70.log`: current server log.
- `qualified-runnerd-2400740c`: preserved old qualified runner backup.
- `home/instances/chat-adapters-live/runtime/paperclip-runner/durable-sessions`:
  live native roots; do not manipulate historical evidence.

**Build caution:** server `pnpm typecheck` invokes a full runner build and
stages the binary. For source checks use an explicit package TS-only build,
then `pnpm exec tsc --noEmit` from `server/`. Root briefly triggered that
side effect, restored exact signed `2400740c…`, and audited no new live runs;
the later `6279d39a…` cutover was deliberate after qualification. Do not
describe the normal binary as continuously unchanged across that earlier check.

## Immediate next actions

1. **Resume real browser qualification on server 70.** Latest actual browser
   inventory reports **Mac locked**; the user has been asked to unlock it.
   Discord login was restored before the lock. Do not request Discord login
   again unless the actual provider page requires it.
2. Repeat same-thread Discord/Slack conversations, queueing and two-file output
   on this deployment. Check transitions, failure copy, final placement,
   reaction cleanup, duplicates and usable returned files, not just final text.
3. On GitHub, exercise the deployed unavailable-file fallback, click its task
   link, and upload the file on that task. Check the correct company, immediate
   chooser readiness and actual usable upload. This complete live journey is
   still unverified; deterministic cases already pass.
4. Continue the remaining browser-runbook permutations. Do not merge or edit
   the disposable GitHub repository while using its PR comments for chat QA.
5. Teams requires an eligible Microsoft 365 work/school tenant and authorized
   Entra/Azure Bot/custom-app setup. Personal Teams login is insufficient.
   Its deterministic tests are not tenant-qualified live proof.
6. Preserve the historical recovery boundaries below. A new conversation can
   qualify new work, but cannot be presented as successful recovery of the
   original failed request.
7. Live-retest the deployed Telegram photo/document boundary and Discord
   normalized interaction denial. Code and deterministic regressions are
   complete; they are not newly qualified live provider journeys.

## Current parallel work and audit conclusions

Discord's generated question card → parsed concurrent clicks → real service/DB
→ one continuation publication now passes on a fresh database. The Slack
signed `view_submission` bridge passes 10/10; its final callback is a pure
validator/observer, so a separately joined real-service corrected-retry case
is the next bounded coverage task. Provider I/O and model execution are
explicitly simulated, not newly qualified live journeys.

The Teams `task/fetch`/`task/submit` bridge found a genuine error-only card that
removed the original inputs and Submit after invalid answers. A frozen repair
rebuilds only current authorized invalid forms with known bounded draft values
and readable question labels. Slack inline errors and all stale/denied guards
stay unchanged. Helper/Teams tests pass 31/31; independent helper/Teams/Slack
review passes 41/41; real-service Slack/Teams invalid-form cases pass 2/2.
The fresh full database regression passes 624/624, zero skips, in 120.61 seconds
on `chat_modal_correction_20260909_root01`; root's helper/Teams/Slack repeat
passes 41/41 and plain server TypeScript passes.
The Teams JWT checker is an explicit test double, not eligible-tenant proof.
Server 70 remains unchanged until the production repair is fully verified.

- **Telegram photo eligibility (complete):** bounded PNG/JPEG metadata selects
  photo within supported geometry and a conservative 10,000,000-byte budget.
  Other images retain original document bytes. Header screening never decodes
  pixels. Valid fixtures, malformed headers and exact limits pass through the
  pinned adapter. Ambiguous photo sends are never retried as documents.
  Independent review's JPEG component-header cases are fixed.
- **Webhook diagnostics (complete):** portable tests pass 6/6 and root's actual
  wired-source HTTP tests pass 8/8, including keep-alive, native parser errors,
  privacy, 1 MiB ceiling and the explicit QA fault fixture. Deployed above.
  This closes a diagnostic gap, not the cause of earlier pre-ingress delays.
- **Discord interactions (complete):** real normalization strips raw methods
  used by the old denial check. Runtime-owned context now selects rejection
  after durable denial; foreign-guild actions no longer success-ACK. Forged
  payload markers and concurrent webhook context cannot supply that context.
  Real adapter → runtime → service → DB regressions pass, including one denial
  row and no wakeup for repeated synthetic delivery. Simulated socket/API
  results are not live Discord button qualification.
- **Native reasoning effort (audit complete):** legacy `modelReasoningEffort`
  is not a supported field in the closed native v4 provider contract. The five
  latest succeeded runs freeze `{kind: codex, model: gpt-5.6-luna,
approvalPolicy: never}`. Injecting an effort field is rejected; resolving
  legacy low versus high yields the same native profile. This is a missing
  native capability, not a proved dropped supported setting. A future explicit
  versioned contract addition needs frozen identity, new/resumed turn coverage
  and real qualification. Do not silently map the legacy field or claim low
  effort is effective today.

The latest user reports Discord login restored; root's subsequent browser probe
still reports **Mac locked**. Only the OS unlock is being requested. Root
rechecked server 70 health and the 3104/3137 listeners; no new live provider
turn has been sent during this code-only audit.

## Latest provider evidence — scope matters

Maya E2E `31f56712-3944-423e-b7c7-404bb8fbb993`, company
`7ffa9799-0b1b-4a26-9b44-8e897f832f89`, uses native
`paperclip_runner` / `codex_app_server` / `gpt-5.6-luna`. Terra was not
substituted. Effective reasoning effort is not yet proved; the old configured
low field is outside the native v4 contract. Do not claim it is running low effort.

| Provider | Latest useful real evidence                                                                                                           | Still missing                                                                     |
| -------- | ------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------- |
| Discord  | Server 68 same-thread image/TXT return on CHA-32; both previews and full TXT inspected, one attempt per output; bot reconnected on 70 | Live repeat on 70, remaining runbook cases, second-process takeover               |
| Slack    | Server 68 same-thread image/TXT return on CHA-33; exact received bytes retained; live edited-source reuse denied                      | Live repeat on 70, remaining lifecycle/governance/failure permutations            |
| GitHub   | Server 68 honest unavailable-private-file reply, followed by correct pasted-text answer on the same session                           | New safe task-link → task-upload live journey and remaining runbook cases         |
| Telegram | Earlier real text/media/reaction/backlog cases; accepted CHA-26 image answer later delivered without another model run                | Exact failed document-B recovery and remaining file/interaction/performance cases |
| Teams    | Deterministic personal/channel progress, actions, access and safe file-link coverage                                                  | Actual qualified tenant setup and live provider journeys                          |

Real media repeats on server 68 were descriptive, not a controlled speed claim:
Discord run `265d35e0-af1e-421b-b3e2-61ba65fcc288` took 60.073 seconds,
source→last file 64.926 seconds; Slack
`12d6d924-9748-4d13-ad6e-2035937e12dd` took 51.030 seconds,
source→last file 61.173 seconds. Each was sent after the previous run settled
to avoid same-agent queue contention. See permanent log for source/message IDs.

GitHub generic private attachment URLs can be unavailable to the App even when
the signed-in human can read them. Never forward browser cookies or guess file
contents. The new deterministic fallback appends an authorized Paperclip task
link; it does not make those provider files generically downloadable.

Slack once took about 61.5 seconds and Telegram once 234.435 seconds before
local ingestion. Later samples were fast without configuration changes.
Those delays are localized, not explained or fixed. Unauthenticated retry
headers are diagnostic hints, not authority or proof of earlier request paths.

## Protected historical failures

These are not unlocked by the forward warm-transition or startup fixes.
Do not infer full process-tree retirement from a missing PID or leader exit,
clear quarantine, rewrite receipts, reset history or replay accepted output.

### Telegram CHA-26: preserve exact failed B

- Task `ab55427f-615e-4a2d-819a-8af9c1292fa3`, generation 10.
- Accepted A: `fd7011b6-323b-461a-bc43-a81835bece5f`; external messages 153/154
  were presented once without rerunning A.
- Failed document B: **`fcf7adc4-39a5-4c42-8cbb-a9723ad22302`**. Only its
  exact authorized retry can qualify recovery; do not create replacement C.
- Native session `ce94db0c-3aec-40be-8caa-c80d008fcbbb`;
  runner `0c1da1cb-513b-4ab9-8e28-4466ac060016`;
  lease `ae666e16-338c-400a-bc9b-7792f97c1770`;
  provider thread `01a08176-e3a3-7891-b06f-439b9e68b641`.
- Scope `1c080549b2c4f48602d28768e62c56bbc50d48c4479e8abd8fc054a498f4b391`.
- Latest cleanup copy `cleanup-BufsxY`; maintenance
  `native-cleanup:ae644c98-7ecd-483a-bb3e-ecccbf0bb42a`.
  Epoch 0 PID 88642 has retirement; epoch 1 PID 88736 lacks the required
  authenticated retirement receipt. Absence does not supply it.

Earlier CHA-24 had damaged historical event 44. A Board retry accidentally
selected its older UUID-keyed context and is not damaged identifier-keyed
recovery. Its retired conversation generation must not regain external access.

### Discord CHA-29: preserve old accepted owner

- Task `5448a71e-4303-425a-8fbe-f66ae4a9482b`;
  thread `1547036525059907626`.
- Accepted A `29d19d67-9591-469d-ada3-f72261b732d0`,
  result `e9700900-7e55-4716-8812-409600d679b8`;
  failed B `6b6f6db4-7d3b-4b40-beb7-f385cb610cbc`.
- Native session `1c2c4bbc-8416-46ff-960d-f0f72eef3862`;
  runner `75630d5c-ddae-4c3c-b1a4-86c707b4fbc5`;
  provider thread `01a08380-cfca-7ea2-ba46-6a8a8ae678ed`.
- Scope `e88d6c2a0bee3c91af49d155d63ce2ad043975ecf51cae77b5e1129a5688ae37`.
- Archive suffix `identity_indeterminate.cleanup.1ad3d873-71c2-47aa-9d7d-74407d75d311`;
  failed copy `cleanup-mZx1xU`; maintenance
  `native-cleanup:75e0faf7-bc67-4a4b-b206-ce0c0f4340be`.
  Runner PID 69543 retired, but renewed provider retirement is unproved.
  Do not retry the original or failed copy on that fact alone.

## Completed repairs — do not reimplement

- Experimental chat gate preserves production GitHub tools when chat is off.
- Ambiguous outbound delivery has explicit audited resolution; ordinary replay
  refuses unknown delivery. Board send+comment creation is atomic/idempotent.
- Exact failed-run retries derive source/context on the server, preserve the
  admitted batch, dedupe retry intent and recheck current authority. UI surfaces
  use that route; they no longer need a new generic retry implementation.
- Accepted-result presentation is separate from physical session reuse and
  preserves later task state and audit evidence.
- Current-source attachment revocation, native byte-preserving file output,
  media batching guidance, whole-message sizing and truthful status repairs
  have focused and scenario-specific live evidence in the permanent log.
- GitHub unavailable-file task links are durably prepared and reauthorized.
  Task navigation/uploads bind the loaded task's company; outgoing route and
  file-chooser readiness are fenced. Narrow connected-task banners are fixed.
- Warm run handoff has immutable receipt/result/ACK boundaries and final
  activation acknowledgment. Old authority is replay-only. Fresh recovery
  preserves the same lease and requires independently verified server ownership.
- Recovery-only authorization retires only after a fresh exact new-authority
  snapshot. Missing/wrong results and sync/async callback failure keep ordinary
  work fenced, including requests racing bootstrap.
- The event pump is fenced by run identity; local cursors reset after confirmed
  activation. Remote FIN closes the owned WebSocket wire.
- Forward startup ownership receipts prevent unproved relaunches. None of
  these repairs retroactively authorizes historical cleanup.

## Verified automated gates and limitations

On the frozen native candidate: optimized full transport **133/133** (zero
skips, 198.64 seconds), controller **69/69**, optimized Rust lib **248/248**,
and the Codex/native/supervisor/durable integration targets passed.
Root independently passed **26/26** recovery cases, **36/36** generated server
admission, **75/75** adjacent server tests, plus post-format **55/55** selected
protocol cases and **260/260** executor tests. Package TS build/types, direct
server types and Rust formatting pass. Formatting is scoped; some preexisting
files are not globally Prettier-clean.

Generated server admission uses the actual checkpoint rebind and restart
classifier with real PostgreSQL, but mocks the backend after admission.
It is not combined server→real-provider recovery proof. Only local Codex
`resume_dead_runner` with a verified managed/projectless checkpoint is admitted;
surviving-runner, remote/listen and missing-independent-checkpoint cases remain
unsupported and fail closed.

Latest full chat integration **624/624**, zero skips, ran on fresh
`chat_adapters_telegram_photo_20260909_root01` (126.88 seconds).
Root's focused parser/runtime/adapter cohort passes **199/199** and direct
server types pass. The full suite includes Discord's parsed denial path,
Telegram photo boundaries, and previous Slack/Discord partial-file batches
across restart and explicit ambiguous-file resolution. Provider I/O is
simulated. Log: `chat-final-photo-discord-root-0909.log` in ignored runtime.

Full deterministic chat browser **29/29**, zero retries (2.8 minutes), includes
six task-company/upload routes and readiness behavior. It is not live provider
qualification. The real-Codex staged startup canary
`paperclip-real-startup-phHTMj` used actual Codex 0.153.4, one provider process
and no model turn; reopen made no new provider RPC. Direct-child exit was
observed, not whole-tree retirement.

Broad workspace tests previously had unrelated harness/runtime failures; never
claim the entire workspace passed from these focused gates. Renew final-source
installation/build/release gates when appropriate; do not substitute PR/CI work
for remaining provider qualification.
