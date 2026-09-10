import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import * as schema from "./shims/paperclip-db.js";
import type { Db } from "./shims/paperclip-db.js";

export function createWorkerDb(connectionString: string): Db {
  const client = postgres(connectionString, {
    max: 1,
    prepare: false,
  });

  return drizzle(client, { schema }) as Db;
}
