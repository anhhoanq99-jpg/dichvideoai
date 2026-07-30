import { Queue } from "bullmq";
import { and, eq, inArray, lt, notExists, sql } from "drizzle-orm";
import { jobs, videos, type Db } from "@dichvideo/db";
import type { JobPayload } from "@dichvideo/shared";
import { refundJobOnFinalFailure } from "./billing";
import { logger } from "../logger";

/**
 * DỌN JOB MỒ CÔI — job mà DB ghi "queued"/"active" nhưng hàng đợi Redis không
 * còn giữ.
 *
 * Vì sao cần: `createPipelineJob` ghi DB TRƯỚC rồi mới đẩy vào Redis. Nếu bản
 * ghi Redis biến mất sau đó (Redis bị xoá/evict, đổi instance, hết hạn mức
 * Upstash giữa lúc đẩy) thì DB vẫn nói "đang chờ" mãi mãi, video kẹt ở
 * "processing", còn giao diện quay 0% VĨNH VIỄN — khách không thấy lỗi, không
 * bấm lại được, và không ai biết.
 *
 * Chuyện này đã xảy ra thật ngày 22/07/2026: 16 job probe của 3 tài khoản mất
 * khỏi Redis, 11 video treo tới 3 tuần. Không có cơ chế nào tự phát hiện.
 *
 * Xử lý theo TUỔI của job, vì mồ côi mới và mồ côi cũ cần hai cách khác nhau:
 *  - dưới GRACE: bỏ qua. Có thể đang trên đường đẩy vào Redis (đọc DB xen giữa).
 *  - GRACE..RETRY_WINDOW: đẩy lại. Worker vừa restart hoặc Redis chớp, khách
 *    còn đang ngồi chờ nên cứu được thì cứu.
 *  - quá RETRY_WINDOW: đánh "failed" kèm lý do rõ + hạ trạng thái video. Đẩy lại
 *    một job của tuần trước là âm thầm trừ xu cho việc khách đã bỏ quên từ lâu.
 */
const GRACE_MS = 10 * 60 * 1000;
const RETRY_WINDOW_MS = 2 * 60 * 60 * 1000;

const ORPHAN_MESSAGE =
  "Job bị mất khỏi hàng đợi xử lý nên không bao giờ chạy (sự cố hạ tầng). " +
  "Xu chưa bị trừ — vui lòng bấm xử lý lại video này.";

export async function reconcileOrphanJobs(
  db: Db,
  queue: Queue<JobPayload>,
): Promise<{ checked: number; requeued: number; failed: number }> {
  const pending = await db
    .select({
      id: jobs.id,
      type: jobs.type,
      videoId: jobs.videoId,
      userId: jobs.userId,
      params: jobs.params,
      createdAt: jobs.createdAt,
    })
    .from(jobs)
    .where(inArray(jobs.status, ["queued", "active"]));

  if (pending.length === 0) return { checked: 0, requeued: 0, failed: 0 };

  let requeued = 0;
  let failed = 0;

  for (const row of pending) {
    const ageMs = Date.now() - new Date(row.createdAt).getTime();
    if (ageMs < GRACE_MS) continue;

    // còn trong Redis → worker sẽ tự lo, không can thiệp
    if (await queue.getJob(row.id)) continue;

    if (ageMs <= RETRY_WINDOW_MS) {
      await queue.add(
        row.type,
        {
          jobId: row.id,
          videoId: row.videoId,
          userId: row.userId,
          params: (row.params ?? {}) as Record<string, unknown>,
        },
        {
          jobId: row.id,
          attempts: 3,
          backoff: { type: "exponential", delay: 5000 },
          removeOnComplete: { count: 1000 },
          removeOnFail: { count: 5000 },
        },
      );
      requeued++;
      logger.warn(
        { jobId: row.id, type: row.type, ageMin: Math.round(ageMs / 60000) },
        "job mồ côi — đã đẩy lại vào hàng đợi",
      );
      continue;
    }

    await db
      .update(jobs)
      .set({ status: "failed", error: ORPHAN_MESSAGE, finishedAt: new Date() })
      .where(eq(jobs.id, row.id));

    // job "active" có thể đã bị trừ xu trước khi mất — hoàn lại (idempotent)
    await refundJobOnFinalFailure(db, row.id, row.userId).catch((e) =>
      logger.error({ jobId: row.id, err: String(e) }, "không hoàn được xu cho job mồ côi"),
    );

    // cùng lý lẽ với worker.on("failed"): probe/import chết thì video phải hạ
    // xuống failed, nếu không nó kẹt "processing" và trang video không tự sửa
    if (row.type === "probe" || row.type === "import") {
      await db
        .update(videos)
        .set({ status: "failed" })
        .where(
          and(
            eq(videos.id, row.videoId),
            inArray(videos.status, ["uploading", "processing"]),
          ),
        )
        .catch((e) =>
          logger.error({ videoId: row.videoId, err: String(e) }, "không hạ được trạng thái video"),
        );
    }

    failed++;
    logger.error(
      { jobId: row.id, type: row.type, ageHours: Math.round(ageMs / 3600000) },
      "job mồ côi quá cũ — đánh thất bại để khách thấy lỗi thay vì chờ mãi",
    );
  }

  return { checked: pending.length, requeued, failed };
}

