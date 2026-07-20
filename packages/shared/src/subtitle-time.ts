/**
 * Mốc thời gian dạng THÂN THIỆN cho ô nhập của người dùng ("1:23.5", "83.5").
 * Khác `subtitle-io.ts` — chỗ đó dùng định dạng SRT nghiêm ngặt "HH:MM:SS,mmm".
 */

/** ms → "m:ss.d" (vd 83500 → "1:23.5"). Số âm bị kẹp về 0. */
export function msToLabel(ms: number): string {
  const total = Math.max(0, ms) / 1000;
  const mins = Math.floor(total / 60);
  const rest = total - mins * 60;
  // padStart để 5 giây ra "0:05.0" chứ không phải "0:5.0"
  return `${mins}:${rest.toFixed(1).padStart(4, "0")}`;
}

/**
 * "1:23.5" | "1:23" | "83.5" | "83" → ms. Trả null nếu không đọc được.
 * Chấp nhận dấu phẩy thập phân (bàn phím VN hay gõ "1:23,5").
 */
export function labelToMs(value: string): number | null {
  const s = value.trim().replace(",", ".");
  if (!s) return null;

  if (s.includes(":")) {
    // có phút → phần giây bắt buộc 0..59
    const m = /^(\d+):([0-5]?\d(?:\.\d{1,3})?)$/.exec(s);
    if (!m) return null;
    return Math.round((parseInt(m[1], 10) * 60 + parseFloat(m[2])) * 1000);
  }

  // chỉ có giây → cho phép vượt 59 ("83.5" = 1 phút 23,5 giây)
  if (!/^\d+(?:\.\d{1,3})?$/.test(s)) return null;
  return Math.round(parseFloat(s) * 1000);
}
