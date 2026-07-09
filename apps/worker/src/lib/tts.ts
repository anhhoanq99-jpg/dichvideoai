import { mkdir } from "node:fs/promises";
import path from "node:path";
import { MsEdgeTTS, OUTPUT_FORMAT } from "msedge-tts";

/**
 * Sinh 1 clip giọng đọc (mp3 24kHz) cho một câu phụ đề.
 * Mỗi lần gọi tạo connection mới — Edge TTS chỉ dùng được 1 lần/stream.
 * msedge-tts nhận THƯ MỤC (phải tồn tại sẵn) và tự ghi audio.mp3 vào trong.
 */
export async function synthesizeClip(input: {
  text: string;
  voice: string;
  /** 0.8 .. 1.3 */
  speed: number;
  dir: string;
  /** tên thư mục con cho clip này */
  name: string;
}): Promise<string> {
  const clipDir = path.join(input.dir, input.name);
  await mkdir(clipDir, { recursive: true });
  const tts = new MsEdgeTTS();
  await tts.setMetadata(
    input.voice,
    OUTPUT_FORMAT.AUDIO_24KHZ_48KBITRATE_MONO_MP3,
  );
  const ratePct = Math.round((input.speed - 1) * 100);
  const { audioFilePath } = await tts.toFile(clipDir, input.text, {
    rate: `${ratePct >= 0 ? "+" : ""}${ratePct}%`,
  });
  return audioFilePath;
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
