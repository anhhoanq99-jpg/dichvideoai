/**
 * Đặt Lifecycle Rule cho bucket R2 để Cloudflare TỰ dọn file rác server-side
 * (không cần cron chạy trên máy user — chạy kể cả khi máy tắt).
 *
 *   1. Xóa file kết quả trong `outputs/` sau 7 ngày (đúng lời hứa ở ToS / trang lịch sử).
 *   2. Hủy các multipart-upload dở dang sau 7 ngày (phần upload bị bỏ giữa chừng vẫn tính tiền).
 *
 * Chạy 1 lần: cd apps/worker && npx tsx scripts/set-r2-lifecycle.ts
 * (Đọc .env ở root repo — cần R2_* đủ quyền. Chạy lại sẽ GHI ĐÈ toàn bộ rule cũ.)
 */
import { config } from "dotenv";
config();
config({ path: "../../.env" });

import {
  GetBucketLifecycleConfigurationCommand,
  PutBucketLifecycleConfigurationCommand,
  type LifecycleRule,
} from "@aws-sdk/client-s3";
import { getR2 } from "../src/lib/r2";

const RETENTION_DAYS = 7;

const RULES: LifecycleRule[] = [
  {
    ID: "expire-outputs-7d",
    Status: "Enabled",
    Filter: { Prefix: "outputs/" },
    Expiration: { Days: RETENTION_DAYS },
  },
  {
    ID: "abort-stale-multipart-7d",
    Status: "Enabled",
    // Áp cho cả bucket: dọn phần upload dở (video nguồn upload lỗi giữa chừng)
    Filter: { Prefix: "" },
    AbortIncompleteMultipartUpload: { DaysAfterInitiation: RETENTION_DAYS },
  },
];

async function main() {
  const bucket = process.env.R2_BUCKET;
  if (!bucket) throw new Error("Thiếu env R2_BUCKET");
  const s3 = getR2();

  await s3.send(
    new PutBucketLifecycleConfigurationCommand({
      Bucket: bucket,
      LifecycleConfiguration: { Rules: RULES },
    }),
  );

  const current = await s3.send(
    new GetBucketLifecycleConfigurationCommand({ Bucket: bucket }),
  );
  console.log(
    `✅ Lifecycle đã áp cho bucket "${bucket}":\n` +
      JSON.stringify(current.Rules, null, 2) +
      `\n\nLƯU Ý: Cloudflare quét lifecycle định kỳ (thường 1 lần/ngày), nên file có thể ` +
      `còn thêm tối đa ~24h sau mốc ${RETENTION_DAYS} ngày mới bị xóa hẳn — đúng như mong đợi.`,
  );
}

main().catch((err) => {
  console.error("❌ Thất bại:", err instanceof Error ? err.message : err);
  console.error(
    `\nNếu bị từ chối quyền (token R2 thiếu quyền quản lý bucket): vào dashboard ` +
      `Cloudflare → R2 → bucket "${process.env.R2_BUCKET ?? "dichvideo-prod"}" → ` +
      `Settings → Object lifecycle rules → Add rule, đặt tay:\n` +
      `  • Prefix "outputs/", Delete objects sau ${RETENTION_DAYS} ngày.\n` +
      `  • Abort incomplete multipart uploads sau ${RETENTION_DAYS} ngày.`,
  );
  process.exit(1);
});
