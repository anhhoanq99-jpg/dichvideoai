// Chay DUNG truy van cua bang theo doi tieu thu, tren DB that.
// SQL viet tay ma chua chay thi khong the tin — nhat la phan `filter (where ...)`.
//   cd apps/worker && npx tsx --env-file=../../.env scripts/check-usage-query.ts
import { createDb } from "@dichvideo/db";
import { sql } from "drizzle-orm";

const rowsOf = (r: unknown) =>
  ((r as { rows?: Record<string, unknown>[] }).rows ?? (r as Record<string, unknown>[])) ?? [];

async function main() {
  const db = createDb(process.env.DATABASE_URL!);

  const res = await db.execute(sql`
    SELECT provider,
      count(*) FILTER (WHERE created_at >= date_trunc('day', now()) AND metric <> 'tokens_out') AS hom_nay,
      count(*) FILTER (WHERE created_at >= now() - interval '7 days'  AND metric <> 'tokens_out') AS d7,
      count(*) FILTER (WHERE created_at >= now() - interval '30 days' AND metric <> 'tokens_out') AS d30,
      coalesce(sum(cost_usd_micros) FILTER (WHERE created_at >= now() - interval '30 days'), 0) AS chi_phi_micros
    FROM usage_events
    GROUP BY provider
    ORDER BY d30 DESC
  `);

  const rows = rowsOf(res);
  console.log(`Nguon co du lieu: ${rows.length}\n`);
  console.log("nguon        hom_nay      7d     30d   chi phi 30d");
  for (const r of rows) {
    const usd = Number(r.chi_phi_micros) / 1e6;
    console.log(
      `${String(r.provider).padEnd(12)} ${String(r.hom_nay).padStart(7)} ${String(r.d7).padStart(7)} ${String(r.d30).padStart(7)}   $${usd.toFixed(4)}`,
    );
  }

  // doi chieu: so luot Gemini co khop so JOB dich khong (moi job dich ~5-11 luot)
  const cross = await db.execute(sql`
    SELECT count(*) AS so_dong, count(DISTINCT job_id) AS so_job
    FROM usage_events WHERE provider = 'gemini' AND metric = 'tokens_in'
  `);
  console.log("\nDoi chieu Gemini:", rowsOf(cross)[0]);

  const metrics = await db.execute(sql`
    SELECT provider, metric, count(*) AS n FROM usage_events
    GROUP BY provider, metric ORDER BY provider, metric
  `);
  console.log("\nCac metric dang duoc ghi:");
  for (const r of rowsOf(metrics)) {
    console.log(`  ${String(r.provider).padEnd(12)} ${String(r.metric).padEnd(12)} ${r.n}`);
  }
}

void main();
