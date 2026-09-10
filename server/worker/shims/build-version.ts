/** Bundle-time replacement for server/src/build-version.ts: no build stamp on Workers. */
export function parseBuildVersion(value: string | null | undefined): string | null {
  const v = typeof value === "string" ? value.trim() : "";
  return v.length > 0 ? v : null;
}
export function readBuildVersion(..._args: unknown[]): string | null { return null; }
