/**
 * Live events on the Worker: one Durable Object per company holds the
 * browsers' WebSockets (Hibernation API, so idle rooms cost nothing) and
 * broadcasts what the request handlers publish through shims/live-events.ts.
 *
 * Replaces server/src/realtime/live-events-ws.ts, which is Node-only (`ws`
 * via createRequire, http upgrade events). The wire format is unchanged: one
 * JSON `LiveEvent` per message, ids monotonic per company. The upgrade
 * authorization below is a port of `authorizeUpgrade` there, minus the
 * Cloud-proxied actor lane (no cloud tenant token on the Worker).
 */
import { DurableObject } from "cloudflare:workers";
import { createHash } from "node:crypto";
import { and, eq, isNull } from "drizzle-orm";
import type { Context } from "hono";
import type { DeploymentMode, LiveEvent } from "@paperclipai/shared";
import type { BetterAuthSessionResult } from "../src/auth/better-auth.js";
import { agentApiKeys, companyMemberships, instanceUserRoles, type Db } from "./shims/paperclip-db.js";
import type { Env } from "./env.js";

export class LiveEventsRoom extends DurableObject<Env> {
  /** WebSocket upgrade for one company (the caller has authorized it). */
  async fetch(request: Request): Promise<Response> {
    if (request.headers.get("Upgrade")?.toLowerCase() !== "websocket") {
      return new Response("expected websocket", { status: 426 });
    }
    const pair = new WebSocketPair();
    this.ctx.acceptWebSocket(pair[1]);
    return new Response(null, { status: 101, webSocket: pair[0] });
  }

  /** Called (RPC) by the request that published the event; `json` is a LiveEvent without `id`
   *  (a string keeps the RPC signature structured-clone-safe for `payload: Record<string, unknown>`). */
  async publish(json: string): Promise<void> {
    const id = ((await this.ctx.storage.get<number>("nextEventId")) ?? 0) + 1;
    void this.ctx.storage.put("nextEventId", id, { allowUnconfirmed: true });
    const event: LiveEvent = { id, ...(JSON.parse(json) as Omit<LiveEvent, "id">) };
    const message = JSON.stringify(event);
    for (const socket of this.ctx.getWebSockets()) {
      try {
        socket.send(message);
      } catch {
        // closed between getWebSockets() and send(); the close handler cleans up
      }
    }
  }

  // Browsers never send application messages; the Node server ignores them too.
  async webSocketMessage(): Promise<void> {}

  async webSocketClose(ws: WebSocket, code: number, reason: string): Promise<void> {
    try {
      ws.close(code, reason);
    } catch {}
  }

  async webSocketError(ws: WebSocket): Promise<void> {
    try {
      ws.close(1011, "error");
    } catch {}
  }
}

export interface UpgradeContext {
  companyId: string;
  actorType: "board" | "agent";
  actorId: string;
}

function parseBearerToken(auth: string | null) {
  if (!auth || !auth.toLowerCase().startsWith("bearer ")) return null;
  const token = auth.slice("bearer ".length).trim();
  return token.length > 0 ? token : null;
}

/** Port of authorizeUpgrade in src/realtime/live-events-ws.ts (same rules, same order). */
export async function authorizeLiveEventsUpgrade(
  db: Db,
  c: Context,
  companyId: string,
  opts: {
    deploymentMode: DeploymentMode;
    resolveSession?: () => Promise<BetterAuthSessionResult | null>;
  },
): Promise<UpgradeContext | null> {
  const url = new URL(c.req.url);
  const queryToken = url.searchParams.get("token")?.trim() ?? "";
  const token = parseBearerToken(c.req.header("authorization") ?? null) ?? (queryToken.length > 0 ? queryToken : null);

  if (!token) {
    if (opts.deploymentMode === "local_trusted") {
      return { companyId, actorType: "board", actorId: "board" };
    }
    if (opts.deploymentMode !== "authenticated" || !opts.resolveSession) return null;

    const session = await opts.resolveSession();
    const userId = session?.user?.id;
    if (!userId) return null;

    const [roleRow, memberships] = await Promise.all([
      db
        .select({ id: instanceUserRoles.id })
        .from(instanceUserRoles)
        .where(and(eq(instanceUserRoles.userId, userId), eq(instanceUserRoles.role, "instance_admin")))
        .then((rows) => rows[0] ?? null),
      db
        .select({ companyId: companyMemberships.companyId })
        .from(companyMemberships)
        .where(
          and(
            eq(companyMemberships.principalType, "user"),
            eq(companyMemberships.principalId, userId),
            eq(companyMemberships.status, "active"),
          ),
        ),
    ]);
    if (!roleRow && !memberships.some((row) => row.companyId === companyId)) return null;
    return { companyId, actorType: "board", actorId: userId };
  }

  const tokenHash = createHash("sha256").update(token).digest("hex");
  const key = await db
    .select()
    .from(agentApiKeys)
    .where(and(eq(agentApiKeys.keyHash, tokenHash), isNull(agentApiKeys.revokedAt)))
    .then((rows) => rows[0] ?? null);
  if (!key || key.companyId !== companyId) return null;

  await db.update(agentApiKeys).set({ lastUsedAt: new Date() }).where(eq(agentApiKeys.id, key.id));
  return { companyId, actorType: "agent", actorId: key.agentId };
}
