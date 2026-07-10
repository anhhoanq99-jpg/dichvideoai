import path from "node:path";
import type { Job } from "bullmq";
import { eq } from "drizzle-orm";
import { createDb, videos } from "@dichvideo/db";
import {
  EXTRACT_METHODS,
  UPLOAD_MAX_DURATION_SEC,
  type ExtractMethod,
  type JobPayload,
} from "@dichvideo/shared";
import { chainJob } from "../lib/chain";
import { ffprobe } from "../lib/ffmpeg";
import { cleanupJobDir, downloadFromR2, jobTempDir } from "../lib/r2";
import { logger } from "../logger";

export async function probeProcessor(job: Job<JobPayload>) {
  const db = createDb();
  const [video] = await db
    .select()
    .from(videos)
    .where(eq(videos.id, job.data.videoId));
  if (!video?.r2Key) throw new Error(`Video ${job.data.videoId} has no r2Key`);

  const dir = await jobTempDir(job.data.jobId);
  try {
    const localPath = path.join(dir, path.basename(video.r2Key));
    await downloadFromR2(video.r2Key, localPath);
    await job.updateProgress(50);

    const meta = await ffprobe(localPath);
    if (meta.durationSec > UPLOAD_MAX_DURATION_SEC) {
      await db
        .update(videos)
        .set({ status: "failed" })
        .where(eq(videos.id, video.id));
      throw new Error(
        `Video dài ${Math.round(meta.durationSec / 60)} phút — vượt giới hạn 60 phút`,
      );
    }

    await db
      .update(videos)
      .set({
        durationSec: meta.durationSec,
        width: meta.width,
        height: meta.height,
        status: "uploaded",
      })
      .where(eq(videos.id, video.id));

    logger.info(
      { videoId: video.id, durationSec: meta.durationSec, hasAudio: meta.hasAudio },
      "probe done",
    );
    await job.updateProgress(100);

    // pipeline một chạm: nếu upload kèm chain thì tự chạy bước trích xuất
    const chain = job.data.params.chain as
      | { method?: string; translate?: boolean }
      | undefined;
    if (chain?.method && EXTRACT_METHODS.includes(chain.method as ExtractMethod)) {
      const nextId = await chainJob({
        videoId: video.id,
        userId: job.data.userId,
        type: chain.method as ExtractMethod,
        params: {
          sourceLang: video.sourceLang ?? null,
          // mặc định có dịch; tab "Trích xuất phụ đề" gửi translate:false để dừng sau khi tách
          thenTranslate: chain.translate !== false,
        },
      });
      logger.info({ videoId: video.id, nextId, method: chain.method }, "chained extract");
    }

    return { ...meta };
  } finally {
    await cleanupJobDir(job.data.jobId);
  }
}
