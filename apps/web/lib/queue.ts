import { Queue } from "bullmq";
import IORedis from "ioredis";
import { QUEUES, type JobPayload, type JobType } from "@dichvideo/shared";

declare global {
  var __pipelineQueue: Queue<JobPayload> | undefined;
}

/** Quá hạn đẩy job vào hàng đợi — thà báo lỗi rõ còn hơn treo tới lúc bị giết. */
const ENQUEUE_TIMEOUT_MS = 8000;

/** Lazy singleton — survives Next.js dev hot-reload without leaking connections. */
export function getPipelineQueue(): Queue<JobPayload> {
  if (!globalThis.__pipelineQueue) {
    const connection = new IORedis(process.env.REDIS_URL ?? "", {
      /**
       * BullMQ bắt buộc `null` cho kết nối Worker (dùng lệnh chặn), và phía
       * Queue này giữ nguyên cho khớp. Nhưng `null` = ioredis THỬ LẠI VÔ HẠN:
       * Redis chậm hoặc không tới được thì `queue.add()` treo cho tới khi
       * Vercel giết hàm — lúc đó phản hồi về trình duyệt là THÂN RỖNG, và
       * người dùng chỉ thấy "Unexpected end of JSON input".
       * Nên phải chặn bằng timeout ở cả 3 lớp dưới đây.
       */
      maxRetriesPerRequest: null,
      connectTimeout: 5000,
      commandTimeout: 5000,
      /**
       * GIỮ enableOfflineQueue mặc định (true). Đặt false nghe có vẻ "fail
       * nhanh" nhưng thực tế làm hỏng hẳn: trên serverless, lệnh đầu tiên luôn
       * chạy khi socket CHƯA sẵn sàng, và false nghĩa là ném ngay
       * "Stream isn't writeable" — không đẩy được job nào cả.
       * Lưới an toàn đúng chỗ là timeout ở dưới, không phải ở đây.
       */
    });
    // không có listener 'error' thì ioredis ném lỗi toàn cục làm sập tiến trình
    connection.on("error", (err) => {
      console.error("[queue] loi ket noi Redis:", err.message);
    });
    globalThis.__pipelineQueue = new Queue<JobPayload>(QUEUES.pipeline, {
      connection,
    });
  }
  return globalThis.__pipelineQueue;
}

export async function enqueuePipelineJob(type: JobType, payload: JobPayload) {
  const add = getPipelineQueue().add(type, payload, {
    attempts: 3,
    backoff: { type: "exponential", delay: 5000 },
    removeOnComplete: { count: 1000 },
    removeOnFail: { count: 5000 },
  });

  // Lớp chặn cuối: dù ioredis có treo kiểu gì, route vẫn kịp trả JSON.
  let timer: ReturnType<typeof setTimeout>;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(
      () =>
        reject(
          new Error(
            "Hàng đợi xử lý (Redis) không phản hồi. Video đã tải lên an toàn — thử bấm xử lý lại sau ít phút.",
          ),
        ),
      ENQUEUE_TIMEOUT_MS,
    );
  });

  try {
    return await Promise.race([add, timeout]);
  } finally {
    clearTimeout(timer!);
  }
}
