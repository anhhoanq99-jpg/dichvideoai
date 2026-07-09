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

export interface BuildAssOptions {
  /**
   * "bottom" (default): fixed bottom-center subs.
   * "replace": anchor each line at the bottom-center of its original text box
   * (segment.box) with an opaque background box — the VN text covers the
   * original foreign text. Lines without a box fall back to bottom placement.
   */
  placement?: "bottom" | "replace";
}

/** Median original-text-box height (px) → consistent auto font size for replace mode. */
function medianBoxFontSize(
  segments: SubtitleSegment[],
  playResH: number,
  fallback: number,
): number {
  const heights = segments
    .filter((s) => s.box)
    .map((s) => s.box!.h * playResH)
    .sort((a, b) => a - b);
  if (heights.length === 0) return fallback;
  const median = heights[Math.floor(heights.length / 2)];
  return Math.min(120, Math.max(20, Math.round(median * 0.72)));
}

/**
 * Build a complete .ass document for libass burning.
 * Bottom placement: alignment 2 (bottom-center), position via marginV.
 * Replace placement: per-line `\pos` over the original text box.
 */
export function buildAss(
  segments: SubtitleSegment[],
  style: SubtitleStyle,
  playRes: PlayRes,
  options: BuildAssOptions = {},
): string {
  const replace = options.placement === "replace";
  const primary = hexToAss(style.primary);
  const outline = hexToAss(style.outline);
  // replace mode needs a near-opaque box to actually cover the original text
  const back = hexToAss(style.back ?? (replace ? "#000000E6" : "#000000AA"));
  const borderStyle = replace ? 3 : style.borderStyle;
  const size = replace
    ? medianBoxFontSize(segments, playRes.h, style.size)
    : style.size;

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
    `Style: Default,${style.font},${size},${primary},${primary},${outline},${back},0,0,0,0,100,100,0,0,${borderStyle},${borderStyle === 3 ? 4 : 2},0,2,60,60,${style.marginV},1`,
    "",
    "[Events]",
    "Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text",
  ].join("\n");

  const events = segments
    .filter((s) => s.text.trim().length > 0 && s.endMs > s.startMs)
    .map((s) => {
      // anchor at bottom-center of the original box so text sits where the
      // foreign text was (an2 = bottom-center anchor for \pos)
      const posTag =
        replace && s.box
          ? `{\\an2\\pos(${Math.round((s.box.x + s.box.w / 2) * playRes.w)},${Math.round((s.box.y + s.box.h) * playRes.h)})}`
          : "";
      return `Dialogue: 0,${msToAssTime(s.startMs)},${msToAssTime(s.endMs)},Default,,0,0,0,,${posTag}${escapeAssText(s.text)}`;
    })
    .join("\n");

  return `${header}\n${events}\n`;
}
