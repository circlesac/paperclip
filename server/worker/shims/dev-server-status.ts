/**
 * Bundle-time replacement for server/src/dev-server-status.ts. The dev-server
 * watcher persists its status to disk on Node; the Worker has no dev server,
 * which is what a production Node install reports too (no persisted status →
 * the health route omits `devServer`).
 */
export function readPersistedDevServerStatus(..._args: unknown[]): null {
  return null;
}
function unavailable(name: string): never {
  throw new Error(`dev-server-status.${name} is not available on the Cloudflare Worker yet`);
}
export const toDevServerHealthStatus = (..._a: unknown[]) => unavailable("toDevServerHealthStatus");
export const getDevServerRestartRequestFilePath = (..._a: unknown[]) => unavailable("getDevServerRestartRequestFilePath");
export const writeDevServerRestartRequest = (..._a: unknown[]) => unavailable("writeDevServerRestartRequest");
export const readDevServerRestartRequest = (..._a: unknown[]) => unavailable("readDevServerRestartRequest");
export const removeDevServerRestartRequest = (..._a: unknown[]) => unavailable("removeDevServerRestartRequest");
export type { DevServerHealthStatus, PersistedDevServerStatus } from "../../src/dev-server-status.js";
