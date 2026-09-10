import { ZodError } from "zod";
import type { Context, Hono } from "hono";
import type { ShimLayer, ShimRouter } from "./shims/express.js";
import { HttpError } from "../src/errors.js";
import { RAW_REQUEST } from "./shims/multer.js";
import { EventEmitter } from "node:events";

type ShimHandler = (req: unknown, res: unknown, next: (err?: unknown) => void) => unknown;
type ShimParamHandler = (req: unknown, res: unknown, next: (err?: unknown) => void, value: string, name: string) => unknown;

type ResLike = {
  statusCode: number;
  headersSent: boolean;
  writableEnded: boolean;
  finished: boolean;
  on(event: string, fn: (...args: unknown[]) => void): ResLike;
  once(event: string, fn: (...args: unknown[]) => void): ResLike;
  off(event: string, fn: (...args: unknown[]) => void): ResLike;
  removeListener(event: string, fn: (...args: unknown[]) => void): ResLike;
  prependListener(event: string, fn: (...args: unknown[]) => void): ResLike;
  prependOnceListener(event: string, fn: (...args: unknown[]) => void): ResLike;
  removeAllListeners(event?: string): ResLike;
  locals: Record<string, unknown>;
  status(code: number): ResLike;
  setHeader(name: string, value: string): void;
  set(name: string, value: string): void;
  header(name: string, value: string): void;
  getHeader(name: string): string | null;
  json(body: unknown): ResLike;
  send(body: string | Uint8Array | unknown): ResLike;
  end(body?: string | Uint8Array): ResLike;
  write(chunk: string | Uint8Array): boolean;
  emit(event: string, ...args: unknown[]): boolean;
  listenerCount(event: string): number;
  redirect(statusOrUrl: number | string, url?: string): ResLike;
};

