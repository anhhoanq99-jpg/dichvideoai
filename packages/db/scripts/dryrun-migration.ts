// Chay THU file migration 0002 tren DB PRODUCTION roi ROLLBACK.
// Muc dich: chung minh moi cau lenh la idempotent (khong no khi thu da ton tai).
// KHONG commit bat cu thay doi nao.
//
//   pnpm --filter @dichvideo/db db:dryrun
import { readFileSync } from "node:fs";
import path from "node:path";
import { Client } from "pg";

const FILE = path.resolve(import.meta.dirname, "../migrations/0002_drift_baseline.sql");

async function main() {
  const sqlText = readFileSync(FILE, "utf8");
  const statements = sqlText
    .split("--> statement-breakpoint")
    .map((s) => s.trim())
    .filter(Boolean);

  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();

  const v = await client.query("SELECT version()");
  console.log(v.rows[0].version.split(",")[0]);
  console.log(`\n${statements.length} cau lenh trong 0002_drift_baseline.sql\n`);

  await client.query("BEGIN");
  try {
    for (const [i, stmt] of statements.entries()) {
      const label = stmt.replace(/^--[^\n]*\n/gm, "").replace(/\s+/g, " ").slice(0, 78);
      await client.query(stmt);
      console.log(`  OK  #${i + 1}  ${label}`);
    }
    console.log("\nTAT CA CHAY DUOC (idempotent tren DB da co san).");
  } catch (err) {
    console.error("\nLOI:", (err as Error).message);
    process.exitCode = 1;
  } finally {
    await client.query("ROLLBACK");
    console.log("Da ROLLBACK — DB khong doi gi.");
    await client.end();
  }
}

void main();
