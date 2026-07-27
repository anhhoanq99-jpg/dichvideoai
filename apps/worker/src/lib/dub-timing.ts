import type { SubtitleSegment } from "@dichvideo/shared";

/** Khe thời gian tối đa cho mỗi clip: từ start câu này đến start câu kế. */
export function slotMs(
  segments: SubtitleSegment[],
  index: number,
  videoDurationMs: number,
): number {
  const seg = segments[index];
  const next = segments[index + 1];
  const end = next ? next.startMs : Math.max(videoDurationMs, seg.endMs);
  return Math.max(200, end - seg.startMs);
}

/**
 * Trần tốc độ ép giọng lồng tiếng. Trên ~1.5× là nghe gấp gáp, mất tự nhiên —
 * gốc rễ (câu dịch quá dài) đã xử ở khâu dịch bằng ngân sách ký tự (translate.ts
 * `charBudget`). Ở đây chỉ chặn trần cho phần dư hiếm hoi; câu vẫn vượt sau khi
 * ép 1.5× sẽ bị `-t slot` trong dub.ts cắt đuôi (rất hiếm khi bản dịch đã gọn).
 * Trước đây trần 4× cho ra giọng đọc nhanh 2-4× nghe như tua băng.
 */
const MAX_TEMPO = 1.5;

/**
 * Chuỗi filter atempo để tăng tốc audio theo hệ số factor (>1 = nhanh hơn).
 * atempo chỉ nhận 0.5..100 mỗi tầng — hệ số lớn được xâu chuỗi.
 * Trả về null khi không cần chỉnh (lệch dưới 3%).
 */
export function atempoChain(factor: number): string | null {
  if (factor <= 1.03) return null;
  const capped = Math.min(factor, MAX_TEMPO);
  const stages: number[] = [];
  let remaining = capped;
  while (remaining > 2) {
    stages.push(2);
    remaining /= 2;
  }
  stages.push(Math.round(remaining * 1000) / 1000);
  return stages.map((s) => `atempo=${s}`).join(",");
}
