import { config } from "dotenv";
import { createServer } from "node:http";

// Local .env first (if any), then repo root — existing vars are never overridden,
// so real environment (Docker/VPS) always wins.
config();
config({ path: "../../.env" });
import { Worker } from "bullmq";
import IORedis from "ioredis";
import { eq } from "drizzle-orm";
import { createDb, jobs } from "@dichvideo/db";
import {
  QUEUES,
  loadEnv,
  workerEnvSchema,
  type JobPayload,
  type JobType,
} from "@dichvideo/shared";
import { chargeJobStart, refundJobOnFinalFailure } from "./lib/billing";
import { logger } from "./logger";
import { processors } from "./processors";

const env = loadEnv(workerEnvSchema);
const db = createDb(env.DATABASE_URL);

const connection = new IORedis(env.REDIS_URL, {
  // Required by BullMQ (and by Upstash-compatible providers)
  maxRetriesPerRequest: null,
});

const worker = new Worker<JobPayload>(
  QUEUES.pipeline,
  async (job) => {
    const type = job.name as JobType;
    const processor = processors[type];
    if (!processor) throw new Error(`Unknown job type: ${type}`);

    await db
      .update(jobs)
      .set({ status: "active", startedAt: new Date() })
      .where(eq(jobs.id, job.data.jobId));

    // trừ credit trước khi chạy — thiếu credit thì job fail với thông báo rõ
    await chargeJobStart(db, job.data, type);

    return processor(job);
  },
  {
    connection,
    concurrency: 2,
  },
);

worker.on("completed", async (job) => {
  await db
    .update(jobs)
    .set({ status: "done", progress: 100, finishedAt: new Date() })
    .where(eq(jobs.id, job.data.jobId));
  logger.info({ jobId: job.data.jobId, type: job.name }, "job done");
});

worker.on("failed", async (job, err) => {
  if (!job) return;

  // hết lượt retry, hoặc lỗi không thể phục hồi (fail ngay lần đầu)
  const attempts = job.opts.attempts ?? 1;
  const isFinal = job.attemptsMade >= attempts || err.name === "UnrecoverableError";

  /**
   * CHƯA phải lần cuối thì TUYỆT ĐỐI không đánh dấu "failed".
   * Web coi "failed" là trạng thái kết thúc: SSE đóng luôn kết nối và studio
   * dừng hẳn vòng theo dõi. Ghi failed ở lần thử 1/3 nghĩa là một trục trặc
   * thoáng qua (R2 chớp, Gemini lag) hiện ngay màn "Xử lý thất bại — đã hoàn xu"
   * cho khách, trong khi vài giây sau job chạy lại và xong xuôi. Khách thấy hỏng
   * còn hệ thống thì đang chạy bình thường.
   * Vẫn ghi `error` để còn dấu vết gỡ lỗi, nhưng giữ nguyên trạng thái đang chạy.
   */
  if (!isFinal) {
    await db
      .update(jobs)
      .set({ error: err.message })
      .where(eq(jobs.id, job.data.jobId));
    logger.warn(
      { jobId: job.data.jobId, type: job.name, attempt: job.attemptsMade, attempts, err: err.message },
      "job lỗi tạm — sẽ thử lại, chưa báo thất bại cho khách",
    );
    return;
  }

  await db
    .update(jobs)
    .set({ status: "failed", error: err.message, finishedAt: new Date() })
    .where(eq(jobs.id, job.data.jobId));
  logger.error({ jobId: job.data.jobId, type: job.name, err: err.message }, "job failed");

  await refundJobOnFinalFailure(db, job.data.jobId, job.data.userId).catch((e) =>
    logger.error({ jobId: job.data.jobId, err: String(e) }, "refund failed"),
  );
});

worker.on("error", (err) => {
  logger.error({ err: err.message }, "worker error");
});

const health = createServer((_req, res) => {
  res.writeHead(200, { "content-type": "application/json" });
  res.end(JSON.stringify({ ok: true, queue: QUEUES.pipeline }));
});
health.listen(env.WORKER_HEALTH_PORT, () => {
  logger.info(
    { port: env.WORKER_HEALTH_PORT, queue: QUEUES.pipeline },
    "worker up",
  );
});

async function shutdown(signal: string) {
  logger.info({ signal }, "shutting down");
  await worker.close();
  await connection.quit();
  health.close();
  process.exit(0);
}

process.on("SIGTERM", () => void shutdown("SIGTERM"));
process.on("SIGINT", () => void shutdown("SIGINT"));

// Lỗi bung ra từ callback/stream của thư viện (ngoài try/catch của processor)
// không được phép giết cả worker — job liên quan sẽ fail qua retry/stalled-check.
process.on("uncaughtException", (err) => {
  logger.error({ err: err.message, stack: err.stack }, "uncaught exception (worker kept alive)");
});
process.on("unhandledRejection", (reason) => {
  logger.error({ reason: String(reason) }, "unhandled rejection (worker kept alive)");
});
