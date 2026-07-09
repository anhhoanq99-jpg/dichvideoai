import { Queue } from "bullmq";
import IORedis from "ioredis";
import { QUEUES, type JobPayload, type JobType } from "@dichvideo/shared";

declare global {
  var __pipelineQueue: Queue<JobPayload> | undefined;
}

/** Lazy singleton — survives Next.js dev hot-reload without leaking connections. */
export function getPipelineQueue(): Queue<JobPayload> {
  if (!globalThis.__pipelineQueue) {
    const connection = new IORedis(process.env.REDIS_URL ?? "", {
      maxRetriesPerRequest: null,
    });
    globalThis.__pipelineQueue = new Queue<JobPayload>(QUEUES.pipeline, {
      connection,
    });
  }
  return globalThis.__pipelineQueue;
}

export async function enqueuePipelineJob(type: JobType, payload: JobPayload) {
  return getPipelineQueue().add(type, payload, {
    attempts: 3,
    backoff: { type: "exponential", delay: 5000 },
    removeOnComplete: { count: 1000 },
    removeOnFail: { count: 5000 },
  });
}
