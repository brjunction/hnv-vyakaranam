import "server-only";
import { neon } from "@neondatabase/serverless";
import { drizzle, type NeonHttpDatabase } from "drizzle-orm/neon-http";
import * as schema from "./schema";
import { env } from "@/lib/env";

export type DB = NeonHttpDatabase<typeof schema>;

let instance: DB | null = null;

/**
 * The Drizzle client (Neon HTTP driver). Throws if DATABASE_URL is not set —
 * callers that must keep working without a database check `isDbConfigured`
 * from lib/env first.
 *
 * neon-http has no interactive transactions: use `db.batch([...])` for
 * atomic multi-statement writes (docs/01-architecture.md §4).
 */
export function getDb(): DB {
  if (!env.DATABASE_URL) throw new Error("DATABASE_URL is not configured.");
  if (!instance) instance = drizzle({ client: neon(env.DATABASE_URL), schema });
  return instance;
}

export { schema };
