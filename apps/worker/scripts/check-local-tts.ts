/**
 * Kiểm tra đường đi THẬT của worker cho giọng chạy tại chỗ:
 * voice id -> synthesizeClipWithRetry -> service -> file wav trên đĩa.
 * Đây là đúng hàm mà processor lồng tiếng gọi, không phải curl mô phỏng.
 */
import { mkdtemp, rm, stat } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import {
  KOKORO_VOICES,
  VIENEU_VOICES,
  isValidVoiceId,
  voiceProvider,
} from "@dichvideo/shared";
import { synthesizeClipWithRetry } from "../src/lib/tts";

const TEXT = "Xin chào, đây là câu kiểm tra đường đi thật của worker.";

async function main() {
  const dir = await mkdtemp(path.join(os.tmpdir(), "tts-check-"));
  const cases = [
    VIENEU_VOICES[0].id,
    VIENEU_VOICES[5].id,
    KOKORO_VOICES[0].id,
    KOKORO_VOICES[11].id,
  ];

  let bad = 0;
  for (const voice of cases) {
    const valid = isValidVoiceId(voice);
    const prov = voiceProvider(voice);
    try {
      const t0 = Date.now();
      const { file, usage } = await synthesizeClipWithRetry({
        text: TEXT,
        voice,
        speed: 1,
        dir,
        name: voice.replace(/[:]/g, "_"),
      });
      const { size } = await stat(file);
      const okSize = size > 10_000;
      if (!valid || !okSize) bad++;
      console.log(
        `${okSize && valid ? "OK " : "LỖI"} ${voice.padEnd(22)} provider=${prov.padEnd(7)} ` +
          `hợp lệ=${valid} ${(size / 1024) | 0}KB ${Date.now() - t0}ms usage=${usage[0]?.provider}/${usage[0]?.quantity}`,
      );
    } catch (err) {
      bad++;
      console.log(`LỖI ${voice}: ${err instanceof Error ? err.message : err}`);
    }
  }

  // giọng bịa phải bị chặn ngay ở tầng validate
  const fake = "vieneu:khong-co-that";
  console.log(`\nGiọng bịa "${fake}" -> isValidVoiceId=${isValidVoiceId(fake)} (phải là false)`);
  if (isValidVoiceId(fake)) bad++;

  await rm(dir, { recursive: true, force: true }).catch(() => {});
  console.log(bad === 0 ? "\nTẤT CẢ OK" : `\n${bad} trường hợp LỖI`);
  if (bad > 0) process.exitCode = 1;
}

void main();
