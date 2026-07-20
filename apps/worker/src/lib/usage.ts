import { createDb, usageEvents } from "@dichvideo/db";

export interface UsageRecord {
  provider:
    | "groq"
    | "gemini"
    | "azure-tts"
    | "eleven"
    | "gcloud"
    | "fpt"
    | "viettel"
    | "r2";
  metric: "tokens_in" | "tokens_out" | "audio_sec" | "chars" | "bytes";
  quantity: number;
  costUsdMicros: number;
}

/** Provider unit prices in USD micros. Verify against provider pricing pages before Phase 6 launch. */
export const PRICING = {
  /** Groq whisper-large-v3-turbo: $0.04/hour → per audio second */
  groqWhisperPerAudioSec: 0.04e6 / 3600,
  /**
   * Đơn giá token của Gemini Flash — ĐANG lấy theo bảng giá 2.5 Flash
   * ($0.30 vào / $2.50 ra mỗi 1M token).
   * ⚠️ Mặc định dịch/OCR đã nâng lên gemini-3.5-flash nên con số này chỉ còn là
   * ƯỚC LƯỢNG để theo dõi xu hướng chi phí, chưa phải giá thật của model mới.
   * Cập nhật lại khi tra được bảng giá chính thức của 3.5 Flash.
   */
  gemini25FlashInPerTok: 0.3e6 / 1_000_000,
  gemini25FlashOutPerTok: 2.5e6 / 1_000_000,
  /** Gemini 2.5 Flash TTS: text input ($0.50 / 1M), audio output ($10 / 1M tok) */
  geminiTtsInPerTok: 0.5e6 / 1_000_000,
  geminiTtsOutPerTok: 10e6 / 1_000_000,
} as const;

export async function recordUsage(jobId: string, records: UsageRecord[]) {
  if (records.length === 0) return 0;
  const db = createDb();
  await db.insert(usageEvents).values(
    records.map((r) => ({
      jobId,
      provider: r.provider,
      metric: r.metric,
      quantity: Math.round(r.quantity),
      costUsdMicros: Math.round(r.costUsdMicros),
    })),
  );
  return records.reduce((acc, r) => acc + Math.round(r.costUsdMicros), 0);
}
