/**
 * Ha cap chi co y nghia neu giong DUOC ha cap xuong thuc su doc duoc.
 * Script nay sinh audio that bang dung 2 giong Edge ma edgeFallbackVoice tra ve.
 *
 *   cd apps/worker && npx tsx --env-file=../../.env scripts/check-edge-fallback.ts
 */
import { mkdtemp, rm, stat } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { GCLOUD_VOICES, edgeFallbackVoice, isValidVoiceId } from "@dichvideo/shared";
import { synthesizeClipWithRetry } from "../src/lib/tts";

async function main() {
  const dir = await mkdtemp(path.join(os.tmpdir(), "edge-fallback-"));
  // 1 giong nu + 1 giong nam cua Google -> 2 giong Edge tuong ung
  const sources = [
    GCLOUD_VOICES.find((v) => v.gender === "F")!,
    GCLOUD_VOICES.find((v) => v.gender === "M")!,
  ];

  let bad = 0;
  for (const src of sources) {
    const fallback = edgeFallbackVoice(src.id);
    const valid = isValidVoiceId(fallback);
    try {
      const { file } = await synthesizeClipWithRetry({
        text: "Xin chào, đây là giọng dự phòng khi nguồn chính hết hạn mức.",
        voice: fallback,
        speed: 1,
        dir,
        name: `fb-${src.gender}`,
      });
      const { size } = await stat(file);
      const ok = valid && size > 10_000;
      if (!ok) bad++;
      console.log(
        `${ok ? "OK " : "LỖI"} ${src.name} (${src.gender}) -> ${fallback}` +
          `  hợp lệ=${valid}  ${(size / 1024) | 0}KB`,
      );
    } catch (err) {
      bad++;
      console.log(`LỖI ${src.id} -> ${fallback}: ${err instanceof Error ? err.message : err}`);
    }
  }

  await rm(dir, { recursive: true, force: true }).catch(() => {});
  console.log(bad === 0 ? "\nLƯỚI AN TOÀN HOẠT ĐỘNG" : `\n${bad} trường hợp LỖI`);
  if (bad > 0) process.exitCode = 1;
}

void main();
