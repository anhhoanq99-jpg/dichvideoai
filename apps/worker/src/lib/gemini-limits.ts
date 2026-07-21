import { UnrecoverableError } from "bullmq";
import { logger } from "../logger";

/** Lỗi 429 → số ms cần chờ theo RetryInfo của Google (null nếu không phải 429). */
export function rateLimitDelayMs(err: unknown): number | null {
  const message = err instanceof Error ? err.message : String(err);
  if (!/429|RESOURCE_EXHAUSTED/i.test(message)) return null;
  // "try again in 18m50.976s" (Groq, có phần PHÚT) · "retry in 12.5s" · "retryDelay":"5s" (Gemini)
  const clock = /(?:retry|try again) in (?:(\d+)m)?([\d.]+)\s*s/i.exec(message);
  const retryDelay = /"retryDelay"\s*:\s*"([\d.]+)s"/i.exec(message);
  let sec = 60;
  if (clock) sec = Number.parseInt(clock[1] ?? "0", 10) * 60 + Number.parseFloat(clock[2]);
  else if (retryDelay) sec = Number.parseFloat(retryDelay[1]);
  return Math.ceil((Number.isFinite(sec) ? sec : 60) * 1000) + 1500;
}

/**
 * Groq hết hạn mức TOKEN/NGÀY (TPD) hoặc REQUEST/NGÀY (RPD) — phải chờ tới lúc
 * reset (hàng chục phút tới vài giờ), retry chỉ tổ treo job. Khác hạn mức PHÚT
 * (TPM/RPM) — cái đó chờ ~1 phút là chạy lại được nên vẫn retry bình thường.
 */
export function isGroqDailyLimitError(err: unknown): boolean {
  const m = err instanceof Error ? err.message : String(err);
  return (
    /429|rate_limit_exceeded/i.test(m) &&
    /tokens per day|requests per day|\(TPD\)|\(RPD\)/i.test(m)
  );
}

export function groqDailyLimitMessage(): string {
  return (
    "Nguồn dịch dự phòng (Groq) đã hết hạn mức token trong NGÀY, và key Gemini cũng đang cạn " +
    "— không còn nguồn dịch nào khả dụng lúc này. Thêm key Gemini mới hoặc nạp tiền tại " +
    "aistudio.google.com (mục Billing), hoặc thử lại sau khi hạn mức reset. " +
    "Credits của job này được hoàn tự động."
  );
}

/** Hết hạn mức NGÀY của gói miễn phí — retry vô ích, phải dừng ngay. */
export function isDailyQuotaError(err: unknown): boolean {
  const message = err instanceof Error ? err.message : String(err);
  return /RESOURCE_EXHAUSTED|429/i.test(message) && /PerDay/i.test(message);
}

/** Key trả trước hết tiền / billing chết — retry vô ích, phải dừng ngay. */
export function isBillingDepletedError(err: unknown): boolean {
  const message = err instanceof Error ? err.message : String(err);
  return (
    /429|RESOURCE_EXHAUSTED/i.test(message) &&
    /prepayment credits are depleted|billing/i.test(message)
  );
}

/**
 * Lỗi thuộc về RIÊNG key đang dùng (hết hạn mức ngày / hết tiền / key hỏng) →
 * đổi sang key khác thì cứu được. Nhận cả lỗi thô lẫn lỗi đã bị `withGeminiRetry`
 * bọc thành UnrecoverableError kèm thông báo tiếng Việt.
 */
export function isKeyExhaustedError(err: unknown): boolean {
  if (isDailyQuotaError(err) || isBillingDepletedError(err)) return true;
  const m = err instanceof Error ? err.message : String(err);
  return /hết hạn mức trong NGÀY|hết tiền trả trước|API_KEY_INVALID|API key not valid/i.test(m);
}

export function dailyQuotaMessage(): string {
  return (
    "Key Gemini miễn phí đã hết hạn mức trong NGÀY (dịch/OCR: 20 lượt, giọng cao cấp: 10 lượt mỗi ngày). " +
    "Nâng key lên gói trả phí tại aistudio.google.com (mục Billing) để dùng không giới hạn, " +
    "hoặc thử lại vào ngày mai. Credits của job này được hoàn tự động."
  );
}

export function billingDepletedMessage(): string {
  return (
    "Key Gemini đã hết tiền trả trước — nạp thêm tại aistudio.google.com (mục Billing). " +
    "Bước dịch tự chuyển sang nguồn miễn phí (Groq) nếu đã cấu hình; " +
    "riêng OCR và giọng đọc cao cấp cần key Gemini còn hạn mức. Credits của job này được hoàn tự động."
  );
}

/**
 * Bọc MỌI lời gọi Gemini: hết hạn mức ngày → UnrecoverableError (job fail ngay,
 * hoàn credits); hạn mức phút → chờ đúng số giây Google yêu cầu rồi thử lại;
 * lỗi khác → backoff ngắn.
 */
export async function withGeminiRetry<T>(
  label: string,
  fn: () => Promise<T>,
  maxRetries = 4,
): Promise<T> {
  let lastErr: unknown;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      if (isDailyQuotaError(err)) throw new UnrecoverableError(dailyQuotaMessage());
      if (isBillingDepletedError(err)) {
        throw new UnrecoverableError(billingDepletedMessage());
      }
      lastErr = err;
      const wait = rateLimitDelayMs(err) ?? 1500 * (attempt + 1);
      logger.warn(
        { label, attempt, waitMs: wait, err: String(err).slice(0, 200) },
        "gemini call retrying",
      );
      await new Promise((r) => setTimeout(r, wait));
    }
  }
  throw new Error(
    `${label} thất bại sau ${maxRetries + 1} lần: ${lastErr instanceof Error ? lastErr.message : lastErr}`,
  );
}
