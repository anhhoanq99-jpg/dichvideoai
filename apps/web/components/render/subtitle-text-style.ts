import type { CSSProperties } from "react";
import { opacityToHexAlpha } from "@dichvideo/shared";
import type { RenderSettings } from "./render-settings";

/**
 * Công thức tô chữ phụ đề — dùng chung cho khung xem trước trên video VÀ ô chữ
 * mẫu trong bảng "Kiểu phụ đề".
 *
 * Tách ra để hai chỗ không thể lệch nhau: chữ mẫu mà hiển thị khác bản trên
 * video thì nó thành thứ đánh lừa, còn tệ hơn không có.
 */

/** Lớp NGOÀI: nền hộp, font, cỡ, độ đậm. */
export function subtitleBoxStyle(
  settings: RenderSettings,
  fontSizePx: number,
): CSSProperties {
  return {
    fontFamily: `'${settings.font}', sans-serif`,
    fontSize: fontSizePx,
    fontWeight: settings.bold ? 700 : 400,
    backgroundColor: settings.boxed
      ? `${settings.boxColor}${opacityToHexAlpha(settings.boxOpacity)}`
      : "transparent",
  };
}

/**
 * Lớp TRONG: màu chữ, viền và hiệu ứng.
 *
 * Viền vẽ bằng 4 bóng đổ quanh chữ + 1 bóng nhoè — mô phỏng `outline` của ASS.
 * Có hộp nền thì bỏ viền, vì bản render ra video cũng vậy (borderStyle 3).
 */
export function subtitleTextStyle(
  settings: RenderSettings,
  /** thời lượng câu — chỉ hiệu ứng karaoke dùng để chạy đúng nhịp */
  durationMs: number,
): CSSProperties {
  const outline = settings.outlineColor;
  return {
    display: "inline-block",
    color: settings.primaryColor,
    textShadow: settings.boxed
      ? "none"
      : `-1px -1px 0 ${outline}, 1px -1px 0 ${outline}, -1px 1px 0 ${outline}, 1px 1px 0 ${outline}, 0 0 4px ${outline}`,
    ...(settings.effect === "fade"
      ? { animation: "sub-fade 0.18s ease-out both" }
      : {}),
    ...(settings.effect === "pop"
      ? { animation: "sub-pop 0.16s ease-out both" }
      : {}),
    ...(settings.effect === "karaoke"
      ? {
          color: "transparent",
          textShadow: "none",
          backgroundImage: `linear-gradient(90deg, ${settings.primaryColor} 50%, #C9C9C9 50%)`,
          backgroundSize: "200% 100%",
          WebkitBackgroundClip: "text",
          backgroundClip: "text",
          WebkitTextStroke: settings.boxed ? undefined : `1px ${outline}`,
          animation: `sub-karaoke ${durationMs}ms linear both`,
        }
      : {}),
  };
}
