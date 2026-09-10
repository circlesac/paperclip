/**
 * Bundle-time replacement for `@paperclipai/db` (see `alias` in ../../wrangler.jsonc).
 *
 * The real barrel re-exports `client.ts`, which imports `node:fs` and
 * `embedded-postgres`; bundling it for Workers fails on the platform-specific
 * `@embedded-postgres/*` packages. Server modules that the Worker pulls in only
 * use the Drizzle schema tables and the `Db` type, so that is all this exposes.
 * `Db` is a type-only re-export and is erased at build time.
 */
export type { Db } from "../../../packages/db/src/client.js";
export { issueRelations } from "../../../packages/db/src/schema/issue_relations.js";
export { issueReferenceMentions } from "../../../packages/db/src/schema/issue_reference_mentions.js";
export * from "../../../packages/db/src/schema/index.js";
