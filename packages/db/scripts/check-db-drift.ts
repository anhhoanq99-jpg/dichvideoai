// Doi chieu DB THAT vs lich su migration trong packages/db/migrations.
//
// Muc dich: biet chinh xac DB dang lech nhung gi truoc khi dung lai lich su
// migration (HANDOFF muc 5 + muc 6.5). CHI DOC, khong sua gi.
//
//   pnpm --filter @dichvideo/db db:drift
import { createDb } from "@dichvideo/db";
import { sql } from "drizzle-orm";

const rowsOf = (r: unknown) =>
  ((r as { rows?: Record<string, unknown>[] }).rows ?? (r as Record<string, unknown>[])) ?? [];

async function main() {
  const db = createDb(process.env.DATABASE_URL!);

  const tables = rowsOf(
    await db.execute(sql`
      SELECT table_name FROM information_schema.tables
      WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
      ORDER BY table_name
    `),
  ).map((r) => String(r.table_name));
  console.log("BANG trong DB (public):");
  console.log("  " + tables.join(", "));

  console.log("\nCOT cua videos:");
  const cols = rowsOf(
    await db.execute(sql`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'videos'
      ORDER BY ordinal_position
    `),
  );
  for (const c of cols) {
    console.log(`  ${c.column_name} : ${c.data_type} ${c.is_nullable === "NO" ? "NOT NULL" : ""}`);
  }

  console.log("\nENUM va gia tri:");
  const enums = rowsOf(
    await db.execute(sql`
      SELECT t.typname AS name, string_agg(e.enumlabel, ',' ORDER BY e.enumsortorder) AS vals
      FROM pg_type t
      JOIN pg_enum e ON e.enumtypid = t.oid
      JOIN pg_namespace n ON n.oid = t.typnamespace
      WHERE n.nspname = 'public'
      GROUP BY t.typname ORDER BY t.typname
    `),
  );
  for (const e of enums) console.log(`  ${e.name} = ${e.vals}`);

  console.log("\nINDEX (khong tinh primary key):");
  const idx = rowsOf(
    await db.execute(sql`
      SELECT tablename, indexname FROM pg_indexes
      WHERE schemaname = 'public' AND indexname NOT LIKE '%_pkey'
      ORDER BY tablename, indexname
    `),
  );
  for (const i of idx) console.log(`  ${i.tablename}.${i.indexname}`);

  console.log("\nBANG THEO DOI MIGRATION cua drizzle:");
  const hasDrizzleSchema = rowsOf(
    await db.execute(sql`SELECT 1 AS ok FROM information_schema.schemata WHERE schema_name = 'drizzle'`),
  ).length;
  if (!hasDrizzleSchema) {
    console.log("  KHONG CO schema 'drizzle' => drizzle-kit chua bao gio migrate len DB nay.");
    console.log("  => `drizzle-kit migrate` se chay LAI 0000 (CREATE TABLE) va HONG.");
  } else {
    const applied = rowsOf(
      await db.execute(sql`SELECT id, hash, created_at FROM drizzle.__drizzle_migrations ORDER BY id`),
    );
    console.log(`  Co ${applied.length} dong da ghi nhan:`);
    for (const a of applied) console.log(`   #${a.id} hash=${String(a.hash).slice(0, 12)}… at=${a.created_at}`);
  }
}

void main();
