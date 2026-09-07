import { createHash, randomUUID } from "node:crypto";
import type {
  NativeExecutionInput,
  PersistedNativeSession,
} from "../../vendor/paperclip-runner/index.js";
import { parseNativeExecutionInput } from "../../vendor/paperclip-runner/index.js";

export type NativeToolExecutionTargetKind = "local" | "remote";

/**
 * Persisted provider threads retain their dynamic-tool declarations. This
 * fingerprint is part of checkpoint compatibility and must change whenever
 * the server-authorized native tool definitions or advertisement policy
 * changes. The execution target is included because register_deliverable is
 * intentionally absent for remote workspaces.
 */
export function nativeToolContractFingerprintForTarget(
  executionTargetKind: NativeToolExecutionTargetKind,
): string {
  return `sha256:${createHash("sha256")
    .update(
      JSON.stringify({
        schema: "paperclip.native-tool-contract.v3",
        executionTargetKind,
        advertisementPolicy: {
          // Direct provider threads retain declarations from thread/start.
          // Keep this explicit so changing a tool from conditional to stable
          // advertisement rotates checkpoints even when its schema is unchanged.
          readCurrentWakeComments: "always_advertised_binding_gated.v1",
          historicalChatAttachments:
            "always_advertised_conversation_binding_gated.v1",
          registerDeliverable: "local_workspace_only.v1",
        },
        tools: [
          ...(executionTargetKind === "local"
            ? [{ name: "register_deliverable", version: 1 }]
            : []),
          {
            name: "read_current_wake_comments",
            semanticContract: "paperclip.server-current-wake-comments.v1",
            version: 1,
          },
          {
            name: "list_chat_attachments",
            semanticContract: "paperclip.server-chat-attachment-reuse.v1",
            version: 1,
          },
          {
            name: "reuse_chat_attachment",
            semanticContract: "paperclip.server-chat-attachment-reuse.v1",
            version: 1,
          },
        ],
      }),
    )
    .digest("hex")}`;
}

/** Default local-target fingerprint retained for callers and test fixtures. */
export const NATIVE_TOOL_CONTRACT_FINGERPRINT =
  nativeToolContractFingerprintForTarget("local");

function record(value: unknown): Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
}

