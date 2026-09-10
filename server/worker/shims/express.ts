export type ShimHandler = (req: any, res: any, next: (err?: unknown) => void) => unknown;
export type ShimMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE" | "ALL" | "USE";

export interface ShimLayer {
  method: ShimMethod;
  path: string | null;
  handlers: ShimHandler[];
}

export type ShimParamHandler = (req: any, res: any, next: (err?: unknown) => void, value: string, name: string) => unknown;

export interface ShimRouter {
  readonly layers: ShimLayer[];
  /** Express `router.param(name, handler)`: runs before any route that captures `:name`. */
  readonly params: Map<string, ShimParamHandler[]>;
  param(name: string, handler: ShimParamHandler): ShimRouter;
  get(path: string, ...handlers: ShimHandler[]): ShimRouter;
  post(path: string, ...handlers: ShimHandler[]): ShimRouter;
  put(path: string, ...handlers: ShimHandler[]): ShimRouter;
  patch(path: string, ...handlers: ShimHandler[]): ShimRouter;
  delete(path: string, ...handlers: ShimHandler[]): ShimRouter;
  all(path: string, ...handlers: ShimHandler[]): ShimRouter;
  use(pathOrHandler: string | ShimHandler, ...handlers: ShimHandler[]): ShimRouter;
}

function normalizePath(path: string): string {
  return path.startsWith("/") ? path : `/${path}`;
}

function assertSupportedRoutePattern(path: string): void {
  // We intentionally keep this strict: these adapters only support plain static and
  // path-parameter segments. Nested qs bracket syntax, wildcard/regex patterns, and
  // optional tokens are not supported in this M3 shim.
  const hasUnsupported = /[\*?()\[\]]/.test(path);
  if (!hasUnsupported) {
    return;
  }

  const segments = path.split("/");
  for (const segment of segments) {
    if (segment.startsWith(":")) {
      continue;
    }
    if (segment.includes("(") || segment.includes(")") || segment.includes("[") || segment.includes("]") || segment.includes("*")) {
      throw new Error(`unsupported route pattern: ${path}`);
    }
    if (segment.includes("?")) {
      throw new Error(`unsupported route pattern: ${path}`);
    }
  }
}

function createRouter(): ShimRouter {
  const layers: ShimLayer[] = [];
  const params = new Map<string, ShimParamHandler[]>();

  function register(method: ShimMethod, path: string | null, handlers: ShimHandler[]): void {
    if (path) {
      assertSupportedRoutePattern(path);
    }
    layers.push({ method, path: path ? normalizePath(path) : null, handlers: handlers.slice() });
  }

  const router: ShimRouter = {
    layers,
    params,
    param: (name, handler) => {
      params.set(name, [...(params.get(name) ?? []), handler]);
      return router;
    },
    get: (path, ...handlers) => {
      register("GET", path, handlers);
      return router;
    },
    post: (path, ...handlers) => {
      register("POST", path, handlers);
      return router;
    },
    put: (path, ...handlers) => {
      register("PUT", path, handlers);
      return router;
    },
    patch: (path, ...handlers) => {
      register("PATCH", path, handlers);
      return router;
    },
    delete: (path, ...handlers) => {
      register("DELETE", path, handlers);
      return router;
    },
    all: (path, ...handlers) => {
      register("ALL", path, handlers);
      return router;
    },
    use: (pathOrHandler, ...handlers) => {
      if (typeof pathOrHandler === "function") {
        register("USE", null, [pathOrHandler, ...handlers]);
      } else {
        register("USE", pathOrHandler, handlers);
      }
      return router;
    },
  };

  return router;
}

export function Router(): ShimRouter {
  return createRouter();
}

// Body-parser factories that route modules call at module load
// (`express.raw({ limit })`, `express.json()`). JSON bodies are already parsed
// by the adapter, so `json()` passes through; the others answer 501 until a
// route needs them.
type Middleware = (req: any, res: any, next: (err?: unknown) => void) => void;
const passthrough: Middleware = (_req, _res, next) => next();
function notAvailable(what: string): Middleware {
  return (_req, _res, next) => {
    const err = new Error(`express.${what} is not available on the Cloudflare Worker yet`);
    (err as Error & { status?: number }).status = 501;
    next(err);
  };
}

function express(): never {
  throw new Error("express() is not available in the Worker bundle; only Router() and the body-parser factories are shimmed");
}
express.Router = Router;
express.json = (_opts?: unknown) => passthrough;
express.raw = (_opts?: unknown) => notAvailable("raw");
express.text = (_opts?: unknown) => notAvailable("text");
express.urlencoded = (_opts?: unknown) => notAvailable("urlencoded");
express.static = (_root?: unknown, _opts?: unknown) => notAvailable("static");

export const json = express.json;
export const raw = express.raw;
export const text = express.text;
export const urlencoded = express.urlencoded;
export default express;
