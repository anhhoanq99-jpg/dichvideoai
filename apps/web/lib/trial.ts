import { and, eq } from "drizzle-orm";
import { applyCreditDelta, creditLedger, schema } from "@dichvideo/db";
import { trialCreditsExpireAt } from "@dichvideo/shared";
import { db } from "@/lib/db";

/**
 * Giới hạn tài khoản DÙNG THỬ = chưa từng nạp tiền. Khi đó: gắn watermark, chặn
 * video quá dài, và credit tặng hết hạn sau 7 ngày. Nạp tiền một lần → mở hết
 * (credit đã nạp KHÔNG hết hạn — giữ đúng lợi thế cạnh tranh).
 *
 * Hằng số + hàm thuần nằm ở `@dichvideo/shared` (worker dùng chung); ở đây chỉ
 * còn phần đụng DB. Re-export để mọi nơi vẫn import từ "@/lib/trial" như cũ.
 */
export {
  TRIAL_MAX_VIDEO_SEC,
  TRIAL_CREDITS_EXPIRE_DAYS,
  trialVideoTooLong,
  trialVideoLimitMessage,
  trialCreditsExpireAt,
  trialDaysLeft,
} from "@dichvideo/shared";

/** true nếu user ĐÃ từng nạp tiền (thoát khỏi giới hạn dùng thử). */
export async function hasPaidTopup(userId: string): Promise<boolean> {
  const [row] = await db
    .select({ id: creditLedger.id })
    .from(creditLedger)
    .where(and(eq(creditLedger.userId, userId), eq(creditLedger.reason, "topup")))
    .limit(1);
  return Boolean(row);
}

/**
 * Kết toán credit dùng thử + trả về số dư THỰC SỰ tiêu được.
 * Nếu tài khoản CHƯA nạp, đã qua 7 ngày, còn dư > 0 → trừ hết (ghi ledger
 * reason "trial_expired"). IDEMPOTENT nhờ unique (ref_type,ref_id,reason) =
 * (trial, userId, trial_expired): gọi lại chỉ trừ đúng một lần, và số dư đã
 * trừ KHÔNG "sống lại" khi user nạp tiền sau này.
 */
export async function resolveSpendableBalance(
  userId: string,
): Promise<{ balance: number; trialExpired: boolean }> {
  const [u] = await db
    .select({ createdAt: schema.user.createdAt, balance: schema.user.creditBalance })
    .from(schema.user)
    .where(eq(schema.user.id, userId));
  if (!u) return { balance: 0, trialExpired: false };

  // còn trong 7 ngày → không cần truy vấn lịch sử nạp
  if (Date.now() <= trialCreditsExpireAt(u.createdAt).getTime()) {
    return { balance: u.balance, trialExpired: false };
  }
  // đã qua 7 ngày: đã nạp thì credit không hết hạn
  if (await hasPaidTopup(userId)) return { balance: u.balance, trialExpired: false };

  // chưa nạp + quá hạn → credit tặng hết hiệu lực
  if (u.balance > 0) {
    await applyCreditDelta(db, {
      userId,
      delta: -u.balance,
      reason: "trial_expired",
      refType: "trial",
      refId: userId,
    });
  }
  return { balance: 0, trialExpired: true };
}
