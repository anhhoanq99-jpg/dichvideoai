import { and, eq } from "drizzle-orm";
import { applyCreditDelta, creditLedger, schema } from "@dichvideo/db";
import { db } from "@/lib/db";

/**
 * Giới hạn tài khoản DÙNG THỬ = chưa từng nạp tiền. Khi đó: gắn watermark, chặn
 * video quá dài, và credit tặng hết hạn sau 7 ngày. Nạp tiền một lần → mở hết
 * (credit đã nạp KHÔNG hết hạn — giữ đúng lợi thế cạnh tranh).
 */
export const TRIAL_MAX_VIDEO_SEC = 300; // 5 phút
export const TRIAL_CREDITS_EXPIRE_DAYS = 7;

/** true nếu user ĐÃ từng nạp tiền (thoát khỏi giới hạn dùng thử). */
export async function hasPaidTopup(userId: string): Promise<boolean> {
  const [row] = await db
    .select({ id: creditLedger.id })
    .from(creditLedger)
    .where(and(eq(creditLedger.userId, userId), eq(creditLedger.reason, "topup")))
    .limit(1);
  return Boolean(row);
}

/** true nếu video vượt giới hạn thời lượng của bản dùng thử. */
export function trialVideoTooLong(durationSec: number | null | undefined): boolean {
  return (durationSec ?? 0) > TRIAL_MAX_VIDEO_SEC;
}

/** Thông báo chặn video quá dài cho tài khoản dùng thử. */
export function trialVideoLimitMessage(durationSec: number): string {
  const mins = Math.max(1, Math.round(durationSec / 60));
  const limitMin = Math.round(TRIAL_MAX_VIDEO_SEC / 60);
  return `Video dài ${mins} phút vượt quá giới hạn ${limitMin} phút của tài khoản dùng thử. Vui lòng nạp tiền để tăng hạn mức.`;
}

/**
 * Thời điểm hết hạn credit tặng của một tài khoản = ngày tạo + 7 ngày.
 * Chỉ áp cho tài khoản CHƯA nạp; đã nạp thì credit không hết hạn.
 */
export function trialCreditsExpireAt(createdAt: Date): Date {
  return new Date(createdAt.getTime() + TRIAL_CREDITS_EXPIRE_DAYS * 24 * 60 * 60 * 1000);
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

/** Số ngày còn lại của credit dùng thử (>=0); null nếu không áp dụng/đã nạp. */
export function trialDaysLeft(createdAt: Date): number {
  const ms = trialCreditsExpireAt(createdAt).getTime() - Date.now();
  return Math.max(0, Math.ceil(ms / (24 * 60 * 60 * 1000)));
}
