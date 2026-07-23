// KIEM CHUNG: chuoi migration 0000 -> 0001 -> 0002 co dung lai DUNG DB that khong?
//
// Cach lam: tao mot DATABASE TAM TRONG cung project Neon, chay drizzle migrate len do,
// roi so tung bang / cot / enum / index / khoa ngoai voi DB PRODUCTION. Xong thi XOA.
// KHONG dong cham gi vao DB production (chi doc metadata).
//
//   pnpm --filter @dichvideo/db db:verify-migrations
import path from "node:path";
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { Client, Pool } from "pg";

const TEMP_DB = "migration_selftest";

type Row = Record<string, string>;

/** Anh chup cau truc schema public — du de phat hien lech. */
async function snapshot(client: Client) {
  const q = async (text: string) => (await client.query(text)).rows as Row[];
  return {
    columns: await q(`
      SELECT table_name || '.' || column_name || ' ' || data_type
             || CASE WHEN is_nullable = 'NO' THEN ' NOT NULL' ELSE '' END
             || COALESCE(' DEFAULT ' || column_default, '') AS s
      FROM information_schema.columns
      WHERE table_schema = 'public'
      ORDER BY s
    `),
    enums: await q(`
      SELECT t.typname || ' = ' || string_agg(e.enumlabel, ',' ORDER BY e.enumsortorder) AS s
      FROM pg_type t
      JOIN pg_enum e ON e.enumtypid = t.oid
      JOIN pg_namespace n ON n.oid = t.typnamespace
      WHERE n.nspname = 'public'
      GROUP BY t.typname ORDER BY 1
    `),
    indexes: await q(`
      SELECT indexdef AS s FROM pg_indexes WHERE schemaname = 'public' ORDER BY s
    `),
    constraints: await q(`
      SELECT c.conrelid::regclass::text || ' ' || c.conname || ' ' || pg_get_constraintdef(c.oid) AS s
      FROM pg_constraint c
      JOIN pg_namespace n ON n.oid = c.connamespace
      WHERE n.nspname = 'public' AND c.contype IN ('f', 'p', 'u')
      ORDER BY 1
    `),
  };
}

function diff(name: string, prod: Row[], fresh: Row[]) {
  const a = new Set(prod.map((r) => r.s));
  const b = new Set(fresh.map((r) => r.s));
  const onlyProd = [...a].filter((s) => !b.has(s));
  const onlyFresh = [...b].filter((s) => !a.has(s));
  if (!onlyProd.length && !onlyFresh.length) {
    console.log(`  ${name.padEnd(12)} KHOP (${a.size} muc)`);
    return true;
  }
  console.log(`  ${name.padEnd(12)} LECH`);
  for (const s of onlyProd) console.log(`     chi co o PROD  : ${s}`);
  for (const s of onlyFresh) console.log(`     chi co o FRESH : ${s}`);
  return false;
}

async function main() {
  const url = new URL(process.env.DATABASE_URL!);
  const prodDbName = url.pathname.slice(1);
  if (prodDbName === TEMP_DB) throw new Error("DATABASE_URL dang tro vao DB tam!");

  const admin = new Client({ connectionString: url.toString() });
  await admin.connect();

  // Khong bao gio DROP mu — neu ten nay da ton tai, dung lai de nguoi kiem tra.
  const exists = await admin.query(`SELECT 1 FROM pg_database WHERE datname = $1`, [TEMP_DB]);
  if (exists.rowCount) {
    console.error(`DUNG LAI: DB "${TEMP_DB}" da ton tai. Kiem tra roi xoa tay truoc khi chay lai.`);
    await admin.end();
    process.exitCode = 1;
    return;
  }
  console.log(`Tao DB tam "${TEMP_DB}"...`);
  await admin.query(`CREATE DATABASE "${TEMP_DB}"`);

  const freshUrl = new URL(url.toString());
  freshUrl.pathname = `/${TEMP_DB}`;

  let ok = false;
  try {
    console.log("Chay drizzle migrate len DB tam (0000 -> 0001 -> 0002)...");
    const pool = new Pool({ connectionString: freshUrl.toString(), max: 2 });
    try {
      await migrate(drizzle(pool), {
        migrationsFolder: path.resolve(import.meta.dirname, "../migrations"),
      });
    } finally {
      await pool.end();
    }

    const freshClient = new Client({ connectionString: freshUrl.toString() });
    await freshClient.connect();
    console.log("\nSo sanh DB TAM vs DB PRODUCTION:");
    const [prodSnap, freshSnap] = [await snapshot(admin), await snapshot(freshClient)];
    await freshClient.end();

    ok =
      diff("cot", prodSnap.columns, freshSnap.columns) &&
      diff("enum", prodSnap.enums, freshSnap.enums) &&
      diff("index", prodSnap.indexes, freshSnap.indexes) &&
      diff("rang buoc", prodSnap.constraints, freshSnap.constraints);
  } finally {
    console.log(`\nXoa DB tam "${TEMP_DB}"...`);
    await admin.query(`DROP DATABASE IF EXISTS "${TEMP_DB}"`);
    await admin.end();
  }

  console.log(
    ok
      ? "\nOK — migration dung lai DUNG DB production tu con so 0."
      : "\nLECH — xem danh sach ben tren, phai sua migration truoc khi tin dung.",
  );
  if (!ok) process.exitCode = 1;
}

void main();
