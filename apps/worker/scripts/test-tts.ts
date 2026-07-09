/** Smoke test Edge TTS: sinh 1 câu tiếng Việt ra mp3, in kích thước file. */
import { mkdir, stat } from "node:fs/promises";
import path from "node:path";
import { MsEdgeTTS, OUTPUT_FORMAT } from "msedge-tts";

const dir = path.resolve("tmp-tts");
await mkdir(dir, { recursive: true });

const tts = new MsEdgeTTS();
await tts.setMetadata(
  "vi-VN-HoaiMyNeural",
  OUTPUT_FORMAT.AUDIO_24KHZ_48KBITRATE_MONO_MP3,
);
const { audioFilePath } = await tts.toFile(
  dir,
  "Xin chào! Đây là bản thử giọng lồng tiếng trí tuệ nhân tạo.",
  { rate: "+10%" },
);
const { size } = await stat(audioFilePath);
console.log("OK:", audioFilePath, size, "bytes");
process.exit(0);
