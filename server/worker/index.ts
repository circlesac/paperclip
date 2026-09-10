import { Hono } from "hono";
import { sql } from "drizzle-orm";
import { DEPLOYMENT_MODES, type DeploymentMode } from "@paperclipai/shared";
import { createWorkerDb } from "./db.js";
import type { Env } from "./env.js";
import { actorMiddleware, type ActorVariables } from "./actor.js";
import { mountExpressRouters, type RouterEntry } from "./express-adapter.js";
import { companies } from "./shims/paperclip-db.js";
import { dashboardRoutes } from "../src/routes/dashboard.js";
import { sidebarBadgeRoutes } from "../src/routes/sidebar-badges.js";
import { userProfileRoutes } from "../src/routes/user-profiles.js";
import { folderRoutes } from "../src/routes/folders.js";
import { goalRoutes } from "../src/routes/goals.js";
import { inboxDismissalRoutes } from "../src/routes/inbox-dismissals.js";
import { inboxAgentPolicyRoutes } from "../src/routes/inbox-agent-policy.js";
import { sidebarPreferenceRoutes } from "../src/routes/sidebar-preferences.js";
import { resourceMembershipRoutes } from "../src/routes/resource-memberships.js";
import { decisionTrainingRoutes } from "../src/routes/decision-training.js";
import { issueTreeControlRoutes } from "../src/routes/issue-tree-control.js";
import { activityRoutes } from "../src/routes/activity.js";
import { instanceSettingsRoutes } from "../src/routes/instance-settings.js";
import { costRoutes } from "../src/routes/costs.js";
import { attentionRoutes } from "../src/routes/attention.js";
import { decisionRoutes } from "../src/routes/decisions.js";
import { companyRoutes } from "../src/routes/companies.js";
import { accessRoutes } from "../src/routes/access.js";
import { createDecisionWakeOriginAgent } from "../src/services/decision-wakeup.js";
import { projectRoutes } from "../src/routes/projects.js";
import { agentRoutes } from "../src/routes/agents.js";
import { pipelineRoutes } from "../src/routes/pipelines.js";
import { issueRoutes } from "../src/routes/issues.js";
import { approvalRoutes } from "../src/routes/approvals.js";
import { routineRoutes } from "../src/routes/routines.js";
import { statusCardRoutes } from "../src/routes/status-cards.js";
import { createWorkerStorage } from "./storage-r2.js";
import { LiveEventsRoom, authorizeLiveEventsUpgrade } from "./live-events.js";
import { liveEventSink } from "./shims/live-events.js";
import { assetRoutes } from "../src/routes/assets.js";
import { caseRoutes } from "../src/routes/cases.js";
import { authRoutes } from "../src/routes/auth.js";
import { healthRoutes } from "../src/routes/health.js";
import { adapterRoutes } from "../src/routes/adapters.js";
import { createWorkerAuth, resolveWorkerSession, type WorkerAuth } from "./auth.js";
import { setStartupRecoveryPhase } from "../src/startup-recovery-state.js";
import { boardMutationGuard } from "../src/middleware/board-mutation-guard.js";
import type { ShimRouter } from "./shims/express.js";
import { Router } from "./shims/express.js";

type AppEnv = { Bindings: Env; Variables: ActorVariables & { db: ReturnType<typeof createWorkerDb>; auth: WorkerAuth | null; storage: ReturnType<typeof createWorkerStorage> } };

// index.ts flips this to "ready" after startup recovery; the Worker has no
// startup recovery to run, so health reports ready from the first request.
setStartupRecoveryPhase("ready");

const app = new Hono<AppEnv>();

function deploymentMode(env: Env): DeploymentMode {
  const raw = env.PAPERCLIP_DEPLOYMENT_MODE?.trim();
  return raw && (DEPLOYMENT_MODES as readonly string[]).includes(raw)
    ? (raw as DeploymentMode)
    : "local_trusted";
}

