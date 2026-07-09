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
  await db
    .update(jobs)
    .set({ status: "failed", error: err.message, finishedAt: new Date() })
    .where(eq(jobs.id, job.data.jobId));
  logger.error({ jobId: job.data.jobId, type: job.name, err: err.message }, "job failed");
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
