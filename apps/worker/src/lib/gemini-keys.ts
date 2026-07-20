import { isKeyExhaustedError } from "./gemini-limits";
import { logger } from "../logger";

/**
 * Xoay vòng NHIỀU key Gemini. Mỗi key miễn phí có hạn mức riêng theo ngày, nên
 * cắm vài key free là OCR chạy được mà không tốn tiền — hết hạn mức key này thì
 * tự nhảy sang key kế tiếp.
 *
 * Cấu hình trong .env:
 *   GEMINI_API_KEYS=key1,key2,key3   (ưu tiên, danh sách phân tách bằng dấu phẩy)
 *   GEMINI_API_KEY=key               (cách cũ — vẫn dùng được, gộp vào cuối danh sách)
 */
export function geminiKeys(): string[] {
  const many = (process.env.GEMINI_API_KEYS ?? "").split(",");
  const one = process.env.GEMINI_API_KEY ?? "";
  const all = [...many, one].map((k) => k.trim()).filter(Boolean);
  return [...new Set(all)]; // bỏ trùng khi user dán cùng key vào cả 2 biến
}

/**
 * Chạy `fn` với từng key tới khi có key còn hạn mức.
 * CHỈ đổi key khi lỗi thuộc về chính key đó — lỗi mạng/lỗi khác ném ra ngay
 * để không âm thầm đốt hết mọi key vì một sự cố không liên quan.
 */
export async function withGeminiKeys<T>(
  label: string,
  fn: (apiKey: string) => Promise<T>,
): Promise<T> {
  const keys = geminiKeys();
  if (keys.length === 0) {
    throw new Error("Chưa cấu hình GEMINI_API_KEY hoặc GEMINI_API_KEYS");
  }

  let lastErr: unknown;
  for (let i = 0; i < keys.length; i++) {
    try {
      return await fn(keys[i]);
    } catch (err) {
      lastErr = err;
      const isLast = i === keys.length - 1;
      if (!isKeyExhaustedError(err) || isLast) throw err;
      logger.warn(
        { label, key: `${i + 1}/${keys.length}` },
        "key Gemini hết hạn mức — chuyển sang key tiếp theo",
      );
    }
  }
  throw lastErr;
}
