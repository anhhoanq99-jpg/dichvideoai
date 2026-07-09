import path from "node:path";
import type { Job } from "bullmq";
import { and, eq } from "drizzle-orm";
import { createDb, jobs, subtitleTracks, videos } from "@dichvideo/db";
import type { JobPayload } from "@dichvideo/shared";
import { GeminiVideoOcrExtractor } from "../extractors/gemini-video-ocr";
import { GroqWhisperExtractor } from "../extractors/groq-whisper";
import type { SubtitleExtractor } from "../extractors/types";
import { chainJob } from "../lib/chain";
import { cleanupJobDir, downloadFromR2, jobTempDir } from "../lib/r2";
import { recordUsage } from "../lib/usage";
import { logger } from "../logger";

/** Shared pipeline for stt/ocr jobs — download → extract → persist track + usage. */
async function runExtraction(job: Job<JobPayload>, extractor: SubtitleExtractor) {
  const db = createDb();
  const [video] = await db
    .select()
    .from(videos)
    .where(eq(videos.id, job.data.videoId));
  if (!video?.r2Key) throw new Error(`Video ${job.data.videoId} has no r2Key`);
  if (!video.durationSec) throw new Error("Video chưa được probe (thiếu duration)");

  const dir = await jobTempDir(job.data.jobId);
  try {
    const localPath = path.join(dir, path.basename(video.r2Key));
    await downloadFromR2(video.r2Key, localPath);
    await job.updateProgress(10);

    const sourceLang =
      typeof job.data.params.sourceLang === "string"
        ? job.data.params.sourceLang
        : undefined;

    const result = await extractor.extract(
      { localPath, durationSec: video.durationSec, sourceLang },
      (pct) => void job.updateProgress(Math.min(95, Math.max(10, pct))),
    );

    if (result.segments.length === 0) {
      throw new Error(
        extractor.id === "groq-whisper"
          ? "Không nhận dạng được lời thoại nào trong video"
          : "Không tìm thấy phụ đề gắn cứng nào trong video",
      );
    }

    const costUsdMicros = await recordUsage(job.data.jobId, result.usage);

    // re-extract = overwrite: một video chỉ giữ một track gốc, tránh track cũ/hỏng lẫn vào bước dịch
    await db
      .delete(subtitleTracks)
      .where(
        and(
          eq(subtitleTracks.videoId, video.id),
          eq(subtitleTracks.kind, "original"),
        ),
      );
    await db.insert(subtitleTracks).values({
      videoId: video.id,
      kind: "original",
      lang: result.lang,
      segments: result.segments,
    });
    await db
      .update(jobs)
      .set({ costUsdMicros, result: { segmentCount: result.segments.length } })
      .where(eq(jobs.id, job.data.jobId));
    await db.update(videos).set({ status: "ready" }).where(eq(videos.id, video.id));

    logger.info(
      {
        jobId: job.data.jobId,
        extractor: extractor.id,
        segments: result.segments.length,
        costUsdMicros,
      },
      "extraction done",
    );

    // pipeline một chạm: trích xong tự dịch (style/glossary đã lưu trên video)
    if (job.data.params.thenTranslate === true) {
      const nextId = await chainJob({
        videoId: video.id,
        userId: job.data.userId,
        type: "translate",
        params: { style: video.translationStyle ?? "natural" },
      });
      logger.info({ videoId: video.id, nextId }, "chained translate");
    }

    return { segmentCount: result.segments.length };
  } finally {
    await cleanupJobDir(job.data.jobId);
  }
}

export const sttProcessor = (job: Job<JobPayload>) =>
  runExtraction(job, new GroqWhisperExtractor());

export const ocrProcessor = (job: Job<JobPayload>) =>
  runExtraction(job, new GeminiVideoOcrExtractor());
