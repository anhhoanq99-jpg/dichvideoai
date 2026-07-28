import { and, eq } from "drizzle-orm";
import { creditLedger, type Db } from "@dichvideo/db";

/**
 * true nếu user ĐÃ từng nạp tiền (thoát khỏi giới hạn dùng thử).
 *
 * Bản sao phía worker của `apps/web/lib/trial.ts` — worker mới là nơi TỰ NỐI
 * chuỗi job của pipeline một chạm (probe → trích xuất → dịch → render/lồng
 * tiếng), nên nếu chỉ chặn ở route web thì luồng chính thoát rào hoàn toàn.
 */
export async function hasPaidTopup(db: Db, userId: string): Promise<boolean> {
  const [row] = await db
    .select({ id: creditLedger.id })
    .from(creditLedger)
    .where(and(eq(creditLedger.userId, userId), eq(creditLedger.reason, "topup")))
    .limit(1);
  return Boolean(row);
}
