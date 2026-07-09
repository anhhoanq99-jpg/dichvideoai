import { createWriteStream } from "node:fs";
import { mkdir, rm } from "node:fs/promises";
import path from "node:path";
import { pipeline } from "node:stream/promises";
import { GetObjectCommand, S3Client } from "@aws-sdk/client-s3";
import type { Readable } from "node:stream";
import os from "node:os";

let client: S3Client | undefined;

function requireEnv(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env ${name} (R2 not configured)`);
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

/** Per-job scratch dir. Callers MUST cleanup via cleanupJobDir in finally. */
export async function jobTempDir(jobId: string): Promise<string> {
  const dir = path.join(os.tmpdir(), "dichvideo-jobs", jobId);
  await mkdir(dir, { recursive: true });
  return dir;
}

export async function cleanupJobDir(jobId: string): Promise<void> {
  const dir = path.join(os.tmpdir(), "dichvideo-jobs", jobId);
  await rm(dir, { recursive: true, force: true });
}

export async function downloadFromR2(key: string, destPath: string): Promise<void> {
  const res = await getR2().send(
    new GetObjectCommand({ Bucket: requireEnv("R2_BUCKET"), Key: key }),
  );
  if (!res.Body) throw new Error(`R2 object empty: ${key}`);
  await pipeline(res.Body as Readable, createWriteStream(destPath));
}
