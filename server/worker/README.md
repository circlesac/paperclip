# Paperclip server on Cloudflare Workers

This directory is the Cloudflare Workers entry point for the Paperclip server. It is fork-local groundwork. `server/src/**` and `packages/**` stay byte-identical to upstream; this directory *consumes* them.

## Principle

Upstream is active. We do not edit `server/src`. Everything Cloudflare needs lives here:

- `index.ts` — the Worker `fetch` handler (Hono). Probes, per-request DB, actor, `boardMutationGuard`, and the mounted Express routers.
- `actor.ts` — runs the unchanged Express `actorMiddleware` behind a request shim.
- `express-adapter.ts` + `shims/express.ts` — runs unchanged Express route modules (`Router()`-based) under Hono.
- `build.mjs` — esbuild pre-bundle. Swaps a few modules for hand-written shims and generates lazy stubs for every `server/src` module the Worker cannot run (see below); wrangler then bundles its output.
- `shims/` — bundle-time replacements: `express` (recording `Router` with `param`, body-parser factories), `multer`, `pino-http`, `paperclip-db` (package aliases); `services-index` (curated barrel, generated); `instrumentation`, `version`, `build-commit`, `build-version` (hand-written, benign values).
- `scripts/gen-services-index.mjs` — regenerates the curated barrel from the routes mounted in `index.ts`. `scripts/lib/module-exports.mjs` — the export parser shared with `build.mjs`.
- `storage-unavailable.ts` — a `StorageService` whose operations answer 501.
- `db.ts`, `env.ts`, `tsconfig.json`.

If a change seems to need an edit under `server/src`, the answer is a shim or an alias here, or the route stays on Node for now.

## How the bundle stays Node-free

`worker/build.mjs` (esbuild) runs first, then wrangler bundles its output:

- Package aliases: `express` → recording `Router` shim (plus `express.json` pass-through and 501 `raw`/`text`/`urlencoded`/`static` factories); `multer` → 501 middleware; `pino-http` → no-op; `@paperclipai/db` → schema + `type Db` only (the real barrel drags in `embedded-postgres`).
- Hand-written shims (`SHIM_FILES`, swapped by path): `services/index.ts` → curated barrel (names derived from the routes mounted in `index.ts`); `instrumentation.ts`, `version.ts`, `build-commit.ts`, `build-version.ts` → benign values (the real ones run OpenTelemetry, `@cursor/sdk`, `createRequire(import.meta.url)` and `git describe` at module load).
- Generated stubs (an `onLoad` plugin decides per `server/src` module at build time; nothing is pre-generated): a module is replaced when it is listed in `STUB_FILES`, lives under an execution-plane directory (`STUB_DIRS`), imports a Node-only builtin at value level, or does Node-only work in a top-level statement (`import.meta.url`, `createRequire`, `randomUUID()` — workerd forbids random values at global scope). `ALLOW_FILES` exempts modules whose Node imports are only used lazily. Route modules are never stubbed; the build warns if a mounted one is Node-bound. `export const NAME = <literal>` keeps its real value in a stub. Run `WORKER_BUILD_VERBOSE=1 node worker/build.mjs` to list what was stubbed and why.
- `define`: `process.env.NODE_ENV` = `"production"` so `middleware/logger.ts` never calls `pino.transport` (absent in the pino build the bundler selects; a runtime var is not visible at module load).
- `external`: `node:*`, `cloudflare:*`, and bare builtin specifiers reached through third-party packages; workerd's `nodejs_compat` provides them.

Stubs are lazy in two steps: `fooService(db)` and property reads (`svc.wakeup`) return proxies, because route factories do both at construction; the first call, `await`, string conversion, or JSON serialization of the result throws. Routers are built per request as isolated thunks, so a factory that throws only disables its own routes. When a request reaches a stub, the adapter answers `501 { "error": "<name> is not available on the Cloudflare Worker yet" }`.

Check with `pnpm --filter @paperclipai/server exec wrangler deploy --dry-run --outdir /tmp/b` and grep the pre-bundle (`worker/dist/index.mjs`) for `node_modules/express/`, `pino-http`, `embedded-postgres`, `services/heartbeat.ts` (all must be absent).

## Adding a route module

