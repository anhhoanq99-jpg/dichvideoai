import { UnrecoverableError } from "bullmq";
import { logger } from "../logger";

/** Lỗi 429 → số ms cần chờ theo RetryInfo của Google (null nếu không phải 429). */
export function rateLimitDelayMs(err: unknown): number | null {
  const s = err instanceof Error ? err.message : String(err);
  if (!/429|RESOURCE_EXHAUSTED/i.test(s)) return null;
  const m = /retry in ([\d.]+)\s*s/i.exec(s) ?? /"retryDelay"\s*:\s*"([\d.]+)s"/i.exec(s);
  const sec = m ? Number.parseFloat(m[1]) : 60;
  return Math.ceil((Number.isFinite(sec) ? sec : 60) * 1000) + 1500;
}

/** Hết hạn mức NGÀY của gói miễn phí — retry vô ích, phải dừng ngay. */
export function isDailyQuotaError(err: unknown): boolean {
  const s = err instanceof Error ? err.message : String(err);
  return /RESOURCE_EXHAUSTED|429/i.test(s) && /PerDay/i.test(s);
}

export function dailyQuotaMessage(): string {
  return (
    "Key Gemini miễn phí đã hết hạn mức trong NGÀY (dịch/OCR: 20 lượt, giọng cao cấp: 10 lượt mỗi ngày). " +
    "Nâng key lên gói trả phí tại aistudio.google.com (mục Billing) để dùng không giới hạn, " +
    "hoặc thử lại vào ngày mai. Credits của job này được hoàn tự động."
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
