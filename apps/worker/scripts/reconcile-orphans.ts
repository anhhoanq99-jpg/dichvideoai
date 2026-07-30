/**
 * Dọn job MỒ CÔI ngay lập tức — job mà DB ghi "queued"/"active" nhưng hàng đợi
 * Redis không còn giữ, khiến video kẹt và giao diện quay 0% vĩnh viễn.
 *
 * Worker đã tự chạy việc này lúc khởi động và mỗi 6 giờ (src/lib/reconcile.ts).
 * Script này để chạy tay khi không muốn đợi, hoặc để kiểm tra sau sự cố:
 *
 *   cd apps/worker && npx tsx scripts/reconcile-orphans.ts
 */
import { config } from "dotenv";
config();
config({ path: "../../.env" });

import { Queue } from "bullmq";
import IORedis from "ioredis";
import { createDb } from "@dichvideo/db";
import { QUEUES, type JobPayload } from "@dichvideo/shared";
import { reconcileOrphanJobs, reconcileStuckVideos } from "../src/lib/reconcile";

const connection = new IORedis(process.env.REDIS_URL ?? "", {
  maxRetriesPerRequest: null,
});
const queue = new Queue<JobPayload>(QUEUES.pipeline, { connection });
const db = createDb(process.env.DATABASE_URL);

const r = await reconcileOrphanJobs(db, queue);
console.log(
  `Đã kiểm ${r.checked} job đang chờ/chạy → đẩy lại ${r.requeued}, đánh thất bại ${r.failed}.`,
);
if (r.checked === 0) console.log("Không có job nào đang chờ — hàng đợi sạch.");

const videosFixed = await reconcileStuckVideos(db);
console.log(`Đã hạ ${videosFixed} video treo xuống trạng thái thất bại.`);

await queue.close();
await connection.quit();
