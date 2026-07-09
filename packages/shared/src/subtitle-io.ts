import type { SubtitleSegment } from "./types";

function pad(n: number, len = 2) {
  return String(n).padStart(len, "0");
}

/** ms → "HH:MM:SS,mmm" (SRT) or "HH:MM:SS.mmm" (VTT) */
function msToTimestamp(ms: number, sep: "," | "."): string {
  const h = Math.floor(ms / 3_600_000);
  const m = Math.floor((ms % 3_600_000) / 60_000);
  const s = Math.floor((ms % 60_000) / 1000);
  const milli = ms % 1000;
  return `${pad(h)}:${pad(m)}:${pad(s)}${sep}${pad(milli, 3)}`;
}

export function segmentsToSrt(segments: SubtitleSegment[]): string {
  return segments
    .map(
      (s, idx) =>
        `${idx + 1}\n${msToTimestamp(s.startMs, ",")} --> ${msToTimestamp(s.endMs, ",")}\n${s.text}`,
    )
    .join("\n\n") + "\n";
}

export function segmentsToVtt(segments: SubtitleSegment[]): string {
  const body = segments
    .map(
      (s) =>
        `${msToTimestamp(s.startMs, ".")} --> ${msToTimestamp(s.endMs, ".")}\n${s.text}`,
    )
    .join("\n\n");
  return `WEBVTT\n\n${body}\n`;
}

const TIME_RE =
  /^(?:(\d{1,2}):)?(\d{1,2}):(\d{1,2})[,.](\d{1,3})$/;

function timestampToMs(raw: string): number | null {
  const m = TIME_RE.exec(raw.trim());
  if (!m) return null;
  const [, h = "0", min, sec, milli] = m;
  return (
    Number(h) * 3_600_000 +
    Number(min) * 60_000 +
    Number(sec) * 1000 +
    Number(milli.padEnd(3, "0"))
  );
}

/** Parse SRT text (tolerates BOM, CRLF, missing indices, multiline cues). */
export function parseSrt(content: string): SubtitleSegment[] {
  const text = content.replace(/^﻿/, "").replace(/\r\n/g, "\n");
  const blocks = text.split(/\n{2,}/);
  const out: SubtitleSegment[] = [];

  for (const block of blocks) {
    const lines = block.split("\n").filter((l) => l.trim().length > 0);
    if (lines.length === 0) continue;
    // optional numeric index on first line
    let cursor = /^\d+$/.test(lines[0].trim()) ? 1 : 0;
    const timeLine = lines[cursor];
    if (!timeLine?.includes("-->")) continue;
    const [rawStart, rawEnd] = timeLine.split("-->");
    const startMs = timestampToMs(rawStart ?? "");
    const endMs = timestampToMs(rawEnd ?? "");
    if (startMs === null || endMs === null || endMs <= startMs) continue;
    const cueText = lines.slice(cursor + 1).join("\n").trim();
    if (!cueText) continue;
    out.push({ i: out.length, startMs, endMs, text: cueText });
  }
  return out;
}
