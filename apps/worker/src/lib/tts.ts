import { rename } from "node:fs/promises";
import path from "node:path";
import { MsEdgeTTS, OUTPUT_FORMAT } from "msedge-tts";

/**
 * Sinh 1 clip giọng đọc (mp3 24kHz) cho một câu phụ đề.
 * Mỗi lần gọi tạo connection mới — Edge TTS chỉ dùng được 1 lần/stream.
 */
export async function synthesizeClip(input: {
  text: string;
  voice: string;
  /** 0.8 .. 1.3 */
  speed: number;
  dir: string;
  /** tên file (không đuôi) */
  name: string;
}): Promise<string> {
  const tts = new MsEdgeTTS();
  await tts.setMetadata(
    input.voice,
    OUTPUT_FORMAT.AUDIO_24KHZ_48KBITRATE_MONO_MP3,
  );
  const ratePct = Math.round((input.speed - 1) * 100);
  const { audioFilePath } = await tts.toFile(path.join(input.dir, input.name), input.text, {
    rate: `${ratePct >= 0 ? "+" : ""}${ratePct}%`,
  });
  // msedge-tts đặt tên file cố định trong thư mục — đổi về tên mong muốn
  const target = path.join(input.dir, `${input.name}.mp3`);
  if (audioFilePath !== target) await rename(audioFilePath, target);
  return target;
}

const MAX_TTS_RETRIES = 3;

/** Retry quanh lỗi mạng/websocket của Edge TTS. */
export async function synthesizeClipWithRetry(
  input: Parameters<typeof synthesizeClip>[0],
): Promise<string> {
  let lastErr: unknown;
  for (let attempt = 0; attempt < MAX_TTS_RETRIES; attempt++) {
    try {
      return await synthesizeClip(input);
    } catch (err) {
      lastErr = err;
      await new Promise((r) => setTimeout(r, 1000 * (attempt + 1)));
    }
  }
  throw new Error(
    `TTS thất bại sau ${MAX_TTS_RETRIES} lần: ${lastErr instanceof Error ? lastErr.message : lastErr}`,
  );
}
