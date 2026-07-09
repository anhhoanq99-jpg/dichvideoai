/**
 * SPIKE (Phase 2 gate): benchmark Gemini video OCR on real hardsub videos.
 *
 * Usage:  tsx scripts/spike-gemini-ocr.ts <video1.mp4> [video2.mp4 ...]
 * Needs:  GEMINI_API_KEY in root .env; sample videos with burned-in subs (5-10 min).
 *
 * Gate (from phase-02 plan): >=90% line accuracy (manual eyeball vs ground truth),
 * timestamps within ±1s, cost <= $0.10 per 10 min.
 * Record results in plans/260709-video-localization-platform/reports/spike-gemini-ocr.md
 */
import { config } from "dotenv";
config();
config({ path: "../../.env" });

import { GeminiVideoOcrExtractor } from "../src/extractors/gemini-video-ocr";
import { ffprobe } from "../src/lib/ffmpeg";

const MODELS = ["gemini-2.5-flash", "gemini-3-flash"] as const;

async function main() {
  const files = process.argv.slice(2);
  if (files.length === 0) {
    console.error("Cách dùng: tsx scripts/spike-gemini-ocr.ts <video1.mp4> [video2.mp4 ...]");
    process.exit(1);
  }
  if (!process.env.GEMINI_API_KEY) {
    console.error("GEMINI_API_KEY chưa có trong .env — không chạy được spike");
    process.exit(1);
  }

  for (const file of files) {
    const meta = await ffprobe(file);
    console.log(`\n=== ${file} (${meta.durationSec}s, ${meta.width}x${meta.height}) ===`);

    for (const model of MODELS) {
      const extractor = new GeminiVideoOcrExtractor(model);
      const t0 = Date.now();
      try {
        const res = await extractor.extract(
          { localPath: file, durationSec: meta.durationSec },
          () => {},
        );
        const wallSec = Math.round((Date.now() - t0) / 1000);
        const totalCostUsd =
          res.usage.reduce((a, u) => a + u.costUsdMicros, 0) / 1e6;
        const per10minUsd = meta.durationSec
          ? (totalCostUsd / meta.durationSec) * 600
          : 0;

        console.log(`\n--- ${model} ---`);
        console.log(`segments: ${res.segments.length}, wall: ${wallSec}s`);
        console.log(
          `tokens in/out: ${res.usage.find((u) => u.metric === "tokens_in")?.quantity} / ${res.usage.find((u) => u.metric === "tokens_out")?.quantity}`,
        );
        console.log(
          `cost: $${totalCostUsd.toFixed(4)} (≈ $${per10minUsd.toFixed(4)} / 10 phút) — gate: <= $0.10`,
        );
        console.log("first 10 segments (eyeball accuracy + timestamp check):");
        for (const s of res.segments.slice(0, 10)) {
          const t = (ms: number) => new Date(ms).toISOString().slice(11, 19);
          console.log(`  [${t(s.startMs)} → ${t(s.endMs)}] ${s.text}`);
        }
      } catch (err) {
        console.error(`--- ${model} FAILED:`, err instanceof Error ? err.message : err);
      }
    }
  }
  console.log(
    "\nGhi kết quả vào plans/260709-video-localization-platform/reports/spike-gemini-ocr.md",
  );
}

void main();
