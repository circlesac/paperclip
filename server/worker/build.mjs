// Pre-bundle for the Cloudflare Worker.
//
// wrangler can alias bare module names (see wrangler.jsonc) but not relative
// imports, and 33 route modules import "../services/index.js" — a barrel that
// re-exports the whole execution plane. This step bundles worker/index.ts with
// an esbuild plugin that swaps that barrel for worker/shims/services-index.ts,
// then hands the result to wrangler, which still applies nodejs_compat
// polyfills and uploads it. server/src is never edited.
//
// Usage (from server/): node worker/build.mjs
import * as esbuild from "esbuild";
import { fileURLToPath } from "node:url";
import { dirname, resolve, sep } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const serverDir = resolve(here, "..");
const srcDir = resolve(serverDir, "src") + sep;
const shim = (name) => resolve(here, "shims", name);

const servicesBarrel = {
  name: "paperclip-services-barrel",
  setup(build) {
    // Only imports written inside server/src are redirected; the shim itself
    // re-exports from the real service modules with explicit paths.
    build.onResolve({ filter: /(^|\/)services\/index\.js$/ }, (args) => {
      if (!args.importer.startsWith(srcDir)) return null;
      return { path: shim("services-index.ts") };
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
  external: ["node:*", "cloudflare:*"],
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
  plugins: [servicesBarrel],
});
