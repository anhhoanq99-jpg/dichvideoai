"use client";

import type { Lang } from "@/lib/i18n";
import { AccentedWords } from "./accented-words";
import type { RenderSettings } from "./render-settings";
import { subtitleBoxStyle, subtitleTextStyle } from "./subtitle-text-style";

/**
 * Ô chữ mẫu trong bảng "Kiểu phụ đề" — xem ngay mặt chữ, màu, viền, hộp nền và
 * hiệu ứng mà không phải tua video đến đúng câu đang có thoại.
 *
 * Dùng CHUNG công thức tô chữ với khung xem trước (`subtitle-text-style.ts`) nên
 * không thể lệch. Nền tối mô phỏng khung video để nhìn màu chữ và viền cho đúng
 * — chữ vàng trên nền trắng của modal thì gần như không thấy gì.
 */

/** Câu mẫu cố ý có dấu tiếng Việt đủ loại + một *từ nhấn* để thấy màu nhấn. */
const SAMPLE = {
  vi: "Đây là *phụ đề mẫu* của bạn",
  en: "This is your *sample subtitle*",
} as const;

/** Thời lượng giả cho hiệu ứng karaoke chạy trọn một vòng. */
const SAMPLE_DURATION_MS = 2200;

export function SubtitleSample({
  settings,
  lang = "vi",
}: {
  settings: RenderSettings;
  lang?: Lang;
}) {
  const text = SAMPLE[lang];

  /**
   * `key` dẫn THẲNG từ settings để animation chạy lại mỗi lần đổi kiểu — đổi
   * key là React dựng lại span, animation phát từ đầu. Không có nó thì chọn
   * "Mờ dần" hay "Karaoke" xong chẳng thấy gì, vì animation đã chạy xong từ lần
   * dựng đầu tiên.
   *
   * Dùng key thay vì `useState` + `useEffect`: lint cấm setState đồng bộ trong
   * effect, mà ở đây cũng không cần state — giá trị này suy ra được từ props.
   */
  const runKey = [
    settings.effect,
    settings.font,
    settings.primaryColor,
    settings.accentColor,
    settings.bold,
    settings.boxed,
  ].join("|");

  return (
    <div
      className="flex min-h-20 items-center justify-center rounded-lg bg-neutral-900 px-3 py-4 dark:bg-black/60"
      style={{
        // ô carô nhạt: thấy được độ trong của hộp nền sau chữ
        backgroundImage:
          "linear-gradient(45deg,rgba(255,255,255,.06) 25%,transparent 25%,transparent 75%,rgba(255,255,255,.06) 75%)," +
          "linear-gradient(45deg,rgba(255,255,255,.06) 25%,transparent 25%,transparent 75%,rgba(255,255,255,.06) 75%)",
        backgroundSize: "16px 16px",
        backgroundPosition: "0 0, 8px 8px",
      }}
    >
      <span
        className="max-w-full px-1.5 py-0.5 text-center leading-tight"
        style={subtitleBoxStyle(settings, Math.max(14, settings.fontSize))}
      >
        <span key={runKey} style={subtitleTextStyle(settings, SAMPLE_DURATION_MS)}>
          {settings.effect === "karaoke" ? (
            text.replace(/\*/g, "")
          ) : (
            <AccentedWords
              text={text}
              accentColor={settings.accentColor}
              reveal={settings.effect === "reveal"}
              durMs={SAMPLE_DURATION_MS}
            />
          )}
        </span>
      </span>
    </div>
  );
}
