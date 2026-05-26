import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "./schema";

export * from "./schema";
export { and, desc, eq, isNotNull } from "drizzle-orm";

let pool: pg.Pool | undefined;

export function getPool() {
  pool ??= new pg.Pool({
    connectionString: process.env.DATABASE_URL
  });
  return pool;
}

export function getDb() {
  return drizzle(getPool(), { schema });
}

export type MusterDb = ReturnType<typeof getDb>;
