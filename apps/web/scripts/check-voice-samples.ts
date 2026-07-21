/**
 * Xac minh mau nghe thu tren R2 bang DUNG duong di ma route /api/tts-preview
 * dung: HEAD roi presign roi TAI THAT.
 *
 * Phai tai that chu khong chi HEAD: key chua dau ":" (voice-samples/vieneu:minh-duc.wav)
 * — dung loai ky tu vua lam vo request khi di qua URL, nen phai chung minh
 * trinh duyet tai duoc that.
 *
 *   cd apps/web && npx tsx --env-file=../../.env scripts/check-voice-samples.ts
 */
import { GetObjectCommand, HeadObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { KOKORO_VOICES, VIENEU_VOICES } from "@dichvideo/shared";
import { getR2, r2Bucket } from "../lib/r2";

async function main() {
  const ids = [...VIENEU_VOICES, ...KOKORO_VOICES].map((v) => v.id);
  const Bucket = r2Bucket();
  let missing = 0;
  let unfetchable = 0;

  for (const id of ids) {
    const Key = `voice-samples/${id}.wav`;
    try {
      await getR2().send(new HeadObjectCommand({ Bucket, Key }));
    } catch {
      missing++;
      console.log(`THIEU          ${id}`);
      continue;
    }
    const url = await getSignedUrl(getR2(), new GetObjectCommand({ Bucket, Key }), {
      expiresIn: 600,
    });
    const res = await fetch(url);
    const bytes = res.ok ? (await res.arrayBuffer()).byteLength : 0;
    if (!res.ok || bytes < 10_000) {
      unfetchable++;
      console.log(`KHONG TAI DUOC ${id} -> HTTP ${res.status} ${bytes}B`);
    }
  }

  console.log(
    `\n${ids.length - missing}/${ids.length} co tren R2 | ` +
      `${ids.length - missing - unfetchable}/${ids.length} tai duoc qua URL ky san`,
  );
  if (missing || unfetchable) process.exitCode = 1;
}

void main();
