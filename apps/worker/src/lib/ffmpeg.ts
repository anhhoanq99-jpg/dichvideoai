import { execFile } from "node:child_process";
import path from "node:path";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

/** Resolve binary path — FFMPEG_DIR for Windows dev, bare name on Linux (PATH). */
function bin(name: "ffmpeg" | "ffprobe"): string {
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
  const { stdout } = await execFileAsync(bin("ffprobe"), [
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
  await execFileAsync(bin("ffmpeg"), [
    "-y",
    "-i", videoPath,
    "-vn",
    "-ac", "1",
    "-ar", "16000",
    "-c:a", "flac",
    outPath,
  ]);
}

/** Grab one frame at tSec, scaled to width 640 (aspect kept) — for bbox refinement. */
export async function extractFrameJpeg(
  videoPath: string,
  tSec: number,
  outPath: string,
): Promise<void> {
  await execFileAsync(bin("ffmpeg"), [
    "-y",
    "-ss", tSec.toFixed(2),
    "-i", videoPath,
    "-frames:v", "1",
    "-vf", "scale=640:-2",
    "-q:v", "5",
    outPath,
  ]);
}
