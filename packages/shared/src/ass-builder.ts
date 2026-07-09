import type { SubtitleStyle } from "./render-presets";
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

/**
 * Build a complete .ass document for libass burning.
 * Alignment 2 (bottom-center); vertical position via marginV.
 */
export function buildAss(
  segments: SubtitleSegment[],
  style: SubtitleStyle,
  playRes: PlayRes,
): string {
  const primary = hexToAss(style.primary);
  const outline = hexToAss(style.outline);
  const back = hexToAss(style.back ?? "#000000AA");

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
    `Style: Default,${style.font},${style.size},${primary},${primary},${outline},${back},${style.bold ? -1 : 0},0,0,0,100,100,0,0,${style.borderStyle},${style.borderStyle === 3 ? 5 : 2},0,2,60,60,${style.marginV},1`,
    "",
    "[Events]",
    "Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text",
  ].join("\n");

  const events = segments
    .filter((s) => s.text.trim().length > 0 && s.endMs > s.startMs)
    .map(
      (s) =>
        `Dialogue: 0,${msToAssTime(s.startMs)},${msToAssTime(s.endMs)},Default,,0,0,0,,${escapeAssText(s.text)}`,
    )
    .join("\n");

  return `${header}\n${events}\n`;
}
