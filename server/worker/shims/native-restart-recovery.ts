/**
 * Bundle-time replacement for server/src/services/native-runtime/native-restart-recovery.ts.
 *
 * The real module runs `randomUUID()` at module load (a controller boot id),
 * which workerd forbids at global scope, and the rest of it drives native
 * runner recovery that does not exist on the Worker. The health route only
 * needs `nativeRestartRecoverySummary`, a plain aggregate over
 * native_run_finalizations; it is reproduced here verbatim so /api/health
 * reports the same numbers as Node. Everything else throws on use.
 */
import { inArray, sql } from "drizzle-orm";
import type { Db } from "./paperclip-db.js";
import { nativeRunFinalizations } from "./paperclip-db.js";

export async function nativeRestartRecoverySummary(db: Db) {
  const rows = await db
    .select({
      state: nativeRunFinalizations.recoveryState,
      count: sql<number>`count(*)::int`,
    })
    .from(nativeRunFinalizations)
    .where(
      inArray(nativeRunFinalizations.recoveryState, [
        "awaiting_evidence",
        "awaiting_runner_reattach",
        "resuming_session",
        "bootstrap_incomplete",
        "blocked",
      ]),
    )
    .groupBy(nativeRunFinalizations.recoveryState);
  return Object.fromEntries(rows.map((row) => [row.state ?? "unknown", row.count]));
}

function unavailable(name: string): never {
  throw new Error(`services/native-runtime/native-restart-recovery.${name} is not available on the Cloudflare Worker yet`);
}
export const nextNativeProviderAttempt = (..._a: unknown[]) => unavailable("nextNativeProviderAttempt");
export const currentNativeControllerIdentity = (..._a: unknown[]) => unavailable("currentNativeControllerIdentity");
export const evaluateNativeControllerTakeover = (..._a: unknown[]) => unavailable("evaluateNativeControllerTakeover");
export const evaluateNativeProviderProcesses = (..._a: unknown[]) => unavailable("evaluateNativeProviderProcesses");
export const classifyNativeRunnerRecoveryEvidence = (..._a: unknown[]) => unavailable("classifyNativeRunnerRecoveryEvidence");
export const claimNativeRestartRecoveries = (..._a: unknown[]) => unavailable("claimNativeRestartRecoveries");
export type {
  NativeControllerIdentity, NativeRestartKind, NativeRestartRecoveryClaim,
  NativeRestartRecoveryDisposition, NativeProviderProcessIdentity,
} from "../../src/services/native-runtime/native-restart-recovery.js";
