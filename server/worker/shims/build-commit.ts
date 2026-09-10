/** Bundle-time replacement for server/src/build-commit.ts: no build stamp on Workers. */
export function parseBuildCommit(value: string | null | undefined): string | null {
  return typeof value === "string" && /^[0-9a-f]{40}$/i.test(value.trim()) ? value.trim().toLowerCase() : null;
}
export function readBuildCommit(..._args: unknown[]): string | null { return null; }
