import { Queue } from "bullmq";
import IORedis from "ioredis";
import { createDb, jobs } from "@dichvideo/db";
import { QUEUES, type JobPayload, type JobType } from "@dichvideo/shared";

let queue: Queue<JobPayload> | null = null;

function getQueue(): Queue<JobPayload> {
  if (!queue) {
    const connection = new IORedis(process.env.REDIS_URL ?? "", {
      maxRetriesPerRequest: null,
    });
    queue = new Queue<JobPayload>(QUEUES.pipeline, { connection });
  }
  return queue;
}

/**
 * Nối chuỗi pipeline: processor gọi khi xong việc để tự enqueue bước kế tiếp
 * (probe → stt/ocr → translate) mà không cần user bấm từng bước.
 */
export async function chainJob(input: {
  videoId: string;
  userId: string;
  type: JobType;
  params: Record<string, unknown>;
}): Promise<string> {
  const db = createDb();
  const [row] = await db
    .insert(jobs)
    .values({
      videoId: input.videoId,
      userId: input.userId,
      type: input.type,
      params: input.params,
    })
    .returning();

  await getQueue().add(
    input.type,
    { jobId: row.id, videoId: input.videoId, userId: input.userId, params: input.params },
    {
      attempts: 3,
      backoff: { type: "exponential", delay: 5000 },
      removeOnComplete: { count: 1000 },
      removeOnFail: { count: 5000 },
    },
  );
  return row.id;
}
