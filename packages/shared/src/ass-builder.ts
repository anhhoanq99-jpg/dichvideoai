import {
  ACCENT_HIGHLIGHT_COLOR,
  KARAOKE_BASE_COLOR,
  type SubEffect,
  type SubtitleStyle,
} from "./render-presets";
import type { SubtitleSegment } from "./types";

/** "#RRGGBB" or "#RRGGBBAA" → ASS "&HAABBGGRR" (alpha 00 = opaque, FF = transparent) */
export function hexToAss(hex: string): string {
  const m = /^#([0-9a-f]{6})([0-9a-f]{2})?$/i.exec(hex.trim());
  if (!m) throw new Error(`Màu không hợp lệ: ${hex}`);
  const [r, g, b] = [m[1].slice(0, 2), m[1].slice(2, 4), m[1].slice(4, 6)];
  // CSS alpha (FF=opaque) → ASS alpha (00=opaque)
  const cssAlpha = m[2] ? parseInt(m[2], 16) : 255;
  const assAlpha = (255 - cssAlpha).toString(16).padStart(2, "0");
  return `&H${assAlpha}${b}${g}${r}`.toUpperCase();
}

function msToAssTime(ms: number): string {
  const h = Math.floor(ms / 3_600_000);
  const m = Math.floor((ms % 3_600_000) / 60_000);
  const s = Math.floor((ms % 60_000) / 1000);
  const cs = Math.floor((ms % 1000) / 10); // centiseconds
  return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}.${String(cs).padStart(2, "0")}`;
}

/** Neutralize ASS override tags / control chars in user subtitle text. */
export function escapeAssText(text: string): string {
  return text
    .replace(/\{/g, "(")
    .replace(/\}/g, ")")
    .replace(/\\/g, "/")
    .replace(/\r?\n/g, "\\N");
}

export interface PlayRes {
  w: number;
  h: number;
}

/** "#RRGGBB" → mã màu inline ASS "&HBBGGRR&" (dùng trong \c giữa dòng thoại). */
function hexToAssInline(hex: string): string {
  const m = /^#([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return "&HFFFFFF&";
  const [r, g, b] = [m[1].slice(0, 2), m[1].slice(2, 4), m[1].slice(4, 6)];
  return `&H${b}${g}${r}&`.toUpperCase();
}

interface WordToken {
  text: string;
  /** từ nằm trong *dấu sao* — tô màu nhấn + in đậm */
  accent: boolean;
}

/** Tách câu thành từ, nhận diện cụm *nhấn mạnh* (có thể bọc nhiều từ liền nhau). */
export function tokenizeAccents(text: string): WordToken[] {
  const tokens: WordToken[] = [];
  let inAccent = false;
  for (const raw of text.split(/\s+/).filter(Boolean)) {
    let word = raw;
    let accent = inAccent;
    if (word.startsWith("*") && word.length > 1) {
      accent = true;
      inAccent = true;
      word = word.slice(1);
    }
    if (word.endsWith("*") && word.length > 1) {
      inAccent = false;
      word = word.slice(0, -1);
    }
    tokens.push({ text: word, accent });
  }
  return tokens;
}

/** Chia thời lượng câu (centi-giây) cho từng từ theo tỉ lệ số ký tự. */
function wordDurationsCs(tokens: WordToken[], seg: SubtitleSegment): number[] {
  const totalCs = Math.max(10, Math.round((seg.endMs - seg.startMs) / 10));
  const totalChars = tokens.reduce((sum, t) => sum + t.text.length, 0) || 1;
  let used = 0;
  return tokens.map((t, i) => {
    const cs =
      i === tokens.length - 1
        ? Math.max(1, totalCs - used)
        : Math.max(1, Math.round((t.text.length / totalChars) * totalCs));
    used += cs;
    return cs;
  });
}

/**
 * Text một câu theo hiệu ứng đã chọn (ASS override tags trong dòng thoại):
 * - fade: hiện/tắt dần 180ms
 * - pop: chữ phóng từ 75% lên 100% trong 160ms
 * - reveal: nói đến đâu chữ hiện đến đó (mỗi từ bật alpha đúng thời điểm đọc)
 * - karaoke: màu đổ dần từ xám sang màu chính đúng nhịp giọng đọc (\kf)
 * Mọi hiệu ứng đều hỗ trợ *từ nhấn* → màu accent + in đậm.
 */
function effectText(seg: SubtitleSegment, style: SubtitleStyle, effect: SubEffect): string {
  const tokens = tokenizeAccents(seg.text);
  if (tokens.length === 0) return escapeAssText(seg.text);
  const primary = hexToAssInline(style.primary);
  const accent = hexToAssInline(style.accent ?? ACCENT_HIGHLIGHT_COLOR);
  const baseBold = style.bold ? 1 : 0;
  /** mở/đóng màu nhấn quanh một từ (khôi phục tường minh, không dùng \r) */
  const paint = (t: WordToken, inner: string) =>
    t.accent ? `{\\c${accent}\\b1}${inner}{\\c${primary}\\b${baseBold}}` : inner;

  if (effect === "karaoke") {
    const durations = wordDurationsCs(tokens, seg);
    return tokens
      .map(
        (t, i) =>
          `{\\kf${durations[i]}\\c${t.accent ? accent : primary}${t.accent ? "\\b1" : `\\b${baseBold}`}}${escapeAssText(t.text)}`,
      )
      .join(" ");
  }

  if (effect === "reveal") {
    const durations = wordDurationsCs(tokens, seg);
    let elapsedMs = 0;
    return tokens
      .map((t, i) => {
        const startMs = elapsedMs;
        elapsedMs += durations[i] * 10;
        const color = t.accent ? `\\c${accent}\\b1` : `\\c${primary}\\b${baseBold}`;
        // từ ẩn (alpha FF) → bật hiện trong 60ms đúng lúc được đọc tới
        return `{\\alpha&HFF&${color}\\t(${startMs},${startMs + 60},\\alpha&H00&)}${escapeAssText(t.text)}`;
      })
      .join(" ");
  }

  const body = tokens.map((t) => paint(t, escapeAssText(t.text))).join(" ");
  if (effect === "fade") return `{\\fad(180,180)}${body}`;
  if (effect === "pop") return `{\\fscx75\\fscy75\\t(0,160,\\fscx100\\fscy100)}${body}`;
  return body;
}

/**
 * Thẻ ghi đè RIÊNG cho một dòng: vị trí (\pos) và cỡ chữ (\fs).
 * `\an2` khai báo tường minh để điểm neo luôn là GIỮA-DƯỚI khối chữ, không phụ
 * thuộc alignment của Style — nhờ vậy toạ độ khớp đúng với khung xem trước.
 * Trả về chuỗi rỗng khi dòng không có ghi đè (đại đa số dòng).
 */
function lineOverrides(seg: SubtitleSegment, playRes: PlayRes): string {
  const tags: string[] = [];
  if (seg.pos) {
    const x = Math.round(Math.min(1, Math.max(0, seg.pos.x)) * playRes.w);
    const y = Math.round(Math.min(1, Math.max(0, seg.pos.y)) * playRes.h);
    tags.push(`\\an2\\pos(${x},${y})`);
  }
  if (seg.size && seg.size > 0) tags.push(`\\fs${Math.round(seg.size)}`);
  return tags.length ? `{${tags.join("")}}` : "";
}

/**
 * Build a complete .ass document for libass burning.
 * Alignment 2 (bottom-center); vertical position via marginV.
 */
export function buildAss(
  segments: SubtitleSegment[],
  style: SubtitleStyle,
  playRes: PlayRes,
  effect: SubEffect = "none",
): string {
  const primary = hexToAss(style.primary);
  const outline = hexToAss(style.outline);
  const back = hexToAss(style.back ?? "#000000AA");
  // karaoke: SecondaryColour là màu "chưa đọc tới" — libass tự đổ sang primary theo \kf
  const secondary = effect === "karaoke" ? hexToAss(KARAOKE_BASE_COLOR) : primary;

  const header = [
    "[Script Info]",
    "ScriptType: v4.00+",
    `PlayResX: ${playRes.w}`,
    `PlayResY: ${playRes.h}`,
    "WrapStyle: 0",
    "ScaledBorderAndShadow: yes",
    "",
    "[V4+ Styles]",
    "Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding",
    `Style: Default,${style.font},${style.size},${primary},${secondary},${outline},${back},${style.bold ? -1 : 0},0,0,0,100,100,0,0,${style.borderStyle},${style.borderStyle === 3 ? 5 : 2},0,2,${style.marginL ?? 60},${style.marginR ?? 60},${style.marginV},1`,
    "",
    "[Events]",
    "Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text",
  ].join("\n");

  const events = segments
    .filter((s) => s.text.trim().length > 0 && s.endMs > s.startMs)
    .map(
      (s) =>
        `Dialogue: 0,${msToAssTime(s.startMs)},${msToAssTime(s.endMs)},Default,,0,0,0,,${lineOverrides(s, playRes)}${effectText(s, style, effect)}`,
    )
    .join("\n");

  return `${header}\n${events}\n`;
}
