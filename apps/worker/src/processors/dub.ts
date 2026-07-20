import { execFile } from "node:child_process";
import { writeFile } from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";
import type { Job } from "bullmq";
import { and, eq } from "drizzle-orm";
import { createDb, jobs, subtitleTracks, videos } from "@dichvideo/db";
import {
  DUB_VOICES,
  isValidVoiceId,
  voiceProvider,
  type DubParams,
  type JobPayload,
  type SubtitleSegment,
} from "@dichvideo/shared";
import { slotMs, atempoChain } from "../lib/dub-timing";
import { audioDurationMs, ffBin, ffprobe, makeSilence } from "../lib/ffmpeg";
import { runFfmpeg } from "../lib/ffmpeg-run";
import { cleanupJobDir, downloadFromR2, jobTempDir, uploadToR2 } from "../lib/r2";
import { synthesizeClipWithRetry } from "../lib/tts";
import { recordUsage } from "../lib/usage";
import { logger } from "../logger";

const execFileAsync = promisify(execFile);

function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n));
}

/**
 * Chạy `fn` cho từng phần tử với tối đa `limit` việc song song, giữ nguyên thứ tự
 * kết quả theo index. `onDone` gọi sau MỖI phần tử xong (để cập nhật tiến độ).
 * Video dài có hàng chục câu → chạy song song nhanh hơn tuần tự nhiều lần.
 */
async function mapPool<T, R>(
  items: T[],
  limit: number,
  fn: (item: T, index: number) => Promise<R>,
  onDone?: () => void,
): Promise<R[]> {
  const results = new Array<R>(items.length);
  let next = 0;
  async function worker() {
    while (true) {
      const i = next++;
      if (i >= items.length) return;
      results[i] = await fn(items[i], i);
      onDone?.();
    }
  }
  const workers = Array.from({ length: Math.min(limit, items.length) }, worker);
  await Promise.all(workers);
  return results;
}

/** Số câu tổng hợp song song theo nhà cung cấp giọng (tránh vượt rate-limit). */
function ttsConcurrency(voice: string): number {
  switch (voiceProvider(voice)) {
    case "gemini":
      return 2; // trả phí, RPM giới hạn — nhẹ tay
    case "eleven":
      return 3; // free tier hẹp
    default:
      return 6; // edge (miễn phí) + google cloud: thoải mái
  }
}

/**
 * Filter âm lượng cho audio gốc: trong khoảng các câu thoại → origVoiceVol,
 * ngoài câu → bgVol. Hai mức bằng nhau (hoặc quá nhiều câu làm biểu thức
 * vượt giới hạn args) → volume phẳng như cũ.
 */
