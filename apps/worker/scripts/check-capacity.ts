// Do NANG LUC XU LY THAT tu job da chay, de biet web chiu duoc bao nhieu khach.
//   cd apps/worker && npx tsx --env-file=../../.env scripts/check-capacity.ts
import { createDb } from "@dichvideo/db";
import { sql } from "drizzle-orm";

const rowsOf = (r: unknown) =>
  ((r as { rows?: Record<string, unknown>[] }).rows ?? (r as Record<string, unknown>[])) ?? [];

async function main() {
  const db = createDb(process.env.DATABASE_URL!);

  const perType = await db.execute(sql`
    SELECT j.type,
           count(*) AS so_job,
           round(avg(extract(epoch from (j.finished_at - j.started_at)))::numeric, 1) AS tb_giay,
           round(max(extract(epoch from (j.finished_at - j.started_at)))::numeric, 1) AS lau_nhat,
           round(avg(v.duration_sec)::numeric, 0) AS tb_do_dai_video
    FROM jobs j LEFT JOIN videos v ON v.id = j.video_id
    WHERE j.status = 'done' AND j.started_at IS NOT NULL AND j.finished_at IS NOT NULL
    GROUP BY j.type ORDER BY tb_giay DESC NULLS LAST
  `);
  console.log("=== Thoi gian xu ly THAT theo loai job ===");
  for (const r of rowsOf(perType)) {
    console.log(
      `  ${String(r.type).padEnd(10)} ${String(r.so_job).padStart(4)} job | TB ${String(r.tb_giay).padStart(7)}s | lau nhat ${String(r.lau_nhat).padStart(7)}s | video TB ${r.tb_do_dai_video ?? "-"}s`,
    );
  }

  const users = await db.execute(sql`
    SELECT count(*) AS tong,
           count(*) FILTER (WHERE created_at > now() - interval '7 days') AS moi_7_ngay
    FROM "user"
  `);
  const vids = await db.execute(sql`
    SELECT count(*) AS tong,
           count(*) FILTER (WHERE created_at > now() - interval '7 days') AS moi_7_ngay
    FROM videos
  `);
  console.log("\n=== Quy mo hien tai ===");
  console.log("  user :", rowsOf(users)[0]);
  console.log("  video:", rowsOf(vids)[0]);

  const paid = await db.execute(sql`
    SELECT count(*) AS so_lan_nap, coalesce(sum(delta), 0) AS tong_xu
    FROM credit_ledger WHERE reason = 'topup'
  `);
  console.log("  nap tien:", rowsOf(paid)[0]);
}

void main();
