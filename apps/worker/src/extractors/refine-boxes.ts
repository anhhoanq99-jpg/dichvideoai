import { readFile } from "node:fs/promises";
import path from "node:path";
import type { GoogleGenAI } from "@google/genai";
import type { SubtitleSegment } from "@dichvideo/shared";
import { extractFrameJpeg } from "../lib/ffmpeg";
import { PRICING, type UsageRecord } from "../lib/usage";
import { logger } from "../logger";

/** Max still frames sent for refinement — segments beyond inherit from neighbors. */
const MAX_FRAMES = 80;
const BATCH_SIZE = 8;

const REFINE_SCHEMA = {
  type: "array",
  items: {
    type: "object",
    properties: {
      frame: { type: "integer", description: "frame number as labeled in the prompt" },
      found: { type: "boolean", description: "whether the text is visible in the frame" },
      box: {
        type: "object",
        description: "tight bounding box of the text, 0-1000 scale, (0,0)=top-left",
        properties: {
          x: { type: "integer" },
          y: { type: "integer" },
          w: { type: "integer" },
          h: { type: "integer" },
        },
        required: ["x", "y", "w", "h"],
      },
    },
    required: ["frame", "found"],
  },
} as const;

interface RefineTarget {
  segIdx: number;
  tSec: number;
  text: string;
}

/**
 * Video-pass boxes from Gemini are approximate. This pass re-locates each
 * line on a still frame at the segment midpoint — image bboxes are far more
 * accurate than video ones. Segments not refined (cap) inherit the refined
 * box of the nearest same-spot neighbor.
 */
export async function refineSegmentBoxes(
  ai: GoogleGenAI,
  model: string,
  videoPath: string,
  segments: SubtitleSegment[],
  onProgress: (pct: number) => void,
): Promise<{ segments: SubtitleSegment[]; usage: UsageRecord[] }> {
  const boxed = segments.filter((s) => s.box);
  if (boxed.length === 0) return { segments, usage: [] };

  // pick refinement targets: all if under cap, else even sampling
  const step = Math.max(1, Math.ceil(boxed.length / MAX_FRAMES));
  const targets: RefineTarget[] = boxed
    .filter((_, k) => k % step === 0)
    .map((s) => ({
      segIdx: s.i,
      tSec: (s.startMs + s.endMs) / 2000,
      text: s.text,
    }));

  const refined = new Map<number, SubtitleSegment["box"]>();
  const usage: UsageRecord[] = [];
  const dir = path.dirname(videoPath);

  for (let b = 0; b < targets.length; b += BATCH_SIZE) {
    const batch = targets.slice(b, b + BATCH_SIZE);

    const parts: ({ text: string } | { inlineData: { mimeType: string; data: string } })[] = [];
    for (const [k, t] of batch.entries()) {
      const framePath = path.join(dir, `refine_${b + k}.jpg`);
      try {
        await extractFrameJpeg(videoPath, t.tSec, framePath);
        const data = (await readFile(framePath)).toString("base64");
        parts.push({ text: `Frame ${k}: locate this exact text: "${t.text}"` });
        parts.push({ inlineData: { mimeType: "image/jpeg", data } });
      } catch (err) {
        logger.warn({ err: String(err) }, "frame extract failed, skipping");
      }
    }
    if (parts.length === 0) continue;
    parts.push({
      text:
        "For each numbered frame above, return the tight bounding box of the quoted text " +
        "on a 0-1000 coordinate scale (x=left, y=top, w=width, h=height of the whole text line). " +
        "Set found=false if the text is not visible.",
    });

    try {
      const res = await ai.models.generateContent({
        model,
        contents: parts,
        config: {
          responseMimeType: "application/json",
          responseSchema: REFINE_SCHEMA,
          temperature: 0,
        },
      });
      const inTok = res.usageMetadata?.promptTokenCount ?? 0;
      const outTok = res.usageMetadata?.candidatesTokenCount ?? 0;
      usage.push(
        {
          provider: "gemini",
          metric: "tokens_in",
          quantity: inTok,
          costUsdMicros: inTok * PRICING.gemini25FlashInPerTok,
        },
        {
          provider: "gemini",
          metric: "tokens_out",
          quantity: outTok,
          costUsdMicros: outTok * PRICING.gemini25FlashOutPerTok,
        },
      );

      const rows = JSON.parse(res.text ?? "[]") as {
        frame: number;
        found: boolean;
        box?: { x: number; y: number; w: number; h: number };
      }[];
      for (const row of rows) {
        const target = batch[row.frame];
        if (!target || !row.found || !row.box) continue;
        const clamp01 = (n: number) => Math.min(1, Math.max(0, n / 1000));
        const x = clamp01(row.box.x);
        const y = clamp01(row.box.y);
        refined.set(target.segIdx, {
          x,
          y,
          w: Math.min(1 - x, Math.max(0.01, row.box.w / 1000)),
          h: Math.min(1 - y, Math.max(0.01, row.box.h / 1000)),
        });
      }
    } catch (err) {
      logger.warn({ err: String(err) }, "refine batch failed, keeping video-pass boxes");
    }
    onProgress(Math.round(((b + batch.length) / targets.length) * 100));
  }

  logger.info(
    { targets: targets.length, refined: refined.size },
    "bbox refinement done",
  );

  // apply: refined box directly, else nearest refined neighbor whose
  // video-pass box was at the same spot (same subtitle strip)
  const out = segments.map((s) => {
    if (!s.box) return s;
    const own = refined.get(s.i);
    if (own) return { ...s, box: own };
    let best: { box: SubtitleSegment["box"]; d: number } | undefined;
    for (const [idx, box] of refined) {
      const ref = segments.find((x) => x.i === idx);
      if (!ref?.box) continue;
      const sameSpot =
        Math.abs(ref.box.y - s.box!.y) < 0.1 && Math.abs(ref.box.x - s.box!.x) < 0.15;
      if (!sameSpot) continue;
      const d = Math.abs(ref.startMs - s.startMs);
      if (!best || d < best.d) best = { box, d };
    }
    // keep own width (text length varies), adopt refined y/height/center
    if (best?.box) {
      const cx = s.box!.x + s.box!.w / 2;
      return {
        ...s,
        box: {
          x: Math.max(0, cx - s.box!.w / 2),
          y: best.box.y,
          w: s.box!.w,
          h: best.box.h,
        },
      };
    }
    return s;
  });

  return { segments: out, usage };
}
