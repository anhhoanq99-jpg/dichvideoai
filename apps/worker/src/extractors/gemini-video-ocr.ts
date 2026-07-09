import { GoogleGenAI, MediaResolution, createPartFromUri } from "@google/genai";
import { PRICING } from "../lib/usage";
import { refineSegmentBoxes } from "./refine-boxes";
import {
  normalizeSegments,
  type ExtractInput,
  type ExtractResult,
  type SubtitleExtractor,
} from "./types";

const RESPONSE_SCHEMA = {
  type: "array",
  items: {
    type: "object",
    properties: {
      start: { type: "string", description: "mm:ss or hh:mm:ss when the line first appears" },
      end: { type: "string", description: "mm:ss or hh:mm:ss when the line disappears" },
      text: { type: "string", description: "exact subtitle text on screen" },
      box: {
        type: "object",
        description:
          "bounding box of this text line in the frame, integer coordinates on a 0-1000 scale where (0,0) is top-left of the frame",
        properties: {
          x: { type: "integer", description: "left edge, 0-1000" },
          y: { type: "integer", description: "top edge, 0-1000" },
          w: { type: "integer", description: "width, 0-1000" },
          h: { type: "integer", description: "height, 0-1000" },
        },
        required: ["x", "y", "w", "h"],
      },
    },
    required: ["start", "end", "text", "box"],
  },
} as const;

function normBox(raw?: { x: number; y: number; w: number; h: number }) {
  if (!raw) return undefined;
  const clamp01 = (n: number) => Math.min(1, Math.max(0, n / 1000));
  const x = clamp01(raw.x);
  const y = clamp01(raw.y);
  const w = Math.min(1 - x, Math.max(0.01, raw.w / 1000));
  const h = Math.min(1 - y, Math.max(0.01, raw.h / 1000));
  return { x, y, w, h };
}

function timecodeToMs(tc: string): number {
  const parts = tc.split(":").map((p) => Number.parseFloat(p));
  if (parts.some(Number.isNaN)) return NaN;
  const [h, m, s] =
    parts.length === 3 ? parts : parts.length === 2 ? [0, ...parts] : [0, 0, parts[0]];
  return Math.round((h * 3600 + m * 60 + s) * 1000);
}

/**
 * Reads burned-in (hardcoded) subtitles from video frames via Gemini video
 * understanding. Config (model, mediaResolution) driven by the Phase 2 spike.
 */
export class GeminiVideoOcrExtractor implements SubtitleExtractor {
  readonly id = "gemini-video-ocr" as const;

  constructor(
    private readonly model = process.env.GEMINI_OCR_MODEL ?? "gemini-2.5-flash",
  ) {}

  async extract(
    input: ExtractInput,
    onProgress: (pct: number) => void,
  ): Promise<ExtractResult> {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) throw new Error("GEMINI_API_KEY chưa được cấu hình");
    const ai = new GoogleGenAI({ apiKey });

    // 1. upload to Files API (handles up to ~2GB) and wait until ACTIVE
    let file = await ai.files.upload({ file: input.localPath });
    onProgress(20);
    const uploadDeadline = Date.now() + 10 * 60_000;
    while (file.state === "PROCESSING") {
      if (Date.now() > uploadDeadline) throw new Error("Gemini Files API: xử lý file quá lâu");
      await new Promise((r) => setTimeout(r, 5000));
      file = await ai.files.get({ name: file.name! });
    }
    if (file.state !== "ACTIVE") {
      throw new Error(`Gemini Files API: trạng thái file ${file.state}`);
    }
    onProgress(40);

    // 2. extract subtitles with timestamps
    const langHint = input.sourceLang
      ? ` The subtitles are in language code "${input.sourceLang}".`
      : "";
    const res = await ai.models.generateContent({
      model: this.model,
      contents: [
        createPartFromUri(file.uri!, file.mimeType!),
        `Extract every burned-in (hardcoded) text line shown in this video.${langHint} ` +
          "Include subtitle captions AND any other overlaid foreign text (titles, labels) that a viewer would want translated — " +
          "but NOT watermarks, channel names or logos. " +
          "For each distinct text line, give: the timestamp where it appears (start) and disappears (end), " +
          "its exact text, and its bounding box on a 0-1000 coordinate scale (x=left, y=top, w=width, h=height). " +
          "If the same line appears in multiple places at once, output one entry per location. " +
          "Preserve original language and punctuation.",
      ],
      config: {
        responseMimeType: "application/json",
        responseSchema: RESPONSE_SCHEMA,
        mediaResolution: MediaResolution.MEDIA_RESOLUTION_LOW,
      },
    });
    onProgress(90);

    const raw = JSON.parse(res.text ?? "[]") as {
      start: string;
      end: string;
      text: string;
      box?: { x: number; y: number; w: number; h: number };
    }[];
    const segments = normalizeSegments(
      raw
        .map((r) => ({
          startMs: timecodeToMs(r.start),
          endMs: timecodeToMs(r.end),
          text: r.text,
          box: normBox(r.box),
        }))
        .filter((r) => !Number.isNaN(r.startMs) && !Number.isNaN(r.endMs)),
    );
    onProgress(70);

    const inTok = res.usageMetadata?.promptTokenCount ?? 0;
    const outTok = res.usageMetadata?.candidatesTokenCount ?? 0;

    // best-effort cleanup of uploaded file
    await ai.files.delete({ name: file.name! }).catch(() => {});

    // video-pass boxes are approximate → re-locate on still frames (much more accurate)
    const refinedResult = await refineSegmentBoxes(
      ai,
      this.model,
      input.localPath,
      segments,
      (pct) => onProgress(70 + Math.round(pct * 0.25)),
    );

    return {
      segments: refinedResult.segments,
      lang: input.sourceLang ?? "unknown",
      usage: [
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
        ...refinedResult.usage,
      ],
    };
  }
}
