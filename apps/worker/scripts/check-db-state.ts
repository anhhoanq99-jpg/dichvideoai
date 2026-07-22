/**
 * DB production da lech khoi lich su migration hay chua?
 * Phai biet truoc khi chay bat ky migration nao — chay nham la hong DB that.
 */
import { createDb } from "@dichvideo/db";
import { sql } from "drizzle-orm";

const rowsOf = (r: unknown) =>
  ((r as { rows?: Record<string, unknown>[] }).rows ?? (r as Record<string, unknown>[])) ?? [];

async function main() {
  const db = createDb(process.env.DATABASE_URL!);

  const tables = await db.execute(sql`
    SELECT table_name FROM information_schema.tables
    WHERE table_schema = 'public' ORDER BY table_name
  `);
  console.log("Bang dang co:", rowsOf(tables).map((r) => r.table_name).join(", "));

  const idx = await db.execute(sql`
    SELECT indexname FROM pg_indexes
    WHERE tablename = 'credit_ledger' ORDER BY indexname
  `);
  console.log("\nIndex tren credit_ledger:", rowsOf(idx).map((r) => r.indexname).join(", "));

  try {
    const mig = await db.execute(sql`
      SELECT hash, created_at FROM drizzle.__drizzle_migrations ORDER BY created_at
    `);
    console.log("\nMigration da chay:", rowsOf(mig).length);
    for (const m of rowsOf(mig)) console.log("  ", m.created_at, String(m.hash).slice(0, 16));
  } catch (e) {
    console.log("\nKhong doc duoc bang migration:", String(e).slice(0, 120));
  }

  const col = await db.execute(sql`
    SELECT column_name FROM information_schema.columns
    WHERE table_name = 'videos' AND column_name = 'target_lang'
  `);
  console.log("\nvideos.target_lang ton tai:", rowsOf(col).length > 0);
}

void main();