// One postgres.js client per request. A Worker isolate is reused across
// requests, so close the client after the response instead of leaking one
// idle connection per request.
app.use("/api/*", async (c, next) => {
  const db = createWorkerDb(c.env.HYPERDRIVE.connectionString);
  c.set("db", db);
  c.set("storage", createWorkerStorage(c.env.STORAGE));
  // Session cookies only exist in authenticated mode (app.ts does the same).
  c.set("auth", deploymentMode(c.env) === "authenticated" ? createWorkerAuth(db, c.env, "authenticated", c.req.url) : null);
  try {
    // Live events published while handling this request go to the company's
    // room; the delivery outlives the response.
    await liveEventSink.run((event) => {
      const room = c.env.LIVE_EVENTS.get(c.env.LIVE_EVENTS.idFromName(event.companyId));
      c.executionCtx.waitUntil(room.publish(JSON.stringify(event)).catch((err: unknown) => console.error("live event publish failed", err)));
    }, next);
  } finally {
    c.executionCtx.waitUntil(db.$client.end({ timeout: 5 }));
  }
});

app.use(
  "/api/*",
  actorMiddleware<AppEnv>({
    getDb: (c) => c.get("db"),
    deploymentMode: (c) => deploymentMode(c.env),
    resolveSession: (c) => {
      const auth = c.get("auth");
      return auth ? resolveWorkerSession(auth, c) : Promise.resolve(null);
    },
  }),
);

app.get("/api/__probe/health", (c) => {
  return c.json({ ok: true, runtime: "cloudflare-workers" });
});

// Connectivity probe only. It runs one schema-backed query and one server
// query so a wrong binding, a missing migration, or an unreachable database
// all surface as a failure, but it does not echo counts, versions, or driver
// error text to the caller. Details go to the Worker log.
app.get("/api/__probe/db", async (c) => {
  try {
    const db = c.get("db");
    await db.select({ companies: sql<number>`count(*)::int` }).from(companies);
    await db.execute(sql`select version()`);
    return c.json({ ok: true });
  } catch (error) {
    console.error("db probe failed", error);
    return c.json({ ok: false, error: "database probe failed" }, 500);
  }
});

app.get("/api/__probe/me", (c) => {
  const actor = c.get("actor");
  return c.json({
    type: actor.type,
    source: actor.source,
    userId: actor.userId,
    agentId: actor.agentId,
    companyId: actor.companyId,
    isInstanceAdmin: actor.isInstanceAdmin,
    keyScope: actor.keyScope,
    runId: actor.runId,
  });
});

// Route factories are intentionally invoked per request to preserve the db-scoped
// dependencies they capture today.
// Live-events WebSocket (src/realtime/live-events-ws.ts on Node). Only the
// upgrade is handled here; a plain GET falls through to the routers and 404s
// as on Node.
app.get("/api/companies/:companyId/events/ws", async (c, next) => {
  if (c.req.header("upgrade")?.toLowerCase() !== "websocket") return next();
  const companyId = c.req.param("companyId");
  const auth = c.get("auth");
  const context = await authorizeLiveEventsUpgrade(c.get("db"), c, companyId, {
    deploymentMode: deploymentMode(c.env),
    resolveSession: auth ? () => resolveWorkerSession(auth, c) : undefined,
  });
  if (!context) return c.text("forbidden", 403);
  const room = c.env.LIVE_EVENTS.get(c.env.LIVE_EVENTS.idFromName(companyId));
  return room.fetch(c.req.raw);
});

