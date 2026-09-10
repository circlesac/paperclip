import type { Context } from "hono";
import type { Db } from "./shims/paperclip-db.js";
import type { Config } from "../src/config.js";
import type { DeploymentMode } from "@paperclipai/shared";
import {
  createBetterAuthInstance,
  deriveAuthTrustedOrigins,
  resolveBetterAuthSessionFromHeaders,
  type BetterAuthSessionResult,
} from "../src/auth/better-auth.js";
import type { Env } from "./env.js";

/**
 * better-auth on the Worker, built from the unchanged server module.
 *
 * `createBetterAuthInstance(db, config, trustedOrigins)` reads a few `Config`
 * fields and two env vars. The Worker has no config.ts (dotenv, paths), so the
 * fields it reads are assembled here from bindings. The Express handler in
 * better-auth.ts wraps `toNodeHandler`; the Worker calls better-auth's web
 * handler (`auth.handler(Request)`) directly.
 */
export function workerAuthConfig(env: Env, deploymentMode: DeploymentMode, requestUrl: string): Config {
  const url = new URL(requestUrl);
  const publicBaseUrl = env.PAPERCLIP_PUBLIC_URL?.trim() || undefined;
  return {
    deploymentMode,
    deploymentExposure: "private",
    port: Number(url.port) || (url.protocol === "https:" ? 443 : 80),
    allowedHostnames: [],
    authBaseUrlMode: publicBaseUrl ? "explicit" : "auto",
    authPublicBaseUrl: publicBaseUrl,
    authDisableSignUp: env.PAPERCLIP_AUTH_DISABLE_SIGNUP === "true",
  } as unknown as Config;
}

export type WorkerAuth = ReturnType<typeof createBetterAuthInstance>;

export function createWorkerAuth(db: Db, env: Env, deploymentMode: DeploymentMode, requestUrl: string): WorkerAuth {
  // better-auth.ts reads these from process.env at call time. On workerd,
  // bindings are only visible per request, so mirror them here.
  if (env.BETTER_AUTH_SECRET) process.env.BETTER_AUTH_SECRET = env.BETTER_AUTH_SECRET;
  if (env.PAPERCLIP_PUBLIC_URL) process.env.PAPERCLIP_PUBLIC_URL = env.PAPERCLIP_PUBLIC_URL;
  const config = workerAuthConfig(env, deploymentMode, requestUrl);
  const origins = Array.from(new Set([
    ...deriveAuthTrustedOrigins(config, { listenPort: config.port }),
    ...(env.BETTER_AUTH_TRUSTED_ORIGINS ?? "").split(",").map((v) => v.trim()).filter(Boolean),
  ]));
  return createBetterAuthInstance(db, config, origins);
}

export function resolveWorkerSession(auth: WorkerAuth, c: Context): Promise<BetterAuthSessionResult | null> {
  return resolveBetterAuthSessionFromHeaders(auth, c.req.raw.headers);
}
