import { ZodError } from "zod";
import type { Context, Hono } from "hono";
import type { ShimLayer, ShimRouter } from "./shims/express.js";
import { HttpError } from "../src/errors.js";

type ShimHandler = (req: unknown, res: unknown, next: (err?: unknown) => void) => unknown;

type ResLike = {
  statusCode: number;
  headersSent: boolean;
  locals: Record<string, unknown>;
  status(code: number): ResLike;
  setHeader(name: string, value: string): void;
  set(name: string, value: string): void;
  header(name: string, value: string): void;
  getHeader(name: string): string | null;
  json(body: unknown): ResLike;
  send(body: string | Uint8Array | unknown): ResLike;
  end(body?: string | Uint8Array): ResLike;
  redirect(statusOrUrl: number | string, url?: string): ResLike;
};

type ShimResponse = {
  res: ResLike;
  buildResponse(): Response;
};

function splitSegments(path: string): string[] {
  const normalized = path.length > 1 && path.endsWith("/") ? path.slice(0, -1) : path;
  return normalized
    .split("/")
    .filter((segment, index) => !(index === 0 && segment.length === 0) && segment.length > 0);
}

function methodMatches(layerMethod: string, requestMethod: string): boolean {
  if (layerMethod === "ALL" || layerMethod === "USE") return true;
  if (layerMethod === "GET" && requestMethod === "HEAD") return true;
  return layerMethod === requestMethod;
}

function routeMatches(pattern: string, requestPath: string, params: Record<string, string>): boolean {
  const patternSegments = splitSegments(pattern);
  const requestSegments = splitSegments(requestPath);

  if (patternSegments.length !== requestSegments.length) {
    return false;
  }

  for (let index = 0; index < patternSegments.length; index += 1) {
    const patternSegment = patternSegments[index];
    const requestSegment = requestSegments[index];

    if (patternSegment.startsWith(":")) {
      params[patternSegment.slice(1)] = decodeURIComponent(requestSegment);
      continue;
    }

    if (patternSegment.toLowerCase() !== requestSegment.toLowerCase()) {
      return false;
    }
  }

  return true;
}

function usePathPrefixMatches(prefix: string, requestPath: string): boolean {
  const prefixSegments = splitSegments(prefix.toLowerCase());
  const requestSegments = splitSegments(requestPath);

  if (prefixSegments.length > requestSegments.length) {
    return false;
  }

  for (let index = 0; index < prefixSegments.length; index += 1) {
    if (prefixSegments[index] !== requestSegments[index].toLowerCase()) {
      return false;
    }
  }

  return true;
}

function createResponse(): ShimResponse {
  let statusCode = 200;
  let body: string | Uint8Array | undefined;
  let finished = false;
  const headers: Record<string, string> = {};

  const finish = (nextStatus?: number, nextBody?: string | Uint8Array) => {
    if (finished) {
      throw new Error("response already finished");
    }
    finished = true;
    if (nextStatus !== undefined) {
      statusCode = nextStatus;
    }
    if (nextBody !== undefined) {
      body = nextBody;
    }
  };

  return {
    res: {
      get statusCode() {
        return statusCode;
      },
      get headersSent() {
        return finished;
      },
      locals: {},
      status(code: number) {
        statusCode = code;
        return this;
      },
      setHeader(name: string, value: string) {
        headers[name.toLowerCase()] = value;
      },
      set(name: string, value: string) {
        headers[name.toLowerCase()] = value;
      },
      header(name: string, value: string) {
        headers[name.toLowerCase()] = value;
      },
      getHeader(name: string) {
        return headers[name.toLowerCase()] ?? null;
      },
      json(payload: unknown) {
        finish(undefined, JSON.stringify(payload));
        if (headers["content-type"] == null) {
          headers["content-type"] = "application/json; charset=utf-8";
        }
        return this;
      },
      send(payload: string | Uint8Array | unknown) {
        if (payload == null) {
          finish(undefined, "");
        } else if (payload instanceof Uint8Array) {
          finish(undefined, payload);
        } else if (typeof payload === "string") {
          finish(undefined, payload);
        } else {
          finish(undefined, JSON.stringify(payload));
          if (headers["content-type"] == null) {
            headers["content-type"] = "application/json; charset=utf-8";
          }
        }
        return this;
      },
      end(payload?: string | Uint8Array) {
        finish(undefined, payload == null ? "" : payload);
        return this;
      },
      redirect(statusOrUrl: number | string, url?: string) {
        const redirectUrl = typeof statusOrUrl === "string" ? statusOrUrl : url;
        const redirectStatus = typeof statusOrUrl === "number" ? statusOrUrl : 302;
        if (!redirectUrl) {
          throw new Error("Missing redirect URL");
        }
        headers.location = redirectUrl;
        finish(redirectStatus, `Redirecting to ${redirectUrl}`);
        return this;
      },
    },
    buildResponse() {
      const responseHeaders = new Headers();
      for (const [name, value] of Object.entries(headers)) {
        responseHeaders.set(name, value);
      }

      const responseBody = (body ?? "") as BodyInit;
      return new Response(responseBody, { status: statusCode, headers: responseHeaders });
    },
  };
}

