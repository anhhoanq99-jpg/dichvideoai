import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";

export * from "./schema";
export * from "./credits";
export { schema };

export type Db = ReturnType<typeof createDb>;

let pool: Pool | undefined;

/**
 * Singleton DB client. Both web (server) and worker call this;
 * Next.js dev hot-reload reuses the pool via the module-level cache.
 */
export function createDb(databaseUrl?: string) {
  const url = databaseUrl ?? process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set");
  pool ??= new Pool({ connectionString: url, max: 10 });
  return drizzle(pool, { schema });
}
