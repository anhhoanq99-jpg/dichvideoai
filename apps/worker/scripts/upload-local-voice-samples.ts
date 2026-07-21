/**
 * Sinh mẫu nghe thử cho MỌI giọng VieNeu/Kokoro rồi đẩy lên R2.
 *
 * Vì sao phải làm vậy: web chạy trên Vercel còn 2 engine này chạy trên máy có
 * worker. Vercel KHÔNG gọi được 127.0.0.1 của máy đó, nên nút "Nghe thử" không
 * thể tổng hợp trực tiếp như các provider API khác. Thay vào đó sinh sẵn 1 lần,
 * để R2 phục vụ file tĩnh — vừa chạy được kể cả khi máy tắt, vừa nhanh hơn.
 *
 * Chạy lại mỗi khi thêm/bớt giọng trong catalog:
 *   cd apps/worker && npx tsx scripts/upload-local-voice-samples.ts
 * Cần service pm2 `dichvideo-tts` đang chạy.
 */
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { KOKORO_VOICES, VIENEU_VOICES } from "@dichvideo/shared";
import { uploadToR2 } from "../src/lib/r2";

const SAMPLE =
  "Xin chào! Đây là giọng đọc thử của mình, rất vui được đồng hành cùng video của bạn.";
const BASE = process.env.TTS_LOCAL_URL ?? "http://127.0.0.1:8123";

async function synth(engine: "vieneu" | "kokoro", voice: string): Promise<Buffer> {
  const res = await fetch(`${BASE}/tts`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ engine, voice, text: SAMPLE, speed: 1 }),
  });
  if (!res.ok) throw new Error(`${engine}/${voice}: ${res.status} ${(await res.text()).slice(0, 150)}`);
  return Buffer.from(await res.arrayBuffer());
}

async function main() {
  const jobs = [
    ...VIENEU_VOICES.map((v) => ({ engine: "vieneu" as const, id: v.id })),
    ...KOKORO_VOICES.map((v) => ({ engine: "kokoro" as const, id: v.id })),
  ];

  const dir = await mkdtemp(path.join(os.tmpdir(), "voice-samples-"));
  let ok = 0;
  for (const [i, job] of jobs.entries()) {
    const slug = job.id.split(":")[1];
    try {
      const t0 = Date.now();
      const audio = await synth(job.engine, slug);
      const tmp = path.join(dir, `${job.engine}-${slug}.wav`);
      await writeFile(tmp, audio);
      // key theo ID GIỌNG (đã có tiền tố) — route preview tra thẳng, khỏi map lại
      await uploadToR2(`voice-samples/${job.id}.wav`, tmp, "audio/wav");
      ok++;
      console.log(
        `[${i + 1}/${jobs.length}] OK  ${job.id}  ${(audio.length / 1024) | 0}KB  ${Date.now() - t0}ms`,
      );
    } catch (err) {
      console.error(`[${i + 1}/${jobs.length}] LỖI ${job.id}: ${err instanceof Error ? err.message : err}`);
    }
  }
  await rm(dir, { recursive: true, force: true }).catch(() => {});
  console.log(`\nXong: ${ok}/${jobs.length} mẫu đã lên R2 (voice-samples/)`);
  if (ok < jobs.length) process.exitCode = 1;
}

void main();
