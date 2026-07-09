/**
 * Set CORS policy on the R2 bucket so the browser can PUT parts directly
 * (multipart upload) and read the ETag response header.
 * Run: tsx scripts/set-r2-cors.ts
 */
import { config } from "dotenv";
config();
config({ path: "../../.env" });

import { GetBucketCorsCommand, PutBucketCorsCommand } from "@aws-sdk/client-s3";
import { getR2 } from "../src/lib/r2";

const ALLOWED_ORIGINS = [
  "http://localhost:3000",
  // add production domain here at Phase 6 deploy
];

async function main() {
  const bucket = process.env.R2_BUCKET!;
  const s3 = getR2();

  await s3.send(
    new PutBucketCorsCommand({
      Bucket: bucket,
      CORSConfiguration: {
        CORSRules: [
          {
            AllowedOrigins: ALLOWED_ORIGINS,
            AllowedMethods: ["PUT", "GET", "HEAD"],
            AllowedHeaders: ["*"],
            // Browser JS must read ETag from part-upload responses to complete multipart
            ExposeHeaders: ["ETag"],
            MaxAgeSeconds: 3600,
          },
        ],
      },
    }),
  );

  const current = await s3.send(new GetBucketCorsCommand({ Bucket: bucket }));
  console.log("✅ CORS policy applied:", JSON.stringify(current.CORSRules, null, 2));
}

main().catch((err) => {
  console.error("❌ Failed:", err instanceof Error ? err.message : err);
  console.error(
    "\nNếu bị từ chối quyền: vào dashboard R2 → bucket dichvideo-dev → Settings → CORS Policy → Add, dán:\n" +
      JSON.stringify(
        [
          {
            AllowedOrigins: ALLOWED_ORIGINS,
            AllowedMethods: ["PUT", "GET", "HEAD"],
            AllowedHeaders: ["*"],
            ExposeHeaders: ["ETag"],
            MaxAgeSeconds: 3600,
          },
        ],
        null,
        2,
      ),
  );
  process.exit(1);
});
