/**
 * Bundle-time replacement for server/src/services/workspace-readiness.ts.
 * The real module inspects seed markers on disk to decide whether this is a
 * managed workspace instance. The Worker is never one, which is also the
 * branch the health route takes on a plain Node install.
 */
import type { WorkspaceReadinessDeps } from "../../src/services/workspace-readiness.js";

export function isManagedWorkspaceInstance(..._args: unknown[]): boolean {
  return false;
}

export async function resolveWorkspaceReadiness(_deps: WorkspaceReadinessDeps): Promise<never> {
  throw new Error("services/workspace-readiness.resolveWorkspaceReadiness is not available on the Cloudflare Worker yet");
}

export function resolveWorkspaceSeedMarkerDir(..._args: unknown[]): string {
  throw new Error("services/workspace-readiness.resolveWorkspaceSeedMarkerDir is not available on the Cloudflare Worker yet");
}

export function resolveWorkspaceReadinessState(..._args: unknown[]): never {
  throw new Error("services/workspace-readiness.resolveWorkspaceReadinessState is not available on the Cloudflare Worker yet");
}

export function resetManagedWorkspaceInstanceCacheForTests(): void {}
