// Bóc tách chi phí Gemini theo LOẠI JOB (ocr/translate…) để biết cái gì đốt tiền.
//   cd packages/db && pnpm exec tsx --env-file=../../.env scripts/gemini-cost-breakdown.ts
import { createDb } from "@dichvideo/db";
import { sql } from "drizzle-orm";

const rowsOf = (r: unknown) =>
  ((r as { rows?: Record<string, unknown>[] }).rows ?? (r as Record<string, unknown>[])) ?? [];

async function main() {
  const db = createDb(process.env.DATABASE_URL!);

  for (const [label, since] of [
    ["HÔM NAY", "date_trunc('day', now())"],
    ["7 NGÀY", "now() - interval '7 days'"],
  ] as const) {
    console.log(`\n===== ${label} — chi phí theo provider + loại job =====`);
    const rows = rowsOf(
      await db.execute(sql.raw(`
        SELECT ue.provider, j.type,
               sum(ue.quantity) FILTER (WHERE ue.metric='tokens_in')  AS tok_in,
               sum(ue.quantity) FILTER (WHERE ue.metric='tokens_out') AS tok_out,
               round(sum(ue.cost_usd_micros)/1000000.0, 4) AS usd
        FROM usage_events ue JOIN jobs j ON j.id = ue.job_id
        WHERE ue.created_at >= ${since}
        GROUP BY ue.provider, j.type
        ORDER BY usd DESC NULLS LAST
      `)),
    );
    for (const r of rows) {
      console.log(
        `  ${String(r.provider).padEnd(8)} ${String(r.type).padEnd(10)} in=${r.tok_in ?? 0} out=${r.tok_out ?? 0}  $${r.usd ?? 0}`,
      );
    }
    const vids = rowsOf(
      await db.execute(sql.raw(`SELECT count(*) n FROM videos WHERE created_at >= ${since}`)),
    );
    const gemUsd = rowsOf(
      await db.execute(sql.raw(`
        SELECT round(coalesce(sum(cost_usd_micros),0)/1000000.0, 4) usd
        FROM usage_events WHERE provider='gemini' AND created_at >= ${since}
      `)),
    );
    const n = Number(vids[0]?.n ?? 0);
    const usd = Number(gemUsd[0]?.usd ?? 0);
    console.log(`  → ${n} video · Gemini $${usd}${n ? ` · $${(usd / n).toFixed(4)}/video ≈ ${Math.round((usd / n) * 26000)}đ/video` : ""}`);
  }
}

void main();
