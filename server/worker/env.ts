import type { Hyperdrive } from "@cloudflare/workers-types";

export interface Env {
  HYPERDRIVE: Hyperdrive;
  /** Static UI (ui/dist) — see `assets` in wrangler.jsonc. */
  ASSETS: Fetcher;
  /** One of `DEPLOYMENT_MODES` from `@paperclipai/shared`. Defaults to `local_trusted`. */
  PAPERCLIP_DEPLOYMENT_MODE?: string;
  /** better-auth (authenticated mode). */
  BETTER_AUTH_SECRET?: string;
  BETTER_AUTH_TRUSTED_ORIGINS?: string;
  PAPERCLIP_PUBLIC_URL?: string;
  PAPERCLIP_AUTH_DISABLE_SIGNUP?: string;
}
