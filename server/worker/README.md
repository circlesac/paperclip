# Paperclip server on Cloudflare Workers

This directory is the Cloudflare Workers entry point for the Paperclip server. It is fork-local groundwork. `server/src/**` and `packages/**` stay byte-identical to upstream; this directory *consumes* them.

## Principle

Upstream is active. We do not edit `server/src`. Everything Cloudflare needs lives here:

- `index.ts` — the Worker `fetch` handler (Hono). Probes, per-request DB, actor, and mounted Express routers.
- `actor.ts` — runs the unchanged Express `actorMiddleware` behind a request shim.
- `express-adapter.ts` + `shims/express.ts` — runs unchanged Express route modules (`Router()`-based) under Hono.
- `shims/paperclip-db.ts`, `shims/pino-http.ts` — bundle-time replacements wired through `alias` in `../wrangler.jsonc`.
- `db.ts`, `env.ts`, `tsconfig.json`.

If a change seems to need an edit under `server/src`, the answer is a shim or an alias here, or the route stays on Node for now.

## How the bundle stays Node-free

`wrangler.jsonc`:

- `alias`: `express` → recording `Router` shim; `pino-http` → no-op; `@paperclipai/db` → schema + `type Db` only (the real barrel drags in `embedded-postgres`).
- `define`: `process.env.NODE_ENV` = `"production"` so `middleware/logger.ts` never calls `pino.transport` (absent in the pino build the bundler selects; a runtime var is not visible at module load).
- `nodejs_compat`: `node:crypto`, `node:os`, etc. resolve. Modules that only *import* `node:os` (for example `log-redaction.ts`) bundle fine; they fail only if a Node-only call actually runs.

Check with `pnpm --filter @paperclipai/server exec wrangler deploy --dry-run --outdir /tmp/b` and grep the output for `node_modules/.pnpm/express@` (must be absent).

## Local development

```
BETTER_AUTH_SECRET=unused docker compose -f docker/docker-compose.yml up -d db   # Postgres 17
pnpm dev:once                     # run the Node server once so migrations apply, then pnpm dev:stop
pnpm --filter @paperclipai/server dev:worker -- --port 8787
curl -s http://127.0.0.1:8787/api/__probe/me
```

Hyperdrive uses `localConnectionString` in `wrangler.jsonc`; the `id` is a placeholder and `wrangler deploy` is intentionally not wired yet.

## Scope map: what runs on Workers

Measured on the route modules under `server/src/routes` (54 `Router()` modules) by walking each module's static import graph and counting reachable modules that import a Node-only builtin (`node:fs`, `node:child_process`, `node:net`, `node:os`, …). "Reach" is a bundling proxy, not proof of runtime behavior; the runtime check is `wrangler dev` plus a byte comparison against the Node server on the same database.

### Tier 0 — runs now with the M3 mechanism (12 routes)

Zero Node-only modules reachable, or only `log-redaction.ts` (`node:os` called inside a function, never on these paths):

`auth`, `cloud`, `openapi`, `user-profiles`, `instance-database-backups`¹, `dashboard`, `sidebar-badges`, `company-skill-policy`, `decision-queues`, `managed-agent-profiles`, `remote-agent-profiles`, `plugin-ui-static`².

¹ Bundles, but the backup itself runs `pg_dump` on Node; the route can only proxy or stay on Node. ² Serves plugin UI from disk; needs R2 first.

### Tier 1 — after a curated `services/index` barrel (+14 routes)

33 of 54 routes import `services/index.ts` (94 exports). That single barrel is responsible for 1,378 of the 2,052 route×Node-only edges: routes that use one service get the whole execution plane in their bundle. `esbuild` `alias` cannot target a relative import, so this needs a small custom build (`worker/build.mjs` with an `onResolve` plugin, `wrangler` `no_bundle`) that swaps `services/index.js` for a curated barrel exporting only Workers-safe services. With that in place these drop to ≤1 Node-only module:

`assets`³, `cases`³, `decision-training`, `folders`, `inbox-agent-policy`, `inbox-dismissals`, `issue-tree-control`, `resource-memberships`, `sidebar-preferences`, `smoke-lab`, `status-cards`, `activity`, `instance-settings`, `companies`³ (2: agent instructions, import transfers).

³ Have `multer` uploads; the upload paths need an R2-backed storage provider before they are complete on Workers.

### Tier 2 — after stubbing the execution-plane hubs (+11 routes to ≤3)

Also swap `services/native-runtime/index`, `adapters/registry`, `storage/index`, `secrets/provider-registry`, `services/execution-workspaces`, `services/tool-gateway` for Workers-side stubs that throw on use. Routes that never call into them then run; a route that does fails loudly on that call:

`costs`, `tool-gateway`⁴, `attention`, `approvals`, `goals`, `routines`, `file-resources`, `adapters`, `access`, `decisions`, `board-chat`⁵.

⁴ The read side only. ⁵ Spawns a process on Node; Workers would need a different transport.

### Stays on Node for now (17 routes)

More than three Node-only modules remain even after the stubs, because the route logic itself reaches the execution plane:

`agents`, `issues`, `environments`, `pipelines`, `secrets`, `projects`, `execution-workspaces`, `company-skills`, `tool-access`, `plugins`, `health`, `llms`, `connection-intents`, `onboarding-seed`, `built-in-agents`, `summary-slots`, `teams-catalog`.

`issues` (14,750 lines, 341 reachable modules) and `agents` (6,826 lines) are the two that matter most and the two with the deepest coupling. They are the target of the next design step, not of route-by-route migration.

### Not routes

| Subsystem | Today | On Cloudflare |
|---|---|---|
| Actor / bearer auth | Express middleware | Runs unchanged behind the request shim (done) |
| Session cookies (better-auth) | Node handler | Not wired on Workers yet; better-auth has a Workers path |
| Live events WebSocket | in-process `EventEmitter` + `ws` | Durable Object + WebSocket Hibernation (later) |
| Runner PRP WebSocket | `ws` | Durable Object (later) |
| Heartbeat scheduler | `setInterval` 30 s, DB-driven | Cron Trigger / DO alarm; `HEARTBEAT_SCHEDULER_ENABLED=false` on Node (later) |
| Storage | S3 / local disk | R2 through the existing provider interface |
| Plugin workers | one child process per plugin | Not on Workers (Workers for Platforms would be the analogue) |
| Agent execution, git worktrees, terminals | child processes, disk | Not on Workers (Cloudflare Sandbox containers exist upstream; out of scope here) |
| Embedded Postgres, backups | Node | Not on Workers; Hyperdrive to a managed Postgres |

## Verification contract

Every migrated route is compared against the Node server on the same database (`scratch: m3-compare.sh`): same status code and same JSON after normalizing ISO timestamps. Bundle must stay free of `express`, `pino-http`, and `embedded-postgres` modules.
