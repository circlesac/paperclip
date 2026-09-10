/**
 * Barrel served to Cloudflare Workers bundles via the `workerd` / `worker`
 * export conditions in package.json. It exposes the Drizzle schema and the
 * `Db` type only. `./client.ts` (embedded Postgres, migrations, `node:fs`) is
 * Node-only and stays out of this graph; `Db` is a type-only re-export, so it
 * is erased at build time and does not pull `client.ts` in.
 */
export type { Db } from "./client.js";
export { issueRelations } from "./schema/issue_relations.js";
export { issueReferenceMentions } from "./schema/issue_reference_mentions.js";
export * from "./schema/index.js";
