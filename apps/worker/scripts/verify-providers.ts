/** Quick credential check for R2 / Groq / Gemini. Run: tsx scripts/verify-providers.ts */
import { config } from "dotenv";
config();
config({ path: "../../.env" });

import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
} from "@aws-sdk/client-s3";
import { getR2 } from "../src/lib/r2";

async function checkR2() {
  const bucket = process.env.R2_BUCKET!;
  const key = "healthcheck/ping.txt";
  const s3 = getR2();
  await s3.send(
    new PutObjectCommand({ Bucket: bucket, Key: key, Body: "ping", ContentType: "text/plain" }),
  );
  const got = await s3.send(new GetObjectCommand({ Bucket: bucket, Key: key }));
  const body = await got.Body!.transformToString();
  await s3.send(new DeleteObjectCommand({ Bucket: bucket, Key: key }));
  if (body !== "ping") throw new Error("R2 roundtrip mismatch");
  return `bucket "${bucket}" put/get/delete OK`;
}

async function checkGroq() {
  const res = await fetch("https://api.groq.com/openai/v1/models", {
    headers: { Authorization: `Bearer ${process.env.GROQ_API_KEY}` },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = (await res.json()) as { data: { id: string }[] };
  const whisper = data.data.filter((m) => m.id.includes("whisper")).map((m) => m.id);
  return `key valid, whisper models: ${whisper.join(", ") || "(none?)"}`;
}

async function checkGemini() {
  const res = await fetch(
    "https://generativelanguage.googleapis.com/v1beta/models?pageSize=5",
    { headers: { "x-goog-api-key": process.env.GEMINI_API_KEY! } },
  );
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`HTTP ${res.status}: ${text.slice(0, 200)}`);
  }
  const data = (await res.json()) as { models?: { name: string }[] };
  return `key valid, ${data.models?.length ?? 0} models visible`;
}

async function main() {
  let failed = false;
  for (const [name, fn] of [
    ["R2", checkR2],
    ["Groq", checkGroq],
    ["Gemini", checkGemini],
  ] as const) {
    try {
      console.log(`✅ ${name}: ${await fn()}`);
    } catch (err) {
      failed = true;
      console.error(`❌ ${name}: ${err instanceof Error ? err.message : err}`);
    }
  }
  process.exit(failed ? 1 : 0);
}

void main();
