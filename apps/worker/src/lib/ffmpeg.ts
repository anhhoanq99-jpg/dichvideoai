import { execFile } from "node:child_process";
import path from "node:path";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

/** Resolve binary path — FFMPEG_DIR for Windows dev, bare name on Linux (PATH). */
export function ffBin(name: "ffmpeg" | "ffprobe"): string {
  const dir = process.env.FFMPEG_DIR;
  return dir ? path.join(dir, name) : name;
}

export interface ProbeResult {
  durationSec: number;
  width: number | null;
  height: number | null;
  hasAudio: boolean;
}

export async function ffprobe(localPath: string): Promise<ProbeResult> {
  const { stdout } = await execFileAsync(ffBin("ffprobe"), [
    "-v", "error",
    "-print_format", "json",
    "-show_format",
    "-show_streams",
    localPath,
  ]);
  const data = JSON.parse(stdout) as {
    format?: { duration?: string };
    streams?: { codec_type?: string; width?: number; height?: number }[];
  };
  const videoStream = data.streams?.find((s) => s.codec_type === "video");
  const hasAudio = Boolean(data.streams?.some((s) => s.codec_type === "audio"));
  return {
    durationSec: Math.round(Number(data.format?.duration ?? 0)),
    width: videoStream?.width ?? null,
    height: videoStream?.height ?? null,
    hasAudio,
  };
}

/** Extract mono 16kHz FLAC for STT — keeps 60-min audio well under Groq's 100MB cap. */
export async function extractAudio(videoPath: string, outPath: string): Promise<void> {
  await execFileAsync(ffBin("ffmpeg"), [
    "-y",
    "-i", videoPath,
    "-vn",
    "-ac", "1",
    "-ar", "16000",
    "-c:a", "flac",
    outPath,
  ]);
}

/** Thời lượng audio chính xác tới ms (ffprobe của video chỉ làm tròn giây). */
export async function audioDurationMs(file: string): Promise<number> {
  const { stdout } = await execFileAsync(ffBin("ffprobe"), [
    "-v", "error",
    "-show_entries", "format=duration",
    "-of", "default=noprint_wrappers=1:nokey=1",
    file,
  ]);
  return Math.round(parseFloat(stdout.trim()) * 1000);
}

/** Tạo file WAV im lặng dài `ms` — chèn giữa các câu khi ghép track thuyết minh. */
export async function makeSilence(file: string, ms: number): Promise<void> {
  await execFileAsync(ffBin("ffmpeg"), [
    "-y",
    "-f", "lavfi",
    "-i", "anullsrc=r=24000:cl=mono",
    "-t", (ms / 1000).toFixed(3),
    "-c:a", "pcm_s16le",
    file,
  ]);
}
