/**
 * Bundle-time replacement for server/src/server-info.ts (see worker/build.mjs).
 * The real module shells out to git and reads build stamps. The Worker reports
 * a static snapshot: no git metadata, process start = isolate start.
 */
import type { ServerInfoSnapshot } from "../../src/server-info.js";

// Date is frozen at the epoch in workerd's global scope; take the time on first use.
let processStartedAt: string | null = null;

export function getServerInfoSnapshot(..._args: unknown[]): ServerInfoSnapshot {
  processStartedAt ??= new Date().toISOString();
  return {
    processStartedAt,
    git: { available: false },
  } as unknown as ServerInfoSnapshot;
}
