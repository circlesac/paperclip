import { Hono } from "hono";
import { sql } from "drizzle-orm";
import { DEPLOYMENT_MODES, type DeploymentMode } from "@paperclipai/shared";
import { createWorkerDb } from "./db.js";
import type { Env } from "./env.js";
import { actorMiddleware, type ActorVariables } from "./actor.js";
import { mountExpressRouters } from "./express-adapter.js";
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
import { boardMutationGuard } from "../src/middleware/board-mutation-guard.js";
import type { ShimRouter } from "./shims/express.js";
import { Router } from "./shims/express.js";

type AppEnv = { Bindings: Env; Variables: ActorVariables & { db: ReturnType<typeof createWorkerDb> } };

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
  try {
    await next();
  } finally {
    c.executionCtx.waitUntil(db.$client.end({ timeout: 5 }));
  }
});

app.use(
  "/api/*",
  actorMiddleware<AppEnv>({
    getDb: (c) => c.get("db"),
    deploymentMode: (c) => deploymentMode(c.env),
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
mountExpressRouters(app, {
  prefix: "/api",
  routers: (c) => {
    const guard = Router();
    guard.use(boardMutationGuard() as never);

    return [
      guard,
      dashboardRoutes(c.get("db")),
      sidebarBadgeRoutes(c.get("db")),
      userProfileRoutes(c.get("db")),
      folderRoutes(c.get("db")),
      goalRoutes(c.get("db")),
      inboxDismissalRoutes(c.get("db")),
      inboxAgentPolicyRoutes(c.get("db")),
      sidebarPreferenceRoutes(c.get("db")),
      resourceMembershipRoutes(c.get("db")),
      decisionTrainingRoutes(c.get("db")),
      issueTreeControlRoutes(c.get("db")),
      activityRoutes(c.get("db")),
      instanceSettingsRoutes(c.get("db")),
    ] as unknown as ShimRouter[];
  },
});

export default app;
