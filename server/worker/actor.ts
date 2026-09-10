import type { Context, MiddlewareHandler } from "hono";
import type { Request as ExpressRequest, RequestHandler } from "express";
import type { Db } from "@paperclipai/db";
import type { DeploymentMode } from "@paperclipai/shared";
import { actorMiddleware as expressActorMiddleware } from "../src/middleware/auth.js";
import { HttpError } from "../src/errors.js";

export type Actor = ExpressRequest["actor"];
export type ActorVariables = { actor: Actor };

/**
 * The subset of an Express `Request` that `actorMiddleware` reads: `header()`,
 * `method`, `path`, `originalUrl`, and the `actor` slot it writes. Nothing else
 * on the request is touched, and `res` is never used, so the unchanged Express
 * middleware runs here against this shim. If upstream starts reading another
 * field, the Worker fails loudly on the first request instead of drifting.
 */
function expressRequestShim(c: Context): ExpressRequest {
  const url = new URL(c.req.url);
  const shim = {
    header: (name: string) => c.req.header(name),
    method: c.req.method,
    path: url.pathname,
    originalUrl: url.pathname + url.search,
    actor: undefined as unknown as Actor,
  };
  return shim as unknown as ExpressRequest;
}

function runExpressMiddleware(handler: RequestHandler, req: ExpressRequest): Promise<void> {
  return new Promise((resolve, reject) => {
    Promise.resolve(
      handler(req, {} as never, (err?: unknown) => (err ? reject(err) : resolve())),
    ).catch(reject);
  });
}

/**
 * Hono adapter around the Express `actorMiddleware` from `middleware/auth.ts`.
 * Session cookies are not resolved here yet (no `resolveSession`); bearer
 * credentials and cloud-tenant headers are.
 */
export function actorMiddleware<E extends { Variables: ActorVariables }>(input: {
  getDb: (c: Context<E>) => Db;
  deploymentMode: (c: Context<E>) => DeploymentMode;
}): MiddlewareHandler<E> {
  return async (c, next) => {
    const handler = expressActorMiddleware(input.getDb(c), {
      deploymentMode: input.deploymentMode(c),
    });
    const req = expressRequestShim(c);
    try {
      await runExpressMiddleware(handler, req);
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
    c.set("actor", req.actor);
    await next();
  };
}