export function isNativeSessionId(value: unknown): value is string {
  return typeof value === "string"
    && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

const LEGACY_RETRY_SOURCE_TERMINAL_STATUSES = new Set([
  "succeeded",
  "interrupted",
  "failed",
  "cancelled",
  "timed_out",
]);

/**
 * Legacy compatibility is deliberately narrower than ordinary task-session
 * continuation: only a replacement row that never acquired any native process
 * or provider authority may be rebound to a terminal native source. The exact
 * checkpoint/session/workspace/provider binding is validated separately by
 * rebindNativeSessionCheckpoint.
 */
export function isUnusedLegacyNativeRetryReplacement(input: {
  replacement: {
    processPid: number | null;
    processGroupId: number | null;
    processStartedAt: Date | null;
    runnerProfileJson: unknown;
  };
  source: {
    runtimeMode: string | null;
    status: string;
    nativeSessionId: string | null;
  } | null;
  hasProviderEvents: boolean;
}): boolean {
  const replacementProfile = record(input.replacement.runnerProfileJson);
  return Boolean(
    input.source?.runtimeMode === "native" &&
      LEGACY_RETRY_SOURCE_TERMINAL_STATUSES.has(input.source.status) &&
      isNativeSessionId(input.source.nativeSessionId) &&
      input.replacement.processPid === null &&
      input.replacement.processGroupId === null &&
      input.replacement.processStartedAt === null &&
      replacementProfile.sessionCheckpoint == null &&
      !input.hasProviderEvents,
  );
}

function sameProvider(
  previous: NativeExecutionInput["provider"],
  current: NativeExecutionInput["provider"],
): boolean {
  return JSON.stringify(previous) === JSON.stringify(current);
}

function nativeCheckpointWorkspaceScope(
  execution: NativeExecutionInput,
  owningRunId: string,
) {
  // Projectless work uses each heartbeat run id as a placeholder workspace id.
  // Continuity is safe only when both sides independently prove that shape and
  // their complete immutable workspace descriptors match. A real managed
  // workspace instead binds continuity to its durable workspace row id.
  return execution.binding.executionWorkspaceId === owningRunId
    ? {
        kind: "transient" as const,
        cwd: execution.workspace.cwd,
        repoUrl: execution.workspace.repoUrl,
        repoRef: execution.workspace.repoRef,
        branchName: execution.workspace.branchName,
      }
    : {
        kind: "managed" as const,
        id: execution.binding.executionWorkspaceId,
      };
}

function sameWorkspaceScope(input: {
  previousExecution: NativeExecutionInput;
  previousRunId: string;
  currentExecution: NativeExecutionInput;
}): boolean {
  return JSON.stringify(
    nativeCheckpointWorkspaceScope(
      input.previousExecution,
      input.previousRunId,
    ),
  ) === JSON.stringify(
    nativeCheckpointWorkspaceScope(
      input.currentExecution,
      input.currentExecution.binding.runId,
    ),
  );
}

/** A resume delta is valid only if the provider checkpoint really can be used. */
export function buildNativeExecutionWithCheckpoint(input: {
  previousRun: Parameters<typeof rebindNativeSessionCheckpoint>[0]["previousRun"] | null;
  normalizedSessionId: string;
  executionTargetKind?: NativeToolExecutionTargetKind;
  buildExecution: (options: {
    normalizedSessionId: string;
    resumedSession: boolean;
  }) => NativeExecutionInput;
}): {
  execution: NativeExecutionInput;
  checkpoint: PersistedNativeSession | null;
  normalizedSessionId: string;
} {
  const execution = input.buildExecution({
    normalizedSessionId: input.normalizedSessionId,
    resumedSession: input.previousRun !== null,
  });
  if (!input.previousRun) return { execution, checkpoint: null, normalizedSessionId: input.normalizedSessionId };
  const checkpoint = rebindNativeSessionCheckpoint({
    previousRun: input.previousRun,
    currentExecution: execution,
    executionTargetKind: input.executionTargetKind,
  });
  if (checkpoint) return { execution, checkpoint, normalizedSessionId: input.normalizedSessionId };
  // Rebuild both task context and wake instructions. Merely rotating the ID
  // leaves a fresh provider with a compact delta and missing task context.
  const normalizedSessionId = randomUUID();
  return {
    execution: input.buildExecution({
      normalizedSessionId,
      resumedSession: false,
    }),
    checkpoint: null,
    normalizedSessionId,
  };
}

/**
 * Rebind a completed prior run's provider checkpoint to a new heartbeat run.
 * The provider/driver session identity is retained, while every per-turn and
 * per-event field is reset so the new run starts one clean turn via resume.
 */
export function rebindNativeSessionCheckpoint(input: {
  previousRun: {
    id: string;
    companyId: string;
    agentId: string;
    nativeSessionId: string | null;
    runnerProfileJson: unknown;
  };
  currentExecution: NativeExecutionInput;
  executionTargetKind?: NativeToolExecutionTargetKind;
}): PersistedNativeSession | null {
  const previousProfile = record(input.previousRun.runnerProfileJson);
  if (
    previousProfile.nativeToolContractFingerprint !==
    nativeToolContractFingerprintForTarget(
      input.executionTargetKind ?? "local",
    )
  ) {
    return null;
  }
  const rawCheckpoint = record(previousProfile.sessionCheckpoint);
  const checkpointIdentity = record(rawCheckpoint.identity);
  const current = input.currentExecution;
  const normalizedSessionId = current.session.normalizedSessionId;
  if (
    !isNativeSessionId(normalizedSessionId)
    || input.previousRun.companyId !== current.binding.companyId
    || input.previousRun.agentId !== current.binding.agentId
    || input.previousRun.nativeSessionId !== normalizedSessionId
    || typeof rawCheckpoint.sessionId !== "string"
    || checkpointIdentity.runId !== input.previousRun.id
    || checkpointIdentity.companyId !== current.binding.companyId
    || checkpointIdentity.issueId !== current.binding.issueId
    || checkpointIdentity.agentId !== current.binding.agentId
    || checkpointIdentity.sessionId !== normalizedSessionId
  ) return null;

  let previousExecution: NativeExecutionInput;
  try {
    previousExecution = parseNativeExecutionInput(previousProfile.nativeExecutionInput);
  } catch {
    return null;
  }
  if (
    previousExecution.binding.runId !== input.previousRun.id
    || previousExecution.binding.companyId !== current.binding.companyId
    || previousExecution.binding.issueId !== current.binding.issueId
    || previousExecution.binding.agentId !== current.binding.agentId
    || previousExecution.session.normalizedSessionId !== normalizedSessionId
    || previousExecution.session.driverKind !== current.session.driverKind
    || !sameWorkspaceScope({
      previousExecution,
      previousRunId: input.previousRun.id,
      currentExecution: current,
    })
    || previousExecution.task.workMode !== current.task.workMode
    || ("executionMode" in previousExecution ? previousExecution.executionMode : "default")
      !== ("executionMode" in current ? current.executionMode : "default")
    || !sameProvider(previousExecution.provider, current.provider)
    || previousExecution.schema !== current.schema
    || ("runtimeContext" in previousExecution && "runtimeContext" in current
      && previousExecution.runtimeContext.aggregateDigest !== current.runtimeContext.aggregateDigest)
  ) return null;

  const priorSemanticResult = record(rawCheckpoint.semanticResult);
  const priorContinuation = record(priorSemanticResult.continuation);
  const providerRecoveryPolicy =
    priorSemanticResult.reportedWorkDisposition === "yielded"
    && priorContinuation.kind === "response_wake"
      ? "allow_replacement_after_governed_wait" as const
      : "allow_replacement_after_resume_failure" as const;

  return {
    ...(structuredClone(rawCheckpoint) as unknown as PersistedNativeSession),
    identity: {
      runId: current.binding.runId,
      sessionId: normalizedSessionId,
      companyId: current.binding.companyId,
      issueId: current.binding.issueId,
      agentId: current.binding.agentId,
    },
    cursor: null,
    semanticResult: null,
    terminal: null,
    activeTurnId: null,
    terminalTurns: [],
    pendingRuntimeRequests: [],
    providerRecoveryPolicy,
  };
}
