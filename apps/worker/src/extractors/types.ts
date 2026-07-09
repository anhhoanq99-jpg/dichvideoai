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

/** Normalize raw timed lines: drop empties, sort, merge tiny gaps, clamp overlaps, reindex. */
export function normalizeSegments(
  raw: { startMs: number; endMs: number; text: string }[],
): SubtitleSegment[] {
  const sorted = raw
    .map((s) => ({ ...s, text: s.text.trim() }))
    .filter((s) => s.text.length > 0 && s.endMs > s.startMs)
    .sort((a, b) => a.startMs - b.startMs);

  const merged: typeof sorted = [];
  for (const seg of sorted) {
    const prev = merged[merged.length - 1];
    if (prev && seg.text === prev.text && seg.startMs - prev.endMs < 300) {
      prev.endMs = seg.endMs; // same line continued across a tiny gap
      continue;
    }
    if (prev && seg.startMs < prev.endMs) {
      seg.startMs = prev.endMs; // clamp overlap
      if (seg.endMs <= seg.startMs) continue;
    }
    merged.push({ ...seg });
  }

  return merged.map((s, i) => ({ i, startMs: s.startMs, endMs: s.endMs, text: s.text }));
}
