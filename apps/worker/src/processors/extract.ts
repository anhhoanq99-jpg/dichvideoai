import path from "node:path";
import { UnrecoverableError, type Job } from "bullmq";
import { and, eq } from "drizzle-orm";
import { createDb, jobs, subtitleTracks, videos } from "@dichvideo/db";
import type { JobPayload } from "@dichvideo/shared";
import { GeminiVideoOcrExtractor } from "../extractors/gemini-video-ocr";
import { GroqWhisperExtractor } from "../extractors/groq-whisper";
import type { SubtitleExtractor } from "../extractors/types";
import { chainJob } from "../lib/chain";
import { ffprobe } from "../lib/ffmpeg";
import { isBillingDepletedError, isDailyQuotaError } from "../lib/gemini-limits";
import { cleanupJobDir, downloadFromR2, jobTempDir } from "../lib/r2";
import { recordUsage } from "../lib/usage";
import { logger } from "../logger";

/** Key Gemini chết hẳn (hết tiền trả trước / hết lượt ngày) — OCR không thể chạy. */
function isGeminiUnavailable(err: unknown): boolean {
  return (
    (err instanceof Error && err.name === "UnrecoverableError") ||
    isDailyQuotaError(err) ||
    isBillingDepletedError(err)
  );
}

/** Shared pipeline for stt/ocr jobs — download → extract → persist track + usage. */
async function runExtraction(job: Job<JobPayload>, extractor: SubtitleExtractor) {
  const db = createDb();
  const [video] = await db
    .select()
    .from(videos)
    .where(eq(videos.id, job.data.videoId));
  if (!video?.r2Key) throw new Error("Video không tồn tại hoặc chưa upload xong");
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

    const extractInput = { localPath, durationSec: video.durationSec, sourceLang };
    const onProgress = (pct: number) =>
      void job.updateProgress(Math.min(95, Math.max(10, pct)));

    let activeExtractor = extractor;
    let result;
    try {
      result = await activeExtractor.extract(extractInput, onProgress);
    } catch (err) {
      // OCR chết vì Gemini hết tiền/hết lượt → video có tiếng nói thì tự
      // chuyển sang nhận dạng giọng nói (Groq, miễn phí) thay vì fail
      const canFallback =
        activeExtractor.id === "gemini-video-ocr" &&
        isGeminiUnavailable(err) &&
        Boolean(process.env.GROQ_API_KEY);
      if (!canFallback) {
        if (isGeminiUnavailable(err) && !(err instanceof UnrecoverableError)) {
          throw new UnrecoverableError(
            "Key Gemini đã hết tiền/hết lượt nên không đọc được chữ trên hình (OCR). " +
              "Nạp key tại aistudio.google.com hoặc chọn nguồn \"Âm thanh\" cho video có lời thoại. " +
              "Credits của job này được hoàn tự động.",
          );
        }
        throw err;
      }
      const meta = await ffprobe(localPath);
      if (!meta.hasAudio) {
        throw new UnrecoverableError(
          "Key Gemini đã hết tiền/hết lượt nên không đọc được chữ trên hình (OCR), " +
            "và video này không có tiếng nói để chuyển sang nhận dạng giọng nói. " +
            "Nạp key Gemini tại aistudio.google.com rồi thử lại. Credits đã được hoàn.",
        );
      }
      logger.warn(
        { jobId: job.data.jobId, err: String(err).slice(0, 200) },
        "OCR không chạy được (Gemini hết hạn mức) — chuyển sang nhận dạng giọng nói (Groq)",
      );
      await job.updateProgress(15);
      activeExtractor = new GroqWhisperExtractor();
      result = await activeExtractor.extract(extractInput, onProgress);
    }

    if (result.segments.length === 0) {
      throw new Error(
        activeExtractor.id === "groq-whisper"
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
        extractor: activeExtractor.id,
        segments: result.segments.length,
        costUsdMicros,
      },
      "extraction done",
    );

    // pipeline một chạm: trích xong tự dịch (style/glossary đã lưu trên video)
    if (job.data.params.thenTranslate === true) {
      const finish = job.data.params.finish;
      const nextId = await chainJob({
        videoId: video.id,
        userId: job.data.userId,
        type: "translate",
        params: {
          style: video.translationStyle ?? "natural",
          ...(finish ? { finish } : {}),
        },
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
