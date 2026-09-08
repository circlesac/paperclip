import { createHash, randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import postgres from "postgres";
import { describe, expect, it } from "vitest";
import { applyPendingMigrations, inspectMigrations } from "./client.js";
import {
  EMBEDDED_POSTGRES_TEST_TIMEOUT_MS,
  getEmbeddedPostgresTestSupport,
  startEmbeddedPostgresTestDatabase,
} from "./test-embedded-postgres.js";

// The deployed chat branch used 0240–0249 before master added its independent
// 0240–0245 execution-identity chain. These are the exact original SQL hashes,
// not hashes of regenerated DDL: the interaction migration also repairs data
// and must never run again just because its filename moved.
const chatMigrations = [
  [
    "0246_previous_captain_america",
    "2cbd1eb88d3bf4c82b72fdfd78dce72ecd7899f85607a76fb7e40b2749fffa00",
    1788580015986,
  ],
  [
    "0247_married_king_cobra",
    "f352a8769496412df3be35050df02110714af3a189d92b3c2ac8d097e2612c7b",
    1788581746772,
  ],
  [
    "0248_bizarre_the_hunter",
    "4e4636a22fb06aac55a998a0c98d043ec70083c198c94a0f5e0a99f18a1debac",
    1788582768429,
  ],
  [
    "0249_typical_sauron",
    "f3cb8b9d3bb3691d98a830c7ba8b4f49bbe9bb01ce2e899583d0b5c9b84d423c",
    1788585030341,
  ],
  [
    "0250_tan_chat",
    "91012c36bfcf66615b537ce808c9cb2f1311bc6efa6aab3ed8afd0d01298af75",
    1788673647823,
  ],
  [
    "0251_chat_interaction_wakeup_idempotency",
    "5e181169a724173d17865d537bd84c385e97e6f78e71aa795cad91734cd37ea0",
    1788688205087,
  ],
  [
    "0252_faulty_iceman",
    "dd7a7571e080471148cff98d1138ddd046e8c1e3c256fa5bc11564d5f4766c28",
    1788704871875,
  ],
  [
    "0253_lying_avengers",
    "59909e4edae56117c7fe0af28aa10fe30a64d151e83fe6e06debcec90658ff09",
    1788708784607,
  ],
  [
    "0254_nebulous_iron_lad",
    "858eb11c0863e361c1ae6995e78ca365f8002e35dcb1e89dbcc8bf65dea879e3",
    1788714691806,
  ],
  [
    "0255_cynical_hellcat",
    "d9aeacc58ae3c52d34bf50f8ea38f55435a6f8f66dc6ee87d3b78e105a86602a",
    1788793844054,
  ],
] as const;

const identityMigrations = [
  "0240_pink_fantastic_four.sql",
  "0241_conscious_adam_destine.sql",
  "0242_wide_lightspeed.sql",
  "0243_sleepy_metal_master.sql",
  "0244_organic_meltdown.sql",
  "0245_misty_nightshade.sql",
];

async function migrationHash(file: string) {
  const content = await readFile(
    new URL(`./migrations/${file}`, import.meta.url),
  );
  return createHash("sha256").update(content).digest("hex");
}

describe("chat and execution identity migration reconciliation", () => {
  it("preserves all ten deployed chat SQL hashes after renumbering", async () => {
    for (const [tag, hash] of chatMigrations) {
      expect(await migrationHash(`${tag}.sql`), tag).toBe(hash);
    }
  });

  it("keeps canonical identity history in every regenerated chat checkpoint", async () => {
    const journal = JSON.parse(
      await readFile(
        new URL("./migrations/meta/_journal.json", import.meta.url),
        "utf8",
      ),
    );
    expect(
      journal.entries
        .filter(
          (entry: { idx: number }) => entry.idx >= 240 && entry.idx <= 245,
        )
        .map((entry: { tag: string }) => `${entry.tag}.sql`),
    ).toEqual(identityMigrations);
    expect(
      journal.entries
        .filter(
          (entry: { idx: number }) => entry.idx >= 246 && entry.idx <= 255,
        )
        .map((entry: { tag: string }) => entry.tag),
    ).toEqual(chatMigrations.map(([tag]) => tag));
    let previous = JSON.parse(
      await readFile(
        new URL("./migrations/meta/0245_snapshot.json", import.meta.url),
        "utf8",
      ),
    );
    for (let step = 0; step < chatMigrations.length; step++) {
      const index = String(246 + step).padStart(4, "0");
      const current = JSON.parse(
        await readFile(
          new URL(`./migrations/meta/${index}_snapshot.json`, import.meta.url),
          "utf8",
        ),
      );
      expect(current.prevId, index).toBe(previous.id);
      expect(current.tables["public.run_identity_contexts"], index).toEqual(
        previous.tables["public.run_identity_contexts"],
      );
      expect(
        current.tables["public.heartbeat_runs"].columns
          .active_identity_context_id,
        index,
      ).toBeDefined();
      expect(
        current.tables["public.issues"].columns.origin_identity_context_id,
        index,
      ).toBeDefined();
      expect(
        current.tables["public.issues"].columns
          .continuation_identity_context_id,
        index,
      ).toBeDefined();
      expect(
        current.tables["public.issue_thread_interactions"].columns
          .source_identity_context_id,
        index,
      ).toBeDefined();
      expect(
        Boolean(
          current.tables["public.chat_conversations"].columns
            .session_generation,
        ),
        index,
      ).toBe(step >= 1);
      expect(
        Boolean(
          current.tables["public.chat_endpoints"].indexes
            .chat_endpoints_live_bot_external_uq,
        ),
        index,
      ).toBe(step >= 2);
      expect(
        current.tables[
          "public.chat_publications"
        ].checkConstraints.chat_publications_state_check.value.includes(
          "delivery_unknown",
        ),
        index,
      ).toBe(step >= 3);
      expect(
        current.tables["public.chat_endpoints"].columns.allow_group_chats
          .default,
        index,
      ).toBe(step < 4);
      expect(
        current.tables[
          "public.agent_wakeup_requests"
        ].indexes.agent_wakeup_requests_question_response_delivery_idempotency_uq.where.includes(
          "interaction:%",
        ),
        index,
      ).toBe(step >= 5);
      expect(
        current.tables[
          "public.chat_endpoints"
        ].checkConstraints.chat_endpoints_provider_check.value.includes(
          "discord",
        ),
        index,
      ).toBe(step >= 6);
      expect(
        Boolean(
          current.tables["public.chat_endpoints"].indexes
            .chat_endpoints_live_discord_bot_external_uq,
        ),
        index,
      ).toBe(step >= 7);
      expect(
        Boolean(
          current.tables["public.chat_endpoints"].indexes
            .chat_endpoints_live_global_app_bot_external_uq,
        ),
        index,
      ).toBe(step >= 8);
      expect(
        Boolean(
          current.tables["public.issue_attachments"].columns.originating_run_id,
        ),
        index,
      ).toBe(step >= 9);
      previous = current;
    }
  });
});

const support = await getEmbeddedPostgresTestSupport();
(support.supported ? describe : describe.skip)(
  "chat identity migration upgrade",
  () => {
    it(
      "migrates a fresh database and upgrades deployed chat history without replaying chat SQL",
      async () => {
        const database = await startEmbeddedPostgresTestDatabase(
          "paperclip-chat-identity-migration-",
        );
        const sql = postgres(database.connectionString, {
          max: 1,
          onnotice: () => {},
        });
        try {
          expect(
            (await inspectMigrations(database.connectionString)).status,
          ).toBe("upToDate");
          expect(
            (
              await sql`SELECT to_regclass('public.run_identity_contexts')::text AS identity, to_regclass('public.chat_publications')::text AS publications`
            )[0],
          ).toEqual({
            identity: "run_identity_contexts",
            publications: "chat_publications",
          });

          // Restore the schema/history shape of a deployed pre-identity chat DB.
          // This disposable database is owned solely by this test; no live fixture
          // is modified. Its already-applied chat SQL retains the original hashes
          // and timestamps, even though the checkout now uses new filenames.
          await sql`ALTER TABLE heartbeat_runs DROP COLUMN active_identity_context_id`;
          await sql`ALTER TABLE issues DROP COLUMN origin_identity_context_id, DROP COLUMN continuation_identity_context_id`;
          await sql`ALTER TABLE issue_thread_interactions DROP COLUMN source_identity_context_id`;
          await sql`DROP TABLE run_identity_contexts`;
          for (const file of identityMigrations) {
            await sql`DELETE FROM drizzle.__drizzle_migrations WHERE hash = ${await migrationHash(file)}`;
          }
          for (const [, hash, timestamp] of chatMigrations) {
            await sql`UPDATE drizzle.__drizzle_migrations SET created_at = ${timestamp} WHERE hash = ${hash}`;
          }

          const companyId = randomUUID(),
            agentId = randomUUID(),
            applicationId = randomUUID(),
            connectionId = randomUUID(),
            endpointId = randomUUID(),
            issueId = randomUUID(),
            conversationId = randomUUID(),
            publicationId = randomUUID();
          await sql`INSERT INTO companies (id,name,issue_prefix) VALUES (${companyId},'Chat upgrade','CUP')`;
          await sql`INSERT INTO agents (id,company_id,name) VALUES (${agentId},${companyId},'Chat agent')`;
          await sql`INSERT INTO tool_applications (id,company_id,name,type) VALUES (${applicationId},${companyId},'Slack','rest_api')`;
          await sql`INSERT INTO tool_connections (id,company_id,application_id,name,uid,connection_purpose,transport) VALUES (${connectionId},${companyId},${applicationId},'Slack','slack-upgrade','channel','chat_sdk')`;
          await sql`INSERT INTO chat_endpoints (id,company_id,connection_id,provider,public_id,assigned_agent_id) VALUES (${endpointId},${companyId},${connectionId},'slack',${randomUUID()},${agentId})`;
          await sql`INSERT INTO issues (id,company_id,title) VALUES (${issueId},${companyId},'Existing chat task')`;
          await sql`INSERT INTO chat_conversations (id,company_id,endpoint_id,issue_id,external_conversation_id,external_thread_id,external_label) VALUES (${conversationId},${companyId},${endpointId},${issueId},'CUPGRADE','slack:CUPGRADE:1700.1','Existing Slack thread')`;
          await sql`INSERT INTO chat_publications (id,company_id,endpoint_id,conversation_id,issue_id,idempotency_key,payload,state,attempts) VALUES (${publicationId},${companyId},${endpointId},${conversationId},${issueId},'existing-unknown-file','{"attachmentIds":["existing-attachment"]}'::jsonb,'delivery_unknown',1)`;
          const rowsBefore =
            await sql`SELECT row_to_json(p) AS row FROM chat_publications p WHERE id = ${publicationId}`;
          const historyBefore =
            await sql`SELECT id,hash,created_at::text FROM drizzle.__drizzle_migrations ORDER BY id`;
          expect(
            await inspectMigrations(database.connectionString),
          ).toMatchObject({
            status: "needsMigrations",
            pendingMigrations: identityMigrations,
          });

          await applyPendingMigrations(database.connectionString);
          expect(
            (await inspectMigrations(database.connectionString)).status,
          ).toBe("upToDate");
          expect(
            await sql`SELECT row_to_json(p) AS row FROM chat_publications p WHERE id = ${publicationId}`,
          ).toEqual(rowsBefore);
          expect(
            await sql`SELECT id,hash,created_at::text FROM drizzle.__drizzle_migrations WHERE id <= ${historyBefore.at(-1)!.id} ORDER BY id`,
          ).toEqual(historyBefore);
          expect(
            (
              await sql`SELECT count(*)::integer AS count FROM drizzle.__drizzle_migrations`
            )[0].count,
          ).toBe(historyBefore.length + identityMigrations.length);
          expect(
            (
              await sql`SELECT origin_identity_context_id,continuation_identity_context_id FROM issues WHERE id = ${issueId}`
            )[0],
          ).toEqual({
            origin_identity_context_id: null,
            continuation_identity_context_id: null,
          });
          const historyAfter =
            await sql`SELECT id,hash,created_at::text FROM drizzle.__drizzle_migrations ORDER BY id`;
          await applyPendingMigrations(database.connectionString);
          expect(
            await sql`SELECT id,hash,created_at::text FROM drizzle.__drizzle_migrations ORDER BY id`,
          ).toEqual(historyAfter);
        } finally {
          await sql.end();
          await database.cleanup();
        }
      },
      EMBEDDED_POSTGRES_TEST_TIMEOUT_MS,
    );
  },
);
