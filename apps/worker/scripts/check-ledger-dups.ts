/**
 * Truoc khi them rang buoc UNIQUE vao credit_ledger, phai chac DB HIEN TAI
 * khong co dong trung — neu co, lenh tao index se fail giua chung.
 * Cung cho biet loi cong tien 2 lan da thuc su xay ra hay chua.
 */
import { createDb } from "@dichvideo/db";
import { sql } from "drizzle-orm";

async function main() {
  const db = createDb(process.env.DATABASE_URL!);

  const dups = await db.execute(sql`
    SELECT ref_type, ref_id, reason, count(*) AS n, sum(delta) AS tong_delta
    FROM credit_ledger
    WHERE ref_type IS NOT NULL AND ref_id IS NOT NULL
    GROUP BY ref_type, ref_id, reason
    HAVING count(*) > 1
    ORDER BY n DESC
    LIMIT 50
  `);
  const rows = (dups as unknown as { rows?: unknown[] }).rows ?? (dups as unknown[]);

  console.log(`Nhom TRUNG LAP (ref_type, ref_id, reason): ${rows.length}`);
  for (const r of rows) console.log("  ", r);

  const tot = await db.execute(sql`SELECT count(*) AS n FROM credit_ledger`);
  const totRows = (tot as unknown as { rows?: unknown[] }).rows ?? (tot as unknown[]);
  console.log("Tong dong ledger:", totRows[0]);

  // rieng nap tien that — day la cho mat tien neu bi cong 2 lan
  const topup = await db.execute(sql`
    SELECT count(*) AS so_nhom, coalesce(sum(n - 1), 0) AS so_dong_thua
    FROM (
      SELECT count(*) AS n FROM credit_ledger
      WHERE ref_type = 'sepay_tx' GROUP BY ref_id HAVING count(*) > 1
    ) t
  `);
  const topupRows = (topup as unknown as { rows?: unknown[] }).rows ?? (topup as unknown[]);
  console.log("Nap tien SePay bi trung:", topupRows[0]);

  if (rows.length === 0) console.log("\n=> SACH, tao duoc UNIQUE index");
  else console.log("\n=> CO TRUNG LAP, phai don truoc khi tao index");
}

void main();
