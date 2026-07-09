import type { AspectId, CoverMode, CoverRegion } from "@dichvideo/shared";

export interface FiltergraphInput {
  srcWidth: number;
  srcHeight: number;
  coverMode: CoverMode;
  /** manual cover regions — each blurred/boxed for the whole duration */
  regions?: CoverRegion[];
  aspect: AspectId;
  /** absolute path to subs.ass */
  assPath: string;
  /** absolute path to bundled fonts dir */
  fontsDir: string;
}

/** Escape a path for use inside an ffmpeg filter argument (Windows colons/backslashes). */
export function escapeFilterPath(p: string): string {
  return p.replace(/\\/g, "/").replace(/:/g, "\\:");
}

/** Denormalize region → even-numbered pixel rect clamped to frame. */
export function regionToPixels(
  region: CoverRegion,
  srcWidth: number,
  srcHeight: number,
) {
  const evenCoord = (n: number) => Math.max(0, Math.floor(n / 2) * 2);
  const evenSize = (n: number) => Math.max(2, Math.floor(n / 2) * 2);
  const x = evenCoord(Math.min(Math.max(region.x, 0), 1) * srcWidth);
  const y = evenCoord(Math.min(Math.max(region.y, 0), 1) * srcHeight);
  const w = evenSize(Math.min(region.w, 1) * srcWidth);
  const h = evenSize(Math.min(region.h, 1) * srcHeight);
  return {
    x: Math.min(x, srcWidth - 2),
    y: Math.min(y, srcHeight - 2),
    w: Math.min(w, srcWidth - x),
    h: Math.min(h, srcHeight - y),
  };
}

const ASPECT_DIMS: Record<Exclude<AspectId, "keep">, { w: number; h: number }> = {
  "16:9": { w: 1920, h: 1080 },
  "9:16": { w: 1080, h: 1920 },
  "1:1": { w: 1080, h: 1080 },
};

/** Output resolution the ASS PlayRes must match. */
export function outputResolution(input: {
  srcWidth: number;
  srcHeight: number;
  aspect: AspectId;
}): { w: number; h: number } {
  if (input.aspect === "keep") return { w: input.srcWidth, h: input.srcHeight };
  return ASPECT_DIMS[input.aspect];
}

/**
 * Map a normalized source-space box to OUTPUT pixel space, following the same
 * transform the aspect reframe applies (scale to fit, centered — matches
 * `scale=force_original_aspect_ratio=decrease` + centered overlay).
 */
export function mapSourceBoxToOutput(
  box: CoverRegion,
  srcWidth: number,
  srcHeight: number,
  aspect: AspectId,
): { x: number; y: number; w: number; h: number } {
  if (aspect === "keep") {
    return {
      x: Math.round(box.x * srcWidth),
      y: Math.round(box.y * srcHeight),
      w: Math.round(box.w * srcWidth),
      h: Math.round(box.h * srcHeight),
    };
  }
  const out = ASPECT_DIMS[aspect];
  const s = Math.min(out.w / srcWidth, out.h / srcHeight);
  const ox = (out.w - srcWidth * s) / 2;
  const oy = (out.h - srcHeight * s) / 2;
  return {
    x: Math.round(ox + box.x * srcWidth * s),
    y: Math.round(oy + box.y * srcHeight * s),
    w: Math.round(box.w * srcWidth * s),
    h: Math.round(box.h * srcHeight * s),
  };
}

/** subBox → ASS style margins (an2 bottom-center inside the box). */
export function subBoxToMargins(
  box: CoverRegion,
  srcWidth: number,
  srcHeight: number,
  aspect: AspectId,
): { marginL: number; marginR: number; marginV: number } {
  const out = outputResolution({ srcWidth, srcHeight, aspect });
  const px = mapSourceBoxToOutput(box, srcWidth, srcHeight, aspect);
  return {
    marginL: Math.max(0, px.x),
    marginR: Math.max(0, out.w - (px.x + px.w)),
    marginV: Math.max(0, out.h - (px.y + px.h)),
  };
}

/**
 * Compose the full -filter_complex graph:
 *   covers (source coordinate space) → aspect reframe → ass burn
 * Returns the graph string; final labeled output is [v].
 */
export function buildFiltergraph(input: FiltergraphInput): string {
  const steps: string[] = [];
  let current = "[0:v]";

  // 1. cover original text — one step per manual region, source pixel space
  if (input.coverMode !== "none" && input.regions?.length) {
    input.regions.forEach((region, idx) => {
      const r = regionToPixels(region, input.srcWidth, input.srcHeight);
      if (input.coverMode === "blur") {
        steps.push(
          `${current}split[m${idx}][fb${idx}]`,
          `[fb${idx}]crop=${r.w}:${r.h}:${r.x}:${r.y},boxblur=luma_radius=12:luma_power=2[bl${idx}]`,
          `[m${idx}][bl${idx}]overlay=${r.x}:${r.y}[cov${idx}]`,
        );
      } else {
        steps.push(
          `${current}drawbox=x=${r.x}:y=${r.y}:w=${r.w}:h=${r.h}:color=0x101010@1:t=fill[cov${idx}]`,
        );
      }
      current = `[cov${idx}]`;
    });
  }

  // 2. aspect reframe — blurred-pad background, source centered
  if (input.aspect !== "keep") {
    const { w, h } = ASPECT_DIMS[input.aspect];
    steps.push(
      `${current}split[bgsrc][fgsrc]`,
      `[bgsrc]scale=${w}:${h}:force_original_aspect_ratio=increase,crop=${w}:${h},boxblur=20:5[bg]`,
      `[fgsrc]scale=${w}:${h}:force_original_aspect_ratio=decrease[fg]`,
      `[bg][fg]overlay=(W-w)/2:(H-h)/2[framed]`,
    );
    current = "[framed]";
  }

  // 3. burn Vietnamese subs
  steps.push(
    `${current}ass=filename='${escapeFilterPath(input.assPath)}':fontsdir='${escapeFilterPath(input.fontsDir)}'[v]`,
  );

  return steps.join(";");
}
