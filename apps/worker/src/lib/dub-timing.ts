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
 * Chuỗi filter atempo để tăng tốc audio theo hệ số factor (>1 = nhanh hơn).
 * atempo chỉ nhận 0.5..100 mỗi tầng — hệ số lớn được xâu chuỗi.
 * Trả về null khi không cần chỉnh (lệch dưới 3%).
 */
export function atempoChain(factor: number): string | null {
  if (factor <= 1.03) return null;
  const capped = Math.min(factor, 4); // quá 4x thì đằng nào cũng phải cắt
  const stages: number[] = [];
  let remaining = capped;
  while (remaining > 2) {
    stages.push(2);
    remaining /= 2;
  }
  stages.push(Math.round(remaining * 1000) / 1000);
  return stages.map((s) => `atempo=${s}`).join(",");
}
