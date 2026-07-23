// Du bao chi phi API tu LUONG DA DUNG THAT, thay vi uoc luong chung chung.
//   cd apps/worker && npx tsx --env-file=../../.env scripts/check-cost-projection.ts
import { createDb } from "@dichvideo/db";
import { sql } from "drizzle-orm";

const rowsOf = (r: unknown) =>
  ((r as { rows?: Record<string, unknown>[] }).rows ?? (r as Record<string, unknown>[])) ?? [];

// Bang gia ai.google.dev/gemini-api/docs/pricing (USD / 1 trieu token)
const GIA = {
  "2.5-flash": { in: 0.3, out: 2.5 },
  "2.5-flash-lite": { in: 0.1, out: 0.4 },
  "3.5-flash": { in: 1.5, out: 9.0 },
} as const;

async function main() {
  const db = createDb(process.env.DATABASE_URL!);

  const g = rowsOf(
    await db.execute(sql`
      SELECT metric, sum(quantity) AS tong, count(DISTINCT job_id) AS so_job
      FROM usage_events WHERE provider = 'gemini' GROUP BY metric
    `),
  );
  const tokIn = Number(g.find((r) => r.metric === "tokens_in")?.tong ?? 0);
  const tokOut = Number(g.find((r) => r.metric === "tokens_out")?.tong ?? 0);
  const jobs = Number(g.find((r) => r.metric === "tokens_in")?.so_job ?? 1);

  const vids = Number(rowsOf(await db.execute(sql`SELECT count(*) AS n FROM videos`))[0]?.n ?? 1);
  const days = Number(
    rowsOf(
      await db.execute(sql`
        SELECT greatest(1, extract(day from now() - min(created_at))) AS n FROM videos
      `),
    )[0]?.n ?? 1,
  );

  console.log("=== Da dung THAT (Gemini) ===");
  console.log(`  token vao : ${tokIn.toLocaleString("vi-VN")}`);
  console.log(`  token ra  : ${tokOut.toLocaleString("vi-VN")}`);
  console.log(`  qua ${jobs} job Gemini / ${vids} video / ${days} ngay`);

  const inPerVid = tokIn / vids;
  const outPerVid = tokOut / vids;
  console.log(
    `\n  => moi video TB: ${Math.round(inPerVid).toLocaleString("vi-VN")} token vao, ${Math.round(outPerVid).toLocaleString("vi-VN")} token ra`,
  );

  console.log("\n=== Chi phi du bao theo muc dung (USD/thang) ===");
  console.log("  video/ngay   2.5-flash   flash-lite   3.5-flash");
  for (const perDay of [5, 20, 50, 100]) {
    const vidMonth = perDay * 30;
    const cols = (["2.5-flash", "2.5-flash-lite", "3.5-flash"] as const).map((m) => {
      const p = GIA[m];
      const usd = ((inPerVid * p.in + outPerVid * p.out) / 1_000_000) * vidMonth;
      return `$${usd.toFixed(2)}`.padStart(11);
    });
    console.log(`  ${String(perDay).padStart(10)}${cols.join("")}`);
  }

  console.log("\n(1 USD ~ 26.000 VND — nhan len de ra tien Viet)");
}

void main();
