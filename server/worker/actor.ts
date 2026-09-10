import type { Context, MiddlewareHandler } from "hono";
import type { Db } from "@paperclipai/db";
import type { DeploymentMode } from "@paperclipai/shared";
import type { Actor, ActorRequestSource } from "../src/auth/actor.js";
import { resolveActor } from "../src/middleware/auth.js";
import { HttpError } from "../src/errors.js";

export type ActorVariables = { actor: Actor };

function requestSource(c: Context<any>): ActorRequestSource {
  const url = new URL(c.req.url);
  return {
    header: (name) => c.req.header(name),
    method: c.req.method,
    path: url.pathname,
    originalUrl: url.pathname + url.search,
  };
}

/**
 * Hono adapter around `resolveActor`, the same function the Express
 * `actorMiddleware` uses. Session cookies are not resolved here yet; bearer
 * credentials and cloud-tenant headers are.
 */
export function actorMiddleware<E extends { Variables: ActorVariables }>(input: {
  getDb: (c: Context<E>) => Db;
  deploymentMode: (c: Context<E>) => DeploymentMode;
}): MiddlewareHandler<E> {
  return async (c, next) => {
    try {
      const actor = await resolveActor(input.getDb(c), requestSource(c), {
        deploymentMode: input.deploymentMode(c),
      });
      c.set("actor", actor);
    } catch (err) {
      if (err instanceof HttpError) {
        const details =
          err.details && typeof err.details === "object" && !Array.isArray(err.details)
            ? (err.details as Record<string, unknown>)
            : null;
        return c.json(
          {
            error: err.message,
            ...(typeof details?.code === "string" ? { code: details.code } : {}),
          },
          err.status as 400 | 401 | 403 | 404 | 409 | 413 | 415 | 422 | 500,
        );
      }
      throw err;
    }
    await next();
  };
}
