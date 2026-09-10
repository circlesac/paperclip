import type { AgentApiKeyScope } from "@paperclipai/shared";

/**
 * The authenticated principal for one request. This is the same shape the
 * Express `Request.actor` augmentation has always carried; it lives here so
 * runtime-neutral code (the Cloudflare Worker, tests) can name it without
 * importing Express types.
 */
export type Actor = {
  type: "board" | "agent" | "none";
  userId?: string;
  userName?: string | null;
  userEmail?: string | null;
  agentId?: string;
  companyId?: string;
  companyIds?: string[];
  sessionId?: string | null;
  memberships?: Array<{
    companyId: string;
    membershipRole?: string | null;
    status?: string;
  }>;
  onBehalfOfMemberships?: Array<{
    companyId: string;
    membershipRole?: string | null;
    status?: string;
  }>;
  isInstanceAdmin?: boolean;
  keyId?: string;
  keyScope?: AgentApiKeyScope;
  runId?: string;
  onBehalfOfUserId?: string | null;
  identityContextId?: string | null;
  source?: "local_implicit" | "session" | "board_key" | "agent_key" | "agent_jwt" | "cloud_tenant" | "none";
};

/** Header access only. An Express `Request` satisfies this structurally. */
export interface CloudActorHeaderSource {
  header(name: string): string | undefined;
}

/**
 * Everything actor resolution reads from a request. An Express `Request`
 * satisfies this structurally; the Worker builds one from Hono's context.
 */
export interface ActorRequestSource extends CloudActorHeaderSource {
  method: string;
  path: string;
  originalUrl: string;
}
