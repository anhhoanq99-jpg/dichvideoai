import type { Job } from "bullmq";
import { and, desc, eq } from "drizzle-orm";
import { createDb, jobs, subtitleTracks, videos } from "@dichvideo/db";
import { DUB_VOICES, type JobPayload, type SubtitleSegment } from "@dichvideo/shared";
import { chainJob } from "../lib/chain";
import { translateSegments, type TranslationStyle } from "../lib/translate";
import { recordUsage } from "../lib/usage";
import { logger } from "../logger";

export async function translateProcessor(job: Job<JobPayload>) {
  const db = createDb();
  const [video] = await db
    .select()
    .from(videos)
    .where(eq(videos.id, job.data.videoId));
  if (!video) throw new Error("Video không tồn tại hoặc chưa upload xong");

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
  const targetLang =
    typeof job.data.params.targetLang === "string"
      ? job.data.params.targetLang
      : (video.targetLang ?? "vi");
  const result = await translateSegments(
    {
      segments: original.segments as SubtitleSegment[],
      style,
      targetLang,
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
  const [newTrack] = await db
    .insert(subtitleTracks)
    .values({
      videoId: video.id,
      kind: "translated",
      lang: targetLang,
      segments: result.segments,
    })
    .returning();
  await db
    .update(jobs)
    .set({ costUsdMicros, result: { segmentCount: result.segments.length } })
    .where(eq(jobs.id, job.data.jobId));

  logger.info(
    { jobId: job.data.jobId, segments: result.segments.length, costUsdMicros },
    "translate done",
  );

  // trọn gói một chạm: dịch xong tự render (che chữ gốc + phụ đề dịch) rồi tự lồng tiếng
  const finish = job.data.params.finish as
    | { render?: boolean; dub?: boolean; voice?: string }
    | undefined;
  if (finish?.render) {
    // dải đáy video — vị trí phụ đề gốc thường gặp; phụ đề dịch đè đúng chỗ đó
    const band = { x: 0.02, y: 0.78, w: 0.96, h: 0.16 };
    const nextId = await chainJob({
      videoId: video.id,
      userId: job.data.userId,
      type: "render",
      params: {
        trackId: newTrack.id,
        styleId: "white-outline",
        aspect: "keep",
        coverMode: "blur",
        regions: [band],
        subBox: { x: 0.05, y: band.y, w: 0.9, h: band.h },
        finish,
      },
    });
    logger.info({ videoId: video.id, nextId }, "chained render (auto-finish)");
  } else if (finish?.dub) {
    const nextId = await chainJob({
      videoId: video.id,
      userId: job.data.userId,
      type: "dub",
      params: {
        trackId: newTrack.id,
        voice: finish.voice ?? DUB_VOICES[0].id,
        speed: 1,
        aiVolume: 100,
        bgVolume: 20,
      },
    });
    logger.info({ videoId: video.id, nextId }, "chained dub (auto-finish)");
  }

  return { segmentCount: result.segments.length };
}
