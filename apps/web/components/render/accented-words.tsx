"use client";

import { tokenizeAccents } from "@dichvideo/shared";

/**
 * Vẽ câu phụ đề theo từng từ: `*từ nhấn*` tô màu accent + in đậm; `reveal` =
 * từng từ hiện đúng nhịp đọc.
 *
 * Công thức chia thời gian phải GIỐNG bản xuất `.ass` (ass-builder.ts) — lệch
 * là khách xem trước một kiểu, tải về một kiểu.
 */
export function AccentedWords({
  text,
  accentColor,
  reveal,
  durMs,
}: {
  text: string;
  accentColor: string;
  reveal: boolean;
  durMs: number;
}) {
  const tokens = tokenizeAccents(text);
  const totalChars = tokens.reduce((sum, t) => sum + t.text.length, 0) || 1;
  // offset ký tự tích lũy TRƯỚC mỗi từ (n nhỏ nên O(n²) vô hại; không mutate biến)
  const charOffsets = tokens.map((_, i) =>
    tokens.slice(0, i).reduce((sum, t) => sum + t.text.length, 0),
  );
  return (
    <>
      {tokens.map((tok, i) => {
        // delay theo tỉ lệ ký tự — cùng công thức chia thời gian với bản xuất ASS
        const delayMs = (charOffsets[i] / totalChars) * durMs;
        return (
          <span
            key={i}
            style={{
              ...(tok.accent ? { color: accentColor, fontWeight: 700 } : {}),
              ...(reveal
                ? {
                    opacity: 0,
                    animation: `sub-reveal 0.06s linear ${Math.round(delayMs)}ms forwards`,
                  }
                : {}),
            }}
          >
            {tok.text}
            {i < tokens.length - 1 ? " " : ""}
          </span>
        );
      })}
    </>
  );
}
