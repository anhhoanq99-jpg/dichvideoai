import type { SubtitleSegment } from "@dichvideo/shared";
import type { UsageRecord } from "../lib/usage";

export interface ExtractInput {
  localPath: string;
  durationSec: number;
  sourceLang?: string;
}

export interface ExtractResult {
  segments: SubtitleSegment[];
  lang: string;
  usage: UsageRecord[];
}

export interface SubtitleExtractor {
  readonly id: "groq-whisper" | "gemini-video-ocr" | "paddle-ocr";
  extract(
    input: ExtractInput,
    onProgress: (pct: number) => void,
  ): Promise<ExtractResult>;
}

type RawSegment = {
  startMs: number;
  endMs: number;
  text: string;
  box?: SubtitleSegment["box"];
};

function sameSpot(a?: SubtitleSegment["box"], b?: SubtitleSegment["box"]) {
  if (!a || !b) return !a && !b;
  return (
    Math.abs(a.x - b.x) < 0.08 &&
    Math.abs(a.y - b.y) < 0.08 &&
    Math.abs(a.w - b.w) < 0.15 &&
    Math.abs(a.h - b.h) < 0.15
  );
}

/**
 * Normalize raw timed lines: drop empties, sort, merge tiny gaps, reindex.
 * Boxless tracks (STT) are treated as one stream — overlaps clamped.
 * Boxed tracks (OCR) may legitimately have simultaneous lines at different
 * positions, so overlaps are kept; only same-spot duplicates merge.
 */
export function normalizeSegments(raw: RawSegment[]): SubtitleSegment[] {
  const sorted = raw
    .map((s) => ({ ...s, text: s.text.trim() }))
    .filter((s) => s.text.length > 0 && s.endMs > s.startMs)
    .sort((a, b) => a.startMs - b.startMs);

  const merged: RawSegment[] = [];
  for (const seg of sorted) {
    const continuation = merged.find(
      (m) =>
        m.text === seg.text &&
        seg.startMs - m.endMs < 300 &&
        seg.startMs - m.endMs > -100 &&
        sameSpot(m.box, seg.box),
    );
    if (continuation) {
      continuation.endMs = Math.max(continuation.endMs, seg.endMs);
      continue;
    }
    const prev = merged[merged.length - 1];
    if (prev && !seg.box && !prev.box && seg.startMs < prev.endMs) {
      seg.startMs = prev.endMs; // single-stream clamp (STT)
      if (seg.endMs <= seg.startMs) continue;
    }
    merged.push({ ...seg });
  }

  return merged.map((s, i) => ({
    i,
    startMs: s.startMs,
    endMs: s.endMs,
    text: s.text,
    ...(s.box ? { box: s.box } : {}),
  }));
}