function buildOriginalVolumeFilter(
  segments: SubtitleSegment[],
  bgVol: number,
  origVoiceVol: number,
): string {
  if (Math.abs(origVoiceVol - bgVol) < 0.005) return `volume=${bgVol}`;

  // gộp các câu sát nhau (<300ms) cho biểu thức gọn
  const spans: { start: number; end: number }[] = [];
  for (const seg of segments) {
    const start = seg.startMs / 1000;
    const end = seg.endMs / 1000;
    const last = spans[spans.length - 1];
    if (last && start - last.end < 0.3) last.end = Math.max(last.end, end);
    else spans.push({ start, end });
  }
  if (spans.length > 400) {
    logger.warn(
      { spans: spans.length },
      "quá nhiều câu — bỏ hạ giọng gốc theo câu, dùng âm lượng phẳng",
    );
    return `volume=${bgVol}`;
  }

  const inSpeech = spans
    .map(({ start, end }) => `between(t,${start.toFixed(3)},${end.toFixed(3)})`)
    .join("+");
  return `volume=volume='if(gt(${inSpeech},0),${origVoiceVol},${bgVol})':eval=frame`;
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
  if (!video?.r2Key) throw new Error("Video không tồn tại hoặc chưa upload xong");
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

  const voice = isValidVoiceId(params.voice) ? params.voice : DUB_VOICES[0].id;
  // edge & gcloud bake tốc độ ngay khi tổng hợp; gemini & eleven không có
  // tham số rate → phải áp tốc độ bằng atempo lúc ép khớp khe thoại
  const speedBaked = ["edge", "gcloud"].includes(voiceProvider(voice));
  const speed = clamp(params.speed ?? 1, 0.8, 1.3);
  const aiVol = clamp(params.aiVolume ?? 100, 0, 200) / 100;
  const bgVol = clamp(params.bgVolume ?? 20, 0, 100) / 100;
  // âm lượng tiếng gốc TRONG lúc AI đọc (hạ giọng nói gốc); mặc định = bgVol
  const origVoiceVol =
    clamp(params.origVoiceVolume ?? params.bgVolume ?? 20, 0, 100) / 100;

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

    // 1. TTS từng câu — chạy song song có giới hạn (5→55%)
    let ttsDone = 0;
    const synthResults = await mapPool(
      segments,
      ttsConcurrency(voice),
      (seg, k) =>
        synthesizeClipWithRetry({
          // bỏ *dấu sao* đánh dấu từ nhấn màu — không để giọng đọc vấp
          text: seg.text.replace(/\*/g, "").replace(/\s+/g, " ").trim(),
          voice,
          speed,
          dir,
          name: `clip-${k}`,
        }),
      () => {
        ttsDone++;
        void job.updateProgress(5 + Math.round((ttsDone / segments.length) * 50));
      },
    );
    const clips = synthResults.map((r) => r.file);
    const usage = synthResults.flatMap((r) => r.usage);
    const costUsdMicros = await recordUsage(job.data.jobId, usage);

    // 2. Ép mỗi clip khớp khe thời gian của câu — song song (máy 12 nhân) (55→70%)
    let fitDone = 0;
    const fitted = await mapPool(
      segments,
      6,
      async (_seg, k) => {
        const rawMs = await audioDurationMs(clips[k]);
        const slot = slotMs(segments, k, videoDurMs);
        const atempoFilter = atempoChain(Math.max(rawMs / slot, speedBaked ? 1 : speed));
        const out = path.join(dir, `fit-${k}.wav`);
        // fade 20ms hai đầu chống "click/vấp" khi ghép câu sát nhau hoặc bị cắt
        const expectedMs = Math.min(atempoFilter ? slot : rawMs, slot);
        const fades = `afade=t=in:d=0.02,afade=t=out:st=${Math.max(0, (expectedMs - 25) / 1000).toFixed(3)}:d=0.025`;
        await execFileAsync(ffBin("ffmpeg"), [
          "-y",
          "-i", clips[k],
          "-af", atempoFilter ? `${atempoFilter},${fades}` : fades,
          "-ar", "24000",
          "-ac", "1",
          "-c:a", "pcm_s16le",
          "-t", (slot / 1000).toFixed(3), // chặn cứng: không bao giờ tràn sang câu sau
          out,
        ]);
        return { file: out, durMs: await audioDurationMs(out) };
      },
      () => {
        fitDone++;
        void job.updateProgress(55 + Math.round((fitDone / segments.length) * 15));
      },
    );

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
    const mixWithOriginal = meta.hasAudio && (bgVol > 0 || origVoiceVol > 0);
    // tiếng gốc: GIỮA các câu = bgVol (nhạc nền), TRONG câu = origVoiceVol
    // (hạ giọng nói gốc đúng lúc AI đọc — mô phỏng tách giọng/nhạc)
    const originalAudioFilter = buildOriginalVolumeFilter(segments, bgVol, origVoiceVol);
    const audioArgs = mixWithOriginal
      ? [
          "-filter_complex",
          `[0:a]${originalAudioFilter}[a0];[1:a]volume=${aiVol}[a1];[a0][a1]amix=inputs=2:duration=first:normalize=0[aout]`,
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
    const { sizeBytes } = await uploadToR2(outKey, outPath, "video/mp4");

    await db
      .update(jobs)
      .set({ result: { r2Key: outKey, sizeBytes }, costUsdMicros })
      .where(eq(jobs.id, job.data.jobId));

    logger.info(
      { jobId: job.data.jobId, outKey, segments: segments.length, voice, costUsdMicros },
      "dub done",
    );
    return { r2Key: outKey, sizeBytes };
  } finally {
    await cleanupJobDir(job.data.jobId);
  }
}
