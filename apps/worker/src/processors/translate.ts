import type { Job } from "bullmq";
import { and, desc, eq } from "drizzle-orm";
import { createDb, jobs, subtitleTracks, videos } from "@dichvideo/db";
import type { JobPayload, SubtitleSegment } from "@dichvideo/shared";
import { translateSegments, type TranslationStyle } from "../lib/translate";
import { recordUsage } from "../lib/usage";
import { logger } from "../logger";

export async function translateProcessor(job: Job<JobPayload>) {
  const db = createDb();
  const [video] = await db
    .select()
    .from(videos)
    .where(eq(videos.id, job.data.videoId));
  if (!video) throw new Error(`Video ${job.data.videoId} không tồn tại`);

  // luôn dịch track gốc mới nhất (video có thể được trích xuất lại nhiều lần)
  const [original] = await db
    .select()
    .from(subtitleTracks)
    .where(
      and(
        eq(subtitleTracks.videoId, video.id),
        eq(subtitleTracks.kind, "original"),
      ),
    )
    .orderBy(desc(subtitleTracks.createdAt))
    .limit(1);
  if (!original) throw new Error("Video chưa có phụ đề gốc để dịch");

  const style = (typeof job.data.params.style === "string"
    ? job.data.params.style
    : (video.translationStyle ?? "natural")) as TranslationStyle;
  const customPrompt =
    typeof job.data.params.customPrompt === "string"
      ? job.data.params.customPrompt
      : null;
  const result = await translateSegments(
    {
      segments: original.segments as SubtitleSegment[],
      style,
      customPrompt,
      glossary: video.glossary,
    },
    (pct) => void job.updateProgress(Math.min(95, pct)),
  );

  const costUsdMicros = await recordUsage(job.data.jobId, result.usage);

  // replace any previous translated track (retranslate = overwrite)
  await db
    .delete(subtitleTracks)
    .where(
      and(
        eq(subtitleTracks.videoId, video.id),
        eq(subtitleTracks.kind, "translated"),
      ),
    );
  await db.insert(subtitleTracks).values({
    videoId: video.id,
    kind: "translated",
    lang: "vi",
    segments: result.segments,
  });
  await db
    .update(jobs)
    .set({ costUsdMicros, result: { segmentCount: result.segments.length } })
    .where(eq(jobs.id, job.data.jobId));

  logger.info(
    { jobId: job.data.jobId, segments: result.segments.length, costUsdMicros },
    "translate done",
  );
  return { segmentCount: result.segments.length };
}
