import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import * as schema from "@paperclipai/db/schema/index";
import type { Db } from "@paperclipai/db";

export function createWorkerDb(connectionString: string): Db {
  const client = postgres(connectionString, {
    max: 1,
    prepare: false,
  });

  return drizzle(client, { schema }) as Db;
}
