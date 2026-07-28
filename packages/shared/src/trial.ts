/**
 * Giới hạn tài khoản DÙNG THỬ (= chưa từng nạp tiền) — phần THUẦN, không đụng DB,
 * nên cả `apps/web` lẫn `apps/worker` dùng CHUNG một hằng số.
 *
 * Trước đây hằng số chỉ nằm ở `apps/web/lib/trial.ts` nên worker (nơi pipeline
 * một chạm tự nối job) không biết gì về giới hạn dùng thử → thoát rào.
 */
export const TRIAL_MAX_VIDEO_SEC = 300; // 5 phút
export const TRIAL_CREDITS_EXPIRE_DAYS = 7;

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

/** Số ngày còn lại của credit dùng thử (>=0). */
export function trialDaysLeft(createdAt: Date): number {
  const ms = trialCreditsExpireAt(createdAt).getTime() - Date.now();
  return Math.max(0, Math.ceil(ms / (24 * 60 * 60 * 1000)));
}