/**
 * DỌN VIDEO TREO — video kẹt ở trạng thái dở dang mà không còn gì đẩy nó đi tiếp.
 * Chạy sau `reconcileOrphanJobs`, xử lý hai trường hợp job-mồ-côi không chạm tới:
 *
 * 1. `uploading` mà KHÔNG có job nào. Khách bấm upload (đã cấp r2Key) rồi đóng
 *    tab giữa chừng nên `/complete` không bao giờ được gọi → không có job probe
 *    nào được tạo. Trước đây dòng này nằm lại mãi mãi và trang video quay 0%.
 *    Trên production đã đọng 8 video kiểu này, mới nhất chỉ 2 ngày trước.
 *
 * 2. `processing`/`uploading` mà MỌI job đều đã thất bại. Xảy ra với video import
 *    hỏng từ trước khi `worker.on("failed")` biết hạ trạng thái video.
 *
 * Chỉ hạ khi đã quá STALE_UPLOAD_MS để không cắt ngang một lượt upload đang chạy
 * thật (file 2GB trên mạng chậm có thể lâu).
 */
const STALE_UPLOAD_MS = 6 * 60 * 60 * 1000;

export async function reconcileStuckVideos(db: Db): Promise<number> {
  const cutoff = new Date(Date.now() - STALE_UPLOAD_MS);

  const abandoned = await db
    .update(videos)
    .set({ status: "failed" })
    .where(
      and(
        eq(videos.status, "uploading"),
        lt(videos.createdAt, cutoff),
        notExists(
          db.select({ one: sql`1` }).from(jobs).where(eq(jobs.videoId, videos.id)),
        ),
      ),
    )
    .returning({ id: videos.id });

  const allJobsFailed = await db
    .update(videos)
    .set({ status: "failed" })
    .where(
      and(
        inArray(videos.status, ["uploading", "processing"]),
        lt(videos.createdAt, cutoff),
        // có job, và không job nào còn sống (chờ/chạy/xong)
        sql`exists (select 1 from ${jobs} where ${jobs.videoId} = ${videos.id})`,
        notExists(
          db
            .select({ one: sql`1` })
            .from(jobs)
            .where(
              and(
                eq(jobs.videoId, videos.id),
                inArray(jobs.status, ["queued", "active", "done"]),
              ),
            ),
        ),
      ),
    )
    .returning({ id: videos.id });

  const total = abandoned.length + allJobsFailed.length;
  if (total > 0) {
    logger.warn(
      { boDoGiuaChung: abandoned.length, moiJobDeuHong: allJobsFailed.length },
      "đã hạ trạng thái video treo xuống failed để khách thấy lỗi thay vì chờ mãi",
    );
  }
  return total;
}
