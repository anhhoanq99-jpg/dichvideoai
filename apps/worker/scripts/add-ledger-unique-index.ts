// Them UNIQUE (ref_type, ref_id, reason) cho credit_ledger.
//
// Chay tay chu khong qua drizzle-kit migrate: lich su migration cua repo da lech
// (chat_messages / community_* / cloned_voices duoc dua len bang push, khong co
// file migration), nen migrate se co tao lai bang da ton tai va hong DB that.
// Chi ap dung DUNG cau lenh can thiet, va idempotent.
//
// Rang buoc nay la thu duy nhat chan cong xu 2 lan khi SePay retry webhook.
//
//   cd apps/worker && npx tsx --env-file=../../.env scripts/add-ledger-unique-index.ts
import { createDb } from "@dichvideo/db";
import { sql } from "drizzle-orm";

const rowsOf = (r: unknown) =>
  ((r as { rows?: Record<string, unknown>[] }).rows ?? (r as Record<string, unknown>[])) ?? [];

async function main() {
  const db = createDb(process.env.DATABASE_URL!);

  // khong duoc tao index khi con dong trung — se fail giua chung
  const dups = await db.execute(sql`
    SELECT count(*) AS n FROM (
      SELECT 1 FROM credit_ledger
      WHERE ref_type IS NOT NULL AND ref_id IS NOT NULL
      GROUP BY ref_type, ref_id, reason HAVING count(*) > 1
    ) t
  `);
  const n = Number(rowsOf(dups)[0]?.n ?? 0);
  if (n > 0) {
    console.error(`DUNG LAI: con ${n} nhom trung lap, phai don truoc.`);
    process.exitCode = 1;
    return;
  }

  await db.execute(sql`
    CREATE UNIQUE INDEX IF NOT EXISTS "credit_ledger_ref_uidx"
    ON "credit_ledger" ("ref_type", "ref_id", "reason")
  `);

  const idx = await db.execute(sql`
    SELECT indexname FROM pg_indexes WHERE tablename = 'credit_ledger' ORDER BY indexname
  `);
  const names = rowsOf(idx).map((r) => r.indexname);
  console.log("Index tren credit_ledger:", names.join(", "));
  const ok = names.includes("credit_ledger_ref_uidx");
  console.log(ok ? "OK - rang buoc da co hieu luc" : "LOI - chua tao duoc index");
  if (!ok) process.exitCode = 1;
}

void main();