1. Import its factory in `index.ts` and append it to the `routers` array (constructed per request with `c.get("db")`). If `app.ts` mounts it under a sub-path (`api.use("/companies", …)`), use `{ mount: "/companies", router }`.
2. Re-run `node worker/scripts/gen-services-index.mjs`; it reads the routes mounted in `index.ts` and exports what they import from the services barrel. A name whose module is Workers-safe is re-exported; a Node-bound one becomes a lazy stub.
3. `node worker/build.mjs` — the build warns if the route module itself is Node-bound; `WORKER_BUILD_VERBOSE=1` lists what was stubbed. If a needed module was stubbed only because it imports `node:fs` lazily, add it to `ALLOW_FILES`.
4. `wrangler dev`, then compare against the Node server on the same database (see Verification contract). A `501 … not available` answer means the route reached a stub; decide whether that endpoint is acceptable as "not yet".

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

### Mounted today (25 route modules)

`dashboard`, `sidebar-badges`, `user-profiles`, `folders`, `goals`, `inbox-dismissals`, `inbox-agent-policy`, `sidebar-preferences`, `resource-memberships`, `decision-training`, `issue-tree-control`, `activity`, `instance-settings`, `costs`, `attention`, `decisions`, `companies` (at `/api/companies`), `access`, `projects`, `pipelines`, `issues`, `approvals`, `routines`, `status-cards`, `agents`, plus `auth` at `/api/auth`. Byte-identical to Node on 79 of 82 compared GET requests; the 3 that differ answer 501 because they call `heartbeatService` (heartbeat-runs issues, instance task-drain) or the adapter registry (adapter model list). Mutations through the Worker (create/edit/delete goals, projects, issues) are visible from Node and identical on read-back. `services/issues.ts`, `companies.ts`, `agents.ts`, `approvals.ts`, `routines.ts` run for real; `heartbeat`, `status-cards`, `secrets`, `tool-gateway`, `execution-workspaces`, the native runtime, and the disk catalogs stay stubbed. Storage is `storage-unavailable.ts` (every operation 501) until an R2 provider exists.

### Tier 0 — runs with the M3 mechanism alone (12 routes)

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
| Session cookies (better-auth) | Node handler | **Done.** `worker/auth.ts` builds the unchanged `createBetterAuthInstance` from bindings; `/api/auth/*` uses better-auth's web handler; the actor middleware resolves sessions from request headers. Only in `authenticated` mode |
| Live events WebSocket | in-process `EventEmitter` + `ws` | Durable Object + WebSocket Hibernation (later) |
| Runner PRP WebSocket | `ws` | Durable Object (later) |
| Heartbeat scheduler | `setInterval` 30 s, DB-driven | Cron Trigger / DO alarm; `HEARTBEAT_SCHEDULER_ENABLED=false` on Node (later) |
| Storage | S3 / local disk | R2 through the existing provider interface |
| Plugin workers | one child process per plugin | Not on Workers (Workers for Platforms would be the analogue) |
| Agent execution, git worktrees, terminals | child processes, disk | Not on Workers (Cloudflare Sandbox containers exist upstream; out of scope here) |
| Embedded Postgres, backups | Node | Not on Workers; Hyperdrive to a managed Postgres |

## Authenticated mode

`PAPERCLIP_DEPLOYMENT_MODE=authenticated` and `BETTER_AUTH_SECRET` (a var or secret) turn on session cookies:

```
pnpm --filter @paperclipai/server dev:worker -- --port 8789 --var PAPERCLIP_DEPLOYMENT_MODE:authenticated --var BETTER_AUTH_SECRET:paperclip-dev-secret
curl -c jar -X POST localhost:8789/api/auth/sign-up/email -H 'content-type: application/json' -H 'origin: http://localhost:8789' -d '{"name":"x","email":"x@example.com","password":"…"}'
curl -b jar localhost:8789/api/__probe/me      # {"type":"board","source":"session",…}
```

The unchanged `boardMutationGuard` applies: a session actor's mutation without a trusted `origin`/`referer` answers 403. `PAPERCLIP_PUBLIC_URL` sets the explicit auth base URL; `BETTER_AUTH_TRUSTED_ORIGINS` adds origins.

## Verification contract

Every migrated route is compared against the Node server on the same database (`scratch: m3-compare.sh`): same status code and same JSON after normalizing ISO timestamps. Bundle must stay free of `express`, `pino-http`, and `embedded-postgres` modules.
