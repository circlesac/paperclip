export type ShimHandler = (req: any, res: any, next: (err?: unknown) => void) => unknown;
export type ShimMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE" | "ALL" | "USE";

export interface ShimLayer {
  method: ShimMethod;
  path: string | null;
  handlers: ShimHandler[];
}

export interface ShimRouter {
  readonly layers: ShimLayer[];
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

  function register(method: ShimMethod, path: string | null, handlers: ShimHandler[]): void {
    if (path) {
      assertSupportedRoutePattern(path);
    }
    layers.push({ method, path: path ? normalizePath(path) : null, handlers: handlers.slice() });
  }

  const router: ShimRouter = {
    layers,
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

export default function express(): never {
  throw new Error("express() is not available in the Worker bundle; only Router() is shimmed");
}
