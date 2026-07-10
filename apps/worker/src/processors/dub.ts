import { execFile } from "node:child_process";
import { stat, writeFile } from "node:fs/promises";
import { createReadStream } from "node:fs";
import path from "node:path";
import { promisify } from "node:util";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import type { Job } from "bullmq";
import { and, eq } from "drizzle-orm";
import { createDb, jobs, subtitleTracks, videos } from "@dichvideo/db";
import {
  DUB_VOICES,
  EDGE_VOICE_IDS,
  GEMINI_VOICE_IDS,
  geminiVoiceName,
  type DubParams,
  type JobPayload,
  type SubtitleSegment,
} from "@dichvideo/shared";
import { slotMs, atempoChain } from "../lib/dub-timing";
import { ffprobe } from "../lib/ffmpeg";
import { runFfmpeg } from "../lib/ffmpeg-run";
import { cleanupJobDir, downloadFromR2, getR2, jobTempDir } from "../lib/r2";
import { synthesizeClipWithRetry } from "../lib/tts";
import { recordUsage, type UsageRecord } from "../lib/usage";
import { logger } from "../logger";

const execFileAsync = promisify(execFile);

function ffBin(name: "ffmpeg" | "ffprobe"): string {
  const dir = process.env.FFMPEG_DIR;
  return dir ? path.join(dir, name) : name;
}

/** Thời lượng audio chính xác tới ms (ffprobe của video chỉ làm tròn giây). */
async function audioDurationMs(file: string): Promise<number> {
  const { stdout } = await execFileAsync(ffBin("ffprobe"), [
    "-v", "error",
    "-show_entries", "format=duration",
    "-of", "default=noprint_wrappers=1:nokey=1",
    file,
  ]);
  return Math.round(parseFloat(stdout.trim()) * 1000);
}

async function makeSilence(file: string, ms: number): Promise<void> {
  await execFileAsync(ffBin("ffmpeg"), [
    "-y",
    "-f", "lavfi",
    "-i", "anullsrc=r=24000:cl=mono",
    "-t", (ms / 1000).toFixed(3),
    "-c:a", "pcm_s16le",
    file,
  ]);
}

function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n));
}

/**
 * Lồng tiếng: TTS từng câu → ép khớp khe thời gian (atempo) → ghép track
 * thuyết minh bằng concat (câu + khoảng lặng) → trộn với audio gốc → mux,
 * video giữ nguyên (stream copy, không re-encode hình).
 */
