import {
  AbortMultipartUploadCommand,
  CompleteMultipartUploadCommand,
  CreateMultipartUploadCommand,
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