type ShimResponse = {
  /** True once a readable was piped or write() was called. */
  readonly streaming: boolean;
  /** Resolves when end() runs. */
  ended: Promise<void>;
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
  const chunks: Uint8Array[] = [];
  const headers: Record<string, string> = {};
  // `readable.pipe(res)` (asset/attachment downloads) emits "pipe" on the
  // destination synchronously and then writes asynchronously, after the
  // handler returned. Once a stream is attached the adapter waits for end().
  let streaming = false;
  let settle: (() => void) | undefined;
  const ended = new Promise<void>((r) => { settle = r; });

  // Express responses are EventEmitters (http.ServerResponse); routes register
  // "close"/"finish" listeners for cancellation. Listeners run when the
  // response is finalized.
  const emitter = new EventEmitter();
  const emit = (event: string) => { try { emitter.emit(event); } catch {} };
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
    emit("finish");
    emit("close");
    settle?.();
  };

  return {
    get streaming() { return streaming; },
    ended,
    res: {
      get statusCode() {
        return statusCode;
      },
      get headersSent() {
        return finished;
      },
      get writableEnded() {
        return finished;
      },
      get finished() {
        return finished;
      },
      on(event: string, fn: (...args: unknown[]) => void) { emitter.on(event, fn); return this; },
      once(event: string, fn: (...args: unknown[]) => void) { emitter.once(event, fn); return this; },
      prependListener(event: string, fn: (...args: unknown[]) => void) { emitter.prependListener(event, fn); return this; },
      prependOnceListener(event: string, fn: (...args: unknown[]) => void) { emitter.prependOnceListener(event, fn); return this; },
      removeAllListeners(event?: string) { emitter.removeAllListeners(event); return this; },
      off(event: string, fn: (...args: unknown[]) => void) { emitter.off(event, fn); return this; },
      removeListener(event: string, fn: (...args: unknown[]) => void) { emitter.removeListener(event, fn); return this; },
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
      // Node streams pipe into the response (`object.stream.pipe(res)`):
      // Readable.pipe needs write/end/emit and the listener methods above.
      write(chunk: string | Uint8Array) {
        streaming = true;
        chunks.push(typeof chunk === "string" ? new TextEncoder().encode(chunk) : chunk);
        return true;
      },
      emit(event: string, ...args: unknown[]) {
        if (event === "pipe") streaming = true;
        return emitter.emit(event, ...args);
      },
      listenerCount(event: string) {
        return emitter.listenerCount(event);
      },
      end(payload?: string | Uint8Array) {
        if (payload != null) chunks.push(typeof payload === "string" ? new TextEncoder().encode(payload) : payload);
        if (chunks.length > 0) {
          const total = chunks.reduce((n, c) => n + c.byteLength, 0);
          const joined = new Uint8Array(total);
          let offset = 0;
          for (const c of chunks) { joined.set(c, offset); offset += c.byteLength; }
          finish(undefined, joined);
        } else {
          finish(undefined, "");
        }
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
    path: path as string,
    originalUrl: url.pathname + url.search,
    url: path + url.search,
    baseUrl: prefix as string,
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
    // The Worker Request, for shims that must read the body themselves (multer).
    [RAW_REQUEST]: c.req.raw,
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

  // Read from a clone so the original body stays available to handlers that
  // run after this one when no Express route responds (better-auth reads the
  // Request itself).
  return c.req.raw.clone().text().then((text) => (text.length ? JSON.parse(text) : undefined));
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

/** A router mounted at a sub-path, like Express `api.use("/companies", router)`. */
export type MountedRouter = ShimRouter | { mount: string; router: ShimRouter };
/** Entries may be thunks so one failing route factory does not take the others down. */
export type RouterEntry = MountedRouter | (() => MountedRouter);

export function mountExpressRouters<E extends { Variables: { actor: unknown } }>(
  app: Hono<E>,
  opts: { prefix: string; routers: (c: Context<E>) => RouterEntry[] },
): void {
  app.all(`${opts.prefix}/*`, async (c, next) => {
    const url = new URL(c.req.url);
    const requestPath = url.pathname.slice(opts.prefix.length) || "/";
    const requestMethod = c.req.method;
    const req = buildRequest(c, opts.prefix);
    // The body is parsed only once a layer matches: an unmatched request is
    // passed on (next()) and its body must stay unread for later handlers
    // such as better-auth.
    let bodyParsed = false;

    const resObj = createResponse();
    const ranParams = new Set<string>();

    try {
      // Inside the try: a route factory that throws while constructing its
      // services must produce the same JSON error mapping as a handler error.
      // Build each router in isolation: a factory that throws (for example
      // because it touches a stubbed service at construction) only disables
      // its own routes. If nothing else matches, its error is what we report.
      const routers: MountedRouter[] = [];
      let constructionError: unknown = null;
      for (const item of opts.routers(c)) {
        try {
          routers.push(typeof item === "function" ? item() : item);
        } catch (err) {
          constructionError ??= err;
        }
      }
      for (const entry of routers) {
        const mount = "mount" in entry ? entry.mount : "";
        const router = "mount" in entry ? entry.router : entry;
        // Express strips the mount path before matching the router's own paths
        // and exposes it as req.baseUrl.
        let routerPath = requestPath;
        if (mount) {
          if (!usePathPrefixMatches(mount, requestPath)) continue;
          routerPath = requestPath.slice(mount.length) || "/";
          if (!routerPath.startsWith("/")) routerPath = "/" + routerPath;
        }
        req.baseUrl = opts.prefix + mount;
        req.path = routerPath;
        for (const layer of router.layers as ShimLayer[]) {
          const nextParams: Record<string, string> = {};

          if (!methodMatches(layer.method, requestMethod)) {
            continue;
          }

          if (layer.method === "USE") {
            if (!usePathPrefixMatches(layer.path ?? "/", routerPath)) {
              continue;
            }
          } else {
            if (!routeMatches(layer.path ?? "", routerPath, nextParams)) {
              continue;
            }
          }

          req.params = nextParams;
          if (!bodyParsed) {
            bodyParsed = true;
            req.body = await parseBody(c, requestMethod);
          }
          // Express `router.param(name, fn)` handlers run once per request for
          // each captured param, before the route's own handlers.
          for (const [name, value] of Object.entries(nextParams)) {
            const key = `${name}=${value}`;
            if (ranParams.has(key)) continue;
            for (const paramHandler of router.params?.get(name) ?? []) {
              const nextCalled = await runHandler(
                (rq: unknown, rs: unknown, nx: (err?: unknown) => void) => paramHandler(rq, rs, nx, value, name),
                req,
                resObj.res,
              );
              if (resObj.res.headersSent) return resObj.buildResponse();
              if (!nextCalled) {
                console.error("No response and no next() call from Express-style param handler", { method: requestMethod, path: requestPath, name });
                resObj.res.status(500).json({ error: "Internal server error" });
                return resObj.buildResponse();
              }
            }
            ranParams.add(key);
          }
          for (const handler of layer.handlers) {
            const nextCalled = await runHandler(handler, req, resObj.res);

            if (!nextCalled && !resObj.res.headersSent && resObj.streaming) {
              await resObj.ended;
            }

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

      if (constructionError) throw constructionError;
      // Nothing matched: let routes registered after this one (for example the
      // better-auth handler) see the request; Hono answers 404 at the end.
      await next();
      return;
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
        console.warn(`[worker] 501 ${requestMethod} ${requestPath}: ${error.message}`);
        return c.json({ error: error.message }, 501);
      }

      console.error(error);
      return c.json({ error: "Internal server error" }, 500);
    }
  });
}