export async function dubProcessor(job: Job<JobPayload>) {
  const db = createDb();
  const params = job.data.params as unknown as DubParams;

  const [video] = await db
    .select()
    .from(videos)
    .where(eq(videos.id, job.data.videoId));
  if (!video?.r2Key) throw new Error("Video không tồn tại hoặc chưa upload");
  if (!video.durationSec) throw new Error("Video thiếu metadata (chưa probe)");

  const [track] = await db
    .select()
    .from(subtitleTracks)
    .where(
      and(
        eq(subtitleTracks.id, params.trackId),
        eq(subtitleTracks.videoId, video.id),
      ),
    );
  if (!track) throw new Error("Không tìm thấy track phụ đề để lồng tiếng");

  const voice =
    EDGE_VOICE_IDS.has(params.voice) || GEMINI_VOICE_IDS.has(params.voice)
      ? params.voice
      : DUB_VOICES[0].id;
  const isGemini = geminiVoiceName(voice) !== null;
  const speed = clamp(params.speed ?? 1, 0.8, 1.3);
  const aiVol = clamp(params.aiVolume ?? 100, 0, 200) / 100;
  const bgVol = clamp(params.bgVolume ?? 20, 0, 100) / 100;

  const segments = (track.segments as SubtitleSegment[]).filter(
    (s) => s.text.trim().length > 0 && s.endMs > s.startMs,
  );
  if (segments.length === 0) throw new Error("Track không có câu nào để đọc");

  // trọn gói: lồng tiếng lên bản đã render phụ đề thay vì video gốc
  const srcKey =
    typeof params.sourceR2Key === "string" && params.sourceR2Key
      ? params.sourceR2Key
      : video.r2Key;

  const dir = await jobTempDir(job.data.jobId);
  try {
    const srcPath = path.join(dir, path.basename(srcKey));
    await downloadFromR2(srcKey, srcPath);
    const meta = await ffprobe(srcPath);
    await job.updateProgress(5);

    const videoDurMs = video.durationSec * 1000;

    // 1. TTS từng câu (5→55%)
    const clips: string[] = [];
    const usage: UsageRecord[] = [];
    for (const [k, seg] of segments.entries()) {
      const r = await synthesizeClipWithRetry({
        text: seg.text.replace(/\s+/g, " ").trim(),
        voice,
        speed,
        dir,
        name: `clip-${k}`,
      });
      clips.push(r.file);
      usage.push(...r.usage);
      await job.updateProgress(5 + Math.round(((k + 1) / segments.length) * 50));
    }
    const costUsdMicros = await recordUsage(job.data.jobId, usage);

    // 2. Ép mỗi clip khớp khe thời gian của câu (55→70%)
    const fitted: { file: string; durMs: number }[] = [];
    for (const [k, seg] of segments.entries()) {
      const rawMs = await audioDurationMs(clips[k]);
      const slot = slotMs(segments, k, videoDurMs);
      // Edge đã bake tốc độ vào giọng; Gemini không có tham số rate → áp bằng atempo
      const chain = atempoChain(Math.max(rawMs / slot, isGemini ? speed : 1));
      const out = path.join(dir, `fit-${k}.wav`);
      // fade 20ms hai đầu chống "click/vấp" khi ghép câu sát nhau hoặc bị cắt
      const expMs = Math.min(chain ? slot : rawMs, slot);
      const fades = `afade=t=in:d=0.02,afade=t=out:st=${Math.max(0, (expMs - 25) / 1000).toFixed(3)}:d=0.025`;
      await execFileAsync(ffBin("ffmpeg"), [
        "-y",
        "-i", clips[k],
        "-af", chain ? `${chain},${fades}` : fades,
        "-ar", "24000",
        "-ac", "1",
        "-c:a", "pcm_s16le",
        "-t", (slot / 1000).toFixed(3), // chặn cứng: không bao giờ tràn sang câu sau
        out,
      ]);
      fitted.push({ file: out, durMs: await audioDurationMs(out) });
      await job.updateProgress(55 + Math.round(((k + 1) / segments.length) * 15));
    }

    // 3. Ghép track thuyết minh: [lặng] câu [lặng] câu ... (70→75%)
    const parts: string[] = [];
    let cursor = 0;
    for (const [k, seg] of segments.entries()) {
      const gap = seg.startMs - cursor;
      if (gap > 10) {
        const silence = path.join(dir, `sil-${k}.wav`);
        await makeSilence(silence, gap);
        parts.push(silence);
        cursor += gap;
      }
      parts.push(fitted[k].file);
      cursor += fitted[k].durMs;
    }
    const listPath = path.join(dir, "concat.txt");
    await writeFile(
      listPath,
      parts.map((p) => `file '${p.replace(/\\/g, "/")}'`).join("\n"),
      "utf8",
    );
    const dubTrack = path.join(dir, "dub.wav");
    await execFileAsync(ffBin("ffmpeg"), [
      "-y",
      "-f", "concat",
      "-safe", "0",
      "-i", listPath,
      "-c", "copy",
      dubTrack,
    ]);
    await job.updateProgress(75);

    // 4. Trộn với audio gốc + mux, video stream copy (75→95%)
    const outPath = path.join(dir, "out.mp4");
    const mixWithOriginal = meta.hasAudio && bgVol > 0;
    const audioArgs = mixWithOriginal
      ? [
          "-filter_complex",
          `[0:a]volume=${bgVol}[a0];[1:a]volume=${aiVol}[a1];[a0][a1]amix=inputs=2:duration=first:normalize=0[aout]`,
          "-map", "0:v",
          "-map", "[aout]",
        ]
      : [
          "-filter_complex", `[1:a]volume=${aiVol}[aout]`,
          "-map", "0:v",
          "-map", "[aout]",
        ];
    await runFfmpeg({
      args: [
        "-y",
        "-i", srcPath,
        "-i", dubTrack,
        ...audioArgs,
        "-c:v", "copy",
        "-c:a", "aac",
        "-b:a", "192k",
        "-movflags", "+faststart",
        outPath,
      ],
      durationSec: video.durationSec,
      onProgress: (pct) => void job.updateProgress(75 + Math.round(pct * 0.2)),
    });
    await job.updateProgress(95);

    const outKey = `outputs/${job.data.userId}/${video.id}/${job.data.jobId}-dub.mp4`;
    const { size } = await stat(outPath);
    await getR2().send(
      new PutObjectCommand({
        Bucket: process.env.R2_BUCKET!,
        Key: outKey,
        Body: createReadStream(outPath),
        ContentType: "video/mp4",
        ContentLength: size,
      }),
    );

    await db
      .update(jobs)
      .set({ result: { r2Key: outKey, sizeBytes: size }, costUsdMicros })
      .where(eq(jobs.id, job.data.jobId));

    logger.info(
      { jobId: job.data.jobId, outKey, segments: segments.length, voice, costUsdMicros },
      "dub done",
    );
    return { r2Key: outKey, sizeBytes: size };
  } finally {
    await cleanupJobDir(job.data.jobId);
  }
}