function buildRequest<E extends { Variables: { actor: unknown } }>(c: Context<E>, prefix: string) {
  const url = new URL(c.req.url);
  const path = url.pathname.slice(prefix.length) || "/";
  const lowerHeaders: Record<string, string> = {};

  for (const [name, value] of c.req.raw.headers.entries()) {
    lowerHeaders[name.toLowerCase()] = value;
  }

  const query: Record<string, string | string[]> = {};
  for (const key of url.searchParams.keys()) {
    const values = url.searchParams.getAll(key);
    query[key] = values.length === 1 ? values[0] : values;
  }

  // Express would parse nested brackets via qs; this shim keeps that as-is and only
  // handles flat string/array values.
  return {
    method: c.req.method,
    path,
    originalUrl: url.pathname + url.search,
    url: path + url.search,
    baseUrl: prefix,
    params: {},
    query,
    body: undefined as unknown,
    headers: lowerHeaders,
    header(name: string) {
      return lowerHeaders[name.toLowerCase()];
    },
    get(name: string) {
      return lowerHeaders[name.toLowerCase()];
    },
    actor: c.get("actor"),
    socket: {},
    // Express exposes app settings here (board-mutation-guard reads "trust proxy fn").
    app: { get: (_name: string) => undefined },
  };
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return value != null && typeof value === "object" && !Array.isArray(value);
}

function parseBody(c: Context, method: string): Promise<unknown> {
  if (method === "GET" || method === "HEAD") {
    return Promise.resolve(undefined);
  }

  const contentType = c.req.header("content-type") ?? "";
  if (!contentType.includes("application/json")) {
    return Promise.resolve(undefined);
  }

  return c.req.json();
}

function runHandler(handler: ShimHandler, req: Record<string, unknown>, res: ResLike): Promise<boolean> {
  return new Promise((resolve, reject) => {
    let nextCalled = false;
    let nextErr: unknown;
    const next = (err?: unknown) => {
      nextCalled = true;
      if (err !== undefined) {
        nextErr = err;
      }
    };

    Promise.resolve(handler(req, res, next)).then(() => {
      if (nextErr !== undefined) {
        reject(nextErr);
        return;
      }
      resolve(nextCalled);
    }, reject);
  });
}

export function mountExpressRouters<E extends { Variables: { actor: unknown } }>(
  app: Hono<E>,
  opts: { prefix: string; routers: (c: Context<E>) => ShimRouter[] },
): void {
  app.all(`${opts.prefix}/*`, async (c) => {
    const url = new URL(c.req.url);
    const requestPath = url.pathname.slice(opts.prefix.length) || "/";
    const requestMethod = c.req.method;
    const req = buildRequest(c, opts.prefix);
    req.body = await parseBody(c, requestMethod);

    const resObj = createResponse();

    try {
      // Inside the try: a route factory that throws while constructing its
      // services must produce the same JSON error mapping as a handler error.
      const routers = opts.routers(c);
      for (const router of routers) {
        for (const layer of router.layers as ShimLayer[]) {
          const nextParams: Record<string, string> = {};

          if (!methodMatches(layer.method, requestMethod)) {
            continue;
          }

          if (layer.method === "USE") {
            if (!usePathPrefixMatches(layer.path ?? "/", requestPath)) {
              continue;
            }
          } else {
            if (!routeMatches(layer.path ?? "", requestPath, nextParams)) {
              continue;
            }
          }

          req.params = nextParams;
          for (const handler of layer.handlers) {
            const nextCalled = await runHandler(handler, req, resObj.res);

            if (resObj.res.headersSent) {
              return resObj.buildResponse();
            }

            if (!nextCalled) {
              console.error("No response and no next() call from Express-style handler", {
                method: requestMethod,
                path: requestPath,
                handlers: layer.handlers.length,
              });
              resObj.res.status(500).json({ error: "Internal server error" });
              return resObj.buildResponse();
            }
          }
        }
      }

      return c.notFound();
    } catch (error) {
      if (error instanceof HttpError) {
        const details = error.details;
        return c.json(
          {
            error: error.message,
            ...(isPlainObject(details) && typeof details.code === "string" ? { code: details.code } : {}),
          },
          error.status as 400 | 401 | 403 | 404 | 409 | 413 | 415 | 422 | 500,
        );
      }

      if (error instanceof ZodError) {
        return c.json({ error: "Validation error", details: error.issues }, 400);
      }

      // A worker/shims stub was reached: the route exists but this part of the
      // server is not on the Worker yet. 501 with the reason is more useful to
      // the caller than a generic 500, and the stubs already make it explicit.
      if (error instanceof Error && error.message.endsWith("is not available on the Cloudflare Worker yet")) {
        return c.json({ error: error.message }, 501);
      }

      console.error(error);
      return c.json({ error: "Internal server error" }, 500);
    }
  });
}
