import type { CoverRegion, SubtitleSegment } from "@dichvideo/shared";
import { segmentIndexAt } from "@dichvideo/shared";

/**
 * Hình học thuần của khung preview — không đụng React, không đụng DOM.
 * Tách khỏi `render-preview.tsx` để phần component chỉ còn việc dựng giao diện,
 * và để mấy phép toạ độ này test được mà không cần dựng cả khung video.
 *
 * Quy ước toạ độ: mọi giá trị x/y/w/h là TỈ LỆ 0..1 so với khung video, không
 * phải pixel — nhờ vậy vùng che vẽ ở preview nhỏ vẫn khớp khi render ở 1080p.
 */

/** Ghim một số vào khoảng 0..1. */
export function clamp01(n: number): number {
  return Math.min(1, Math.max(0, n));
}

/** Điểm `p` có nằm trong hộp `b` không (toạ độ tỉ lệ). */
export function insideBox(p: { x: number; y: number }, b: CoverRegion): boolean {
  return p.x >= b.x && p.x <= b.x + b.w && p.y >= b.y && p.y <= b.y + b.h;
}

/** Câu đang hiển thị tại mốc `ms` — null khi đang ở khoảng lặng. */
export function activeSegmentAt(
  segments: SubtitleSegment[],
  ms: number,
): SubtitleSegment | null {
  const idx = segmentIndexAt(segments, ms);
  return idx >= 0 ? segments[idx] : null;
}

/** Vị trí 4 góc cho logo trên khung preview. */
export const LOGO_CORNER: Record<string, React.CSSProperties> = {
  tl: { top: "3%", left: "2%" },
  tr: { top: "3%", right: "2%" },
  bl: { bottom: "3%", left: "2%" },
  br: { bottom: "3%", right: "2%" },
};

/** Thao tác kéo/vẽ đang diễn ra trên khung preview. */
export type Gesture =
  | { kind: "draw"; start: { x: number; y: number } }
  | { kind: "move-region"; index: number; grab: { dx: number; dy: number } }
  | { kind: "resize-region"; index: number }
  | { kind: "move-sub"; grab: { dx: number; dy: number } }
  // ô che chữ gốc gắn theo dòng phụ đề đang chạy
  | { kind: "move-line-cover"; grab: { dx: number; dy: number } }
  | { kind: "resize-line-cover" }
  // dòng phụ đề có vị trí/cỡ chữ riêng
  | { kind: "move-line-sub"; grab: { dx: number; dy: number } }
  | { kind: "resize-line-sub"; startX: number; startSize: number };
