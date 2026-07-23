// Thu TAN CONG that vao 2 lo hong tien bac vua va, tren DB that.
// Khong tin vao viec "code trong co ve dung" — phai thay no chan.
//
//   cd apps/worker && npx tsx --env-file=../../.env scripts/check-money-fixes.ts
import { applyCreditDelta, createDb, schema } from "@dichvideo/db";
import { hasWideTtsQuota } from "@dichvideo/shared";
import { eq, sql } from "drizzle-orm";

const rowsOf = (r: unknown) =>
  ((r as { rows?: Record<string, unknown>[] }).rows ?? (r as Record<string, unknown>[])) ?? [];

async function main() {
  const db = createDb(process.env.DATABASE_URL!);
  let bad = 0;

  // ---- 1. webhook SePay cong tien 2 lan ----
  const [u] = await db.select({ id: schema.user.id, bal: schema.user.creditBalance })
    .from(schema.user).limit(1);
  if (!u) {
    console.log("Khong co user nao de thu — bo qua phan webhook");
  } else {
    const refId = `TEST-DUP-${u.id.slice(0, 6)}`;
    // don du lieu thu cu neu con
    await db.execute(sql`DELETE FROM credit_ledger WHERE ref_type = 'sepay_tx' AND ref_id = ${refId}`);
    const before = u.bal;

    // hai webhook giong het nhau ap toi CUNG LUC (dung canh SePay retry)
    const [a, b] = await Promise.allSettled([
      applyCreditDelta(db, { userId: u.id, delta: 1000, reason: "topup", refType: "sepay_tx", refId }),
      applyCreditDelta(db, { userId: u.id, delta: 1000, reason: "topup", refType: "sepay_tx", refId }),
    ]);
    const applied = [a, b].filter((r) => r.status === "fulfilled" && r.value !== null).length;

    const [after] = await db.select({ bal: schema.user.creditBalance })
      .from(schema.user).where(eq(schema.user.id, u.id));
    const cong = (after?.bal ?? 0) - before;
    const rows = await db.execute(
      sql`SELECT count(*) AS n FROM credit_ledger WHERE ref_type = 'sepay_tx' AND ref_id = ${refId}`);
    const soDong = Number(rowsOf(rows)[0]?.n ?? 0);

    const ok = applied === 1 && cong === 1000 && soDong === 1;
    if (!ok) bad++;
    console.log(
      `${ok ? "OK " : "LOI"} webhook trung: ${applied} lan cong that, so du +${cong}, ${soDong} dong ledger` +
      `  (dung: 1 / +1000 / 1)`);

    // tra lai nguyen trang
    await db.execute(sql`DELETE FROM credit_ledger WHERE ref_type = 'sepay_tx' AND ref_id = ${refId}`);
    await db.update(schema.user).set({ creditBalance: before }).where(eq(schema.user.id, u.id));
  }

  // ---- 2. charge + refund cua CUNG job khong duoc dam nhau ----
  // (rang buoc co ca `reason` chinh la de cho nay van chay)
  if (u) {
    const jobRef = `TEST-JOB-${u.id.slice(0, 6)}`;
    await db.execute(sql`DELETE FROM credit_ledger WHERE ref_type = 'job' AND ref_id = ${jobRef}`);
    const charge = await applyCreditDelta(db, {
      userId: u.id, delta: -500, reason: "job_charge", refType: "job", refId: jobRef });
    const refund = await applyCreditDelta(db, {
      userId: u.id, delta: 500, reason: "job_refund", refType: "job", refId: jobRef });
    const ok = charge !== null && refund !== null;
    if (!ok) bad++;
    console.log(`${ok ? "OK " : "LOI"} charge+refund cung job deu ghi duoc (rang buoc khong chan nham hoan xu)`);
    await db.execute(sql`DELETE FROM credit_ledger WHERE ref_type = 'job' AND ref_id = ${jobRef}`);
  }

  // ---- 3. TTS tra phi khong con dung mien phi ----
  const cases: [string, boolean][] = [
    ["eleven:pNInz6obpgDQGcFmaJgB", false],
    ["gemini:Kore", false],
    ["gcloud:vi-VN-Chirp3-HD-Aoede", true],
    ["vi-VN-HoaiMyNeural", true],
  ];
  for (const [id, expect] of cases) {
    const got = hasWideTtsQuota(id);
    if (got !== expect) bad++;
    console.log(`${got === expect ? "OK " : "LOI"} hasWideTtsQuota(${id}) = ${got} (mong doi ${expect})`);
  }

  console.log(bad === 0 ? "\nTAT CA DA DUOC CHAN" : `\n${bad} truong hop CHUA DUNG`);
  if (bad > 0) process.exitCode = 1;
}

void main();
