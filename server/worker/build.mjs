// Pre-bundle for the Cloudflare Worker.
//
// wrangler can alias bare module names but not relative imports, and server
// route modules reach the execution plane through relative imports: the
// services barrel ("../services/index.js") and a handful of hub modules
// (adapters registry, native runtime, storage, secrets providers, execution
// workspaces, tool gateway). This step bundles worker/index.ts with an esbuild
// plugin that redirects those exact source files to shims under worker/shims,
// then hands the result to wrangler, which still applies nodejs_compat
// polyfills and uploads it. server/src is never edited.
//
// Usage (from server/): node worker/build.mjs
import * as esbuild from "esbuild";
import { fileURLToPath } from "node:url";
import { dirname, resolve, sep } from "node:path";
import { HUBS } from "./scripts/gen-hub-stubs.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const serverDir = resolve(here, "..");
const srcDir = resolve(serverDir, "src") + sep;
const shim = (...p) => resolve(here, "shims", ...p);

// Real source file (absolute) → replacement. Only imports made from inside
// server/src are redirected; the shims themselves import real modules with
// explicit paths.
const redirects = new Map([[resolve(srcDir, "services/index.ts"), shim("services-index.ts")]]);
for (const [real, stub] of Object.entries(HUBS)) redirects.set(resolve(srcDir, real), shim("hubs", stub));
redirects.set(resolve(srcDir, "instrumentation.ts"), shim("instrumentation.ts"));
// Module-load Node work (createRequire(import.meta.url), git describe, build stamps on disk).
for (const f of ["version.ts", "build-commit.ts", "build-version.ts"]) redirects.set(resolve(srcDir, f), shim(f));

const paperclipRedirects = {
  name: "paperclip-src-redirects",
  setup(build) {
    build.onResolve({ filter: /^\.\.?\// }, (args) => {
      if (!args.importer.startsWith(srcDir)) return null;
      const target = resolve(args.resolveDir, args.path).replace(/\.js$/, ".ts");
      const to = redirects.get(target);
      return to ? { path: to } : null;
    });
  },
};

await esbuild.build({
  entryPoints: [resolve(here, "index.ts")],
  outfile: resolve(here, "dist", "index.mjs"),
  bundle: true,
  format: "esm",
  platform: "browser",
  target: "es2022",
  conditions: ["workerd", "worker", "browser"],
  mainFields: ["browser", "module", "main"],
  sourcemap: true,
  logLevel: "warning",
  // Provided by the workerd runtime (nodejs_compat) and by wrangler's own
  // bundling pass; keep them out of this bundle.
  external: [
    "node:*", "cloudflare:*",
    // bare builtin specifiers used by some third-party packages; workerd's nodejs_compat provides them
    "assert", "buffer", "events", "http", "http2", "https", "net", "os", "path", "stream", "stream/web", "string_decoder", "tls", "url", "util", "zlib", "crypto", "fs", "child_process", "worker_threads", "async_hooks", "dns", "readline", "process", "querystring", "timers", "timers/promises", "perf_hooks", "diagnostics_channel", "module", "v8", "vm", "tty", "constants",
  ],
  alias: {
    express: shim("express.ts"),
    multer: shim("multer.ts"),
    "pino-http": shim("pino-http.ts"),
    "@paperclipai/db": shim("paperclip-db.ts"),
  },
  define: {
    // server/src/middleware/logger.ts reads this at module load; the
    // production branch never calls pino.transport (absent in the pino build
    // selected for Workers). A runtime var is not visible at module load.
    "process.env.NODE_ENV": JSON.stringify("production"),
  },
  plugins: [paperclipRedirects],
});
