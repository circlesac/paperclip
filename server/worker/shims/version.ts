/**
 * Bundle-time replacement for server/src/version.ts (see worker/build.mjs).
 * The real module reads package.json through createRequire(import.meta.url) and
 * runs `git describe` at module load; none of that exists on Workers.
 */
export function parseGitDescribeVersion(_output: string): string | null { return null; }
export function resolveServerVersion(..._args: unknown[]): string { return "cloudflare-worker"; }
export const serverVersion = "cloudflare-worker";
