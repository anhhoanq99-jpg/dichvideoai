import type {
  AspectId,
  CoverMode,
  CoverRegion,
  SubtitleSegment,
} from "@dichvideo/shared";

export interface FiltergraphInput {
  srcWidth: number;
  srcHeight: number;
  coverMode: CoverMode;
  region?: CoverRegion;
  /** for coverMode="auto": segments carrying per-line boxes + time windows */
  segments?: SubtitleSegment[];
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

interface CoverCluster {
  box: CoverRegion;
  /** [startSec, endSec][] windows this cluster is visible */
  windows: [number, number][];
}

function intersects(a: CoverRegion, b: CoverRegion, pad = 0.02): boolean {
  return !(
    a.x + a.w + pad < b.x ||
    b.x + b.w + pad < a.x ||
    a.y + a.h + pad < b.y ||
    b.y + b.h + pad < a.y
  );
}

function unionBox(a: CoverRegion, b: CoverRegion): CoverRegion {
  const x = Math.min(a.x, b.x);
  const y = Math.min(a.y, b.y);
  return {
    x,
    y,
    w: Math.max(a.x + a.w, b.x + b.w) - x,
    h: Math.max(a.y + a.h, b.y + b.h) - y,
  };
}

const MAX_CLUSTERS = 24;

/**
 * Group per-segment text boxes into few spatial clusters, each carrying the
 * time windows when it must be covered. Keeps the filtergraph small even for
 * videos with hundreds of subtitle lines.
 */
export function clusterCoverRegions(segments: SubtitleSegment[]): CoverCluster[] {
  const clusters: CoverCluster[] = [];
  for (const seg of segments) {
    if (!seg.box) continue;
    // pad the box slightly so blur fully covers glyph edges
    const box: CoverRegion = {
      x: Math.max(0, seg.box.x - 0.01),
      y: Math.max(0, seg.box.y - 0.01),
      w: Math.min(1, seg.box.w + 0.02),
      h: Math.min(1, seg.box.h + 0.02),
    };
    const win: [number, number] = [
      Math.max(0, seg.startMs / 1000 - 0.15),
      seg.endMs / 1000 + 0.15,
    ];
    const hit = clusters.find((c) => intersects(c.box, box));
    if (hit) {
      hit.box = unionBox(hit.box, box);
      const last = hit.windows[hit.windows.length - 1];
      if (last && win[0] <= last[1] + 0.3) {
        last[1] = Math.max(last[1], win[1]); // merge adjacent windows
      } else {
        hit.windows.push(win);
      }
    } else {
      clusters.push({ box, windows: [win] });
    }
  }
  // over budget → merge nearest pairs until under cap
  while (clusters.length > MAX_CLUSTERS) {
    let bi = 0, bj = 1, best = Infinity;
    for (let i = 0; i < clusters.length; i++) {
      for (let j = i + 1; j < clusters.length; j++) {
        const a = clusters[i].box, b = clusters[j].box;
        const d =
          Math.abs(a.x + a.w / 2 - (b.x + b.w / 2)) +
          Math.abs(a.y + a.h / 2 - (b.y + b.h / 2));
        if (d < best) {
          best = d;
          bi = i;
          bj = j;
        }
      }
    }
    clusters[bi].box = unionBox(clusters[bi].box, clusters[bj].box);
    clusters[bi].windows.push(...clusters[bj].windows);
    clusters[bi].windows.sort((a, b) => a[0] - b[0]);
    clusters.splice(bj, 1);
  }
  return clusters;
}

function enableExpr(windows: [number, number][]): string {
  return windows
    .map(([a, b]) => `between(t,${a.toFixed(2)},${b.toFixed(2)})`)
    .join("+");
}

/**
 * Compose the full -filter_complex graph:
 *   cover (source coordinate space) → aspect reframe → ass burn
 * Returns the graph string; final labeled output is [v].
 */
export function buildFiltergraph(input: FiltergraphInput): string {
  const steps: string[] = [];
  let current = "[0:v]";

  // 1a. auto cover — one time-enabled step per spatial cluster
  if (input.coverMode === "auto" && input.segments) {
    const clusters = clusterCoverRegions(input.segments);
    clusters.forEach((cluster, idx) => {
      const r = regionToPixels(cluster.box, input.srcWidth, input.srcHeight);
      const en = enableExpr(cluster.windows);
      steps.push(
        `${current}split[m${idx}][fb${idx}]`,
        `[fb${idx}]crop=${r.w}:${r.h}:${r.x}:${r.y},boxblur=luma_radius=12:luma_power=2[bl${idx}]`,
        `[m${idx}][bl${idx}]overlay=${r.x}:${r.y}:enable='${en}'[ac${idx}]`,
      );
      current = `[ac${idx}]`;
    });
  }

  // 1b. manual cover — static region, whole duration
  if ((input.coverMode === "blur" || input.coverMode === "box") && input.region) {
    const r = regionToPixels(input.region, input.srcWidth, input.srcHeight);
    if (input.coverMode === "blur") {
      steps.push(
        `${current}split[main][forblur]`,
        `[forblur]crop=${r.w}:${r.h}:${r.x}:${r.y},boxblur=luma_radius=12:luma_power=2[blr]`,
        `[main][blr]overlay=${r.x}:${r.y}[cov]`,
      );
    } else {
      steps.push(
        `${current}drawbox=x=${r.x}:y=${r.y}:w=${r.w}:h=${r.h}:color=0x101010@1:t=fill[cov]`,
      );
    }
    current = "[cov]";
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
