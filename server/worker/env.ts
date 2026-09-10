import type { Hyperdrive } from "@cloudflare/workers-types";

export interface Env {
  HYPERDRIVE: Hyperdrive;
  /** One of `DEPLOYMENT_MODES` from `@paperclipai/shared`. Defaults to `local_trusted`. */
  PAPERCLIP_DEPLOYMENT_MODE?: string;
}
