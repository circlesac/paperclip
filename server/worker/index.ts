import { Hono } from "hono";
import { sql } from "drizzle-orm";
import { createWorkerDb } from "./db.js";
import type { Env } from "./env.js";
import { companies } from "@paperclipai/db/schema/index";

const app = new Hono<{ Bindings: Env }>();

app.get("/api/__probe/health", (c) => {
  return c.json({
    ok: true,
    runtime: "cloudflare-workers",
  });
});

app.get("/api/__probe/db", async (c) => {
  try {
    const db = createWorkerDb(c.env.HYPERDRIVE.connectionString);
    const [companyRow] = await db
      .select({ companies: sql<number>`count(*)::int` })
      .from(companies);

    const [{ version }] = await db.execute(sql<{ version: string }>`select version()`);

    return c.json({
      ok: true,
      companies: companyRow.companies,
      postgres: version,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return c.json({
      ok: false,
      error: message,
    }, 500);
  }
});

export default app;