mountExpressRouters(app, {
  prefix: "/api",
  routers: (c) => {
    const guard = Router();
    guard.use(boardMutationGuard() as never);

    return [
      guard,
      () => ({ mount: "/auth", router: authRoutes(c.get("db")) as unknown as ShimRouter }),
      // app.ts mounts health at /api/health. authReady mirrors app.ts (true unless
      // authenticated mode is still bootstrapping); backups are Node-only.
      () => ({
        mount: "/health",
        router: healthRoutes(c.get("db"), {
          deploymentMode: deploymentMode(c.env),
          deploymentExposure: "private",
          authReady: true,
          companyDeletionEnabled: true,
        }) as unknown as ShimRouter,
      }),
      // No native runner on the Worker; the adapter registry itself is stubbed,
      // so listing adapters answers 501 until a Workers-side registry exists.
      () => adapterRoutes({ getNativeRunnerEnabled: async () => false }),
      () => dashboardRoutes(c.get("db")),
      () => sidebarBadgeRoutes(c.get("db")),
      () => userProfileRoutes(c.get("db")),
      () => folderRoutes(c.get("db")),
      () => goalRoutes(c.get("db")),
      () => inboxDismissalRoutes(c.get("db")),
      () => inboxAgentPolicyRoutes(c.get("db")),
      () => sidebarPreferenceRoutes(c.get("db")),
      () => resourceMembershipRoutes(c.get("db")),
      () => decisionTrainingRoutes(c.get("db")),
      () => issueTreeControlRoutes(c.get("db")),
      () => activityRoutes(c.get("db")),
      () => instanceSettingsRoutes(c.get("db")),
      () => costRoutes(c.get("db")),
      () => attentionRoutes(c.get("db")),
      // No heartbeat scheduler on the Worker: the same no-op wake Node uses
      // when HEARTBEAT_SCHEDULER_ENABLED=false.
      () => decisionRoutes(c.get("db"), { wakeOriginAgent: createDecisionWakeOriginAgent(null) }),
      // Express mounts this router at /api/companies (app.ts).
      () => ({ mount: "/companies", router: companyRoutes(c.get("db"), c.get("storage")) as unknown as ShimRouter }),
      () => accessRoutes(c.get("db"), {
        deploymentMode: deploymentMode(c.env),
        deploymentExposure: "private",
        bindHost: "127.0.0.1",
        allowedHostnames: [],
      }),
      () => projectRoutes(c.get("db")),
      // node:fs is only used lazily by agents.ts (skill file removal); those paths fail loudly.
      () => agentRoutes(c.get("db"), { deploymentMode: deploymentMode(c.env) }),
      () => pipelineRoutes(c.get("db")),
      // No plugin workers, feedback export, or tool-gateway callbacks on the
      // Worker; the options are optional and the affected paths fail loudly.
      () => issueRoutes(c.get("db"), c.get("storage"), {}),
      () => assetRoutes(c.get("db"), c.get("storage")),
      () => caseRoutes(c.get("db"), c.get("storage")),
      () => approvalRoutes(c.get("db")),
      () => routineRoutes(c.get("db")),
      () => statusCardRoutes(c.get("db")),
    ] as unknown as RouterEntry[];
  },
});

// Hashed build assets: immutable cache like app.ts (`maxAge: "1y", immutable`),
// and a real 404 for a missing file instead of the SPA fallback that
// `not_found_handling: "single-page-application"` would apply.
app.get("/assets/*", async (c) => {
  const res = await c.env.ASSETS.fetch(c.req.raw);
  if (!res.ok || (res.headers.get("content-type") ?? "").includes("text/html")) return c.notFound();
  const headers = new Headers(res.headers);
  headers.set("cache-control", "public, max-age=31536000, immutable");
  return new Response(res.body, { status: res.status, headers });
});

// better-auth's own endpoints (sign-in, session, …). app.ts registers this after
// authRoutes; here it runs when no Express router matched (the adapter passes
// through). Web handler instead of the Node one.
app.all("/api/auth/*", async (c) => {
  const auth = c.get("auth");
  if (!auth) return c.notFound();
  return auth.handler(c.req.raw);
});

// app.ts: `app.use("/api", (_req, res) => res.status(404).json({ error: "API route not found" }))`.
// Non-API paths never reach the Worker except /assets/*, which answers its own 404.
app.notFound((c) => (c.req.path.startsWith("/api/") ? c.json({ error: "API route not found" }, 404) : c.text("Not found", 404)));

export default app;

export { LiveEventsRoom };
