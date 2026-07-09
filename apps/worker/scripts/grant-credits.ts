/** Cộng credits thủ công (dev/admin): EMAIL=... AMOUNT=... tsx scripts/grant-credits.ts */
import { config } from "dotenv";
config({ path: "../../.env" });
import { eq } from "drizzle-orm";
import { applyCreditDelta, createDb, schema } from "@dichvideo/db";

const email = process.env.EMAIL;
const amount = Number(process.env.AMOUNT ?? 0);
if (!email || !amount) throw new Error("Cần EMAIL và AMOUNT");

const db = createDb();
const [u] = await db
  .select({ id: schema.user.id, balance: schema.user.creditBalance })
  .from(schema.user)
  .where(eq(schema.user.email, email));
if (!u) throw new Error(`Không thấy user ${email}`);

const entry = await applyCreditDelta(db, {
  userId: u.id,
  delta: amount,
  reason: "admin_adjust",
});
console.log(`OK: ${email} ${u.balance} → ${entry.balanceAfter} credits`);
process.exit(0);
