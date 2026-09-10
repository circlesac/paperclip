/**
 * Bundle-time replacement for server/src/instrumentation.ts (see worker/build.mjs).
 *
 * The real module wires OpenTelemetry (gRPC/HTTP exporters, `@cursor/sdk`,
 * `node:child_process` for `git rev-parse`) and drags ~200 Node-only modules
 * into the bundle. The Worker has no tracer; the informational helpers return
 * "unknown" values and the startup-tracer helpers throw if anything calls them.
 */
export interface StartupTraceContextHandle { end(): void }
export interface ParsedTraceparent { traceId: string; spanId: string; sampled: boolean }

function unavailable(name: string): never {
  throw new Error(`instrumentation.${name} is not available on the Cloudflare Worker yet`);
}

export const instrumentationReady: Promise<void> = Promise.resolve();
export function getStartupTracer(): never { return unavailable("getStartupTracer"); }
export function getStartupTraceContext(): never { return unavailable("getStartupTraceContext"); }
export function traceparentFromContextToken(_token: unknown): ParsedTraceparent | null { return null; }
export function recordProviderPluginSpan(..._args: unknown[]): void {}
export async function shutdownInstrumentation(): Promise<void> {}
export function resolveProtocol(..._args: unknown[]): string | null { return null; }
export function readBuildStamp(..._args: unknown[]): null { return null; }
export function readGitCommit(..._args: unknown[]): null { return null; }
export function resolveServiceVersion(..._args: unknown[]): string { return "cloudflare-worker"; }
