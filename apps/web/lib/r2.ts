import {
  AbortMultipartUploadCommand,
  CompleteMultipartUploadCommand,
  CreateMultipartUploadCommand,
  PutObjectCommand,
  S3Client,
  UploadPartCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

let client: S3Client | undefined;

function requireEnv(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Thiếu biến môi trường ${name} — cần cấu hình Cloudflare R2 trong .env`);
  return v;
}

export function getR2(): S3Client {
  client ??= new S3Client({
    region: "auto",
    endpoint: `https://${requireEnv("R2_ACCOUNT_ID")}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: requireEnv("R2_ACCESS_KEY_ID"),
      secretAccessKey: requireEnv("R2_SECRET_ACCESS_KEY"),
    },
  });
  return client;
}

export function r2Bucket(): string {
  return requireEnv("R2_BUCKET");
}

/**
 * URL PUT ký sẵn cho file NHỎ tải 1 lượt (video demo…). Trình duyệt PUT thẳng
 * lên R2 — KHÔNG đẩy file qua route Next.js, vì Vercel chặn body request ở
 * ~4.5MB nên nhồi qua route là hỏng với mọi video thật.
 *
 * CỐ TÌNH không ký ContentType: client sẽ PUT blob không type nên KHÔNG gửi
 * header `content-type`, đúng như luồng upload video của user đang chạy được.
 * Thêm header lạ sẽ kéo theo preflight CORS mà token R2 trong .env là
 * object-scoped, không sửa được cấu hình CORS của bucket để mở thêm.
 * Bù lại, route đọc ép kiểu MIME khi trả về (xem /api/demo/[slot]).
 */
export async function presignPut(key: string) {
  return getSignedUrl(
    getR2(),
    new PutObjectCommand({ Bucket: r2Bucket(), Key: key }),
    { expiresIn: 900 },
  );
}

export async function createMultipart(key: string, contentType: string) {
  const res = await getR2().send(
    new CreateMultipartUploadCommand({
      Bucket: r2Bucket(),
      Key: key,
      ContentType: contentType,
    }),
  );
  if (!res.UploadId) throw new Error("R2 không trả về UploadId");
  return res.UploadId;
}

export async function presignPartUrls(
  key: string,
  uploadId: string,
  partNumbers: number[],
) {
  return Promise.all(
    partNumbers.map(async (partNumber) => ({
      partNumber,
      url: await getSignedUrl(
        getR2(),
        new UploadPartCommand({
          Bucket: r2Bucket(),
          Key: key,
          UploadId: uploadId,
          PartNumber: partNumber,
        }),
        { expiresIn: 3600 },
      ),
    })),
  );
}

export async function completeMultipart(
  key: string,
  uploadId: string,
  parts: { partNumber: number; etag: string }[],
) {
  await getR2().send(
    new CompleteMultipartUploadCommand({
      Bucket: r2Bucket(),
      Key: key,
      UploadId: uploadId,
      MultipartUpload: {
        Parts: parts
          .sort((a, b) => a.partNumber - b.partNumber)
          .map((p) => ({ PartNumber: p.partNumber, ETag: p.etag })),
      },
    }),
  );
}

export async function abortMultipart(key: string, uploadId: string) {
  await getR2().send(
    new AbortMultipartUploadCommand({
      Bucket: r2Bucket(),
      Key: key,
      UploadId: uploadId,
    }),
  );
}
