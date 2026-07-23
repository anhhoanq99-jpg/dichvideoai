// Liet ke ten rang buoc FK that trong DB — de viet migration idempotent cho dung ten.
//   pnpm --filter @dichvideo/db db:constraints
import { createDb } from "@dichvideo/db";
import { sql } from "drizzle-orm";

const rowsOf = (r: unknown) =>
  ((r as { rows?: Record<string, unknown>[] }).rows ?? (r as Record<string, unknown>[])) ?? [];

async function main() {
  const db = createDb(process.env.DATABASE_URL!);
  const fks = rowsOf(
    await db.execute(sql`
      SELECT c.conname AS name, c.conrelid::regclass::text AS tbl, pg_get_constraintdef(c.oid) AS def
      FROM pg_constraint c
      JOIN pg_namespace n ON n.oid = c.connamespace
      WHERE c.contype = 'f' AND n.nspname = 'public'
      ORDER BY tbl, name
    `),
  );
  for (const f of fks) console.log(`${f.tbl}: ${f.name}\n    ${f.def}`);
  console.log(`\nTong ${fks.length} khoa ngoai.`);
}

void main();
