import { stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import type { Job } from "bullmq";
import { createReadStream } from "node:fs";
import { and, eq } from "drizzle-orm";
import { createDb, jobs, subtitleTracks, videos } from "@dichvideo/db";
import {
  RENDER_FONTS,
  STYLE_PRESETS,
  buildAss,
  type JobPayload,
  type RenderParams,
  type SubtitleSegment,
} from "@dichvideo/shared";
import { runFfmpeg } from "../lib/ffmpeg-run";
import {
  buildFiltergraph,
  outputResolution,
  subBoxToMargins,
} from "../lib/filtergraph";
import { cleanupJobDir, downloadFromR2, getR2, jobTempDir } from "../lib/r2";
import { logger } from "../logger";

const FONTS_DIR = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../../fonts",
);

export async function renderProcessor(job: Job<JobPayload>) {
  const db = createDb();
  const params = job.data.params as unknown as RenderParams;

  const [video] = await db
    .select()
    .from(videos)
    .where(eq(videos.id, job.data.videoId));
  if (!video?.r2Key) throw new Error("Video không tồn tại hoặc chưa upload");
  if (!video.durationSec || !video.width || !video.height) {
    throw new Error("Video thiếu metadata (chưa probe)");
  }

  const [track] = await db
    .select()
    .from(subtitleTracks)
    .where(
      and(
        eq(subtitleTracks.id, params.trackId),
        eq(subtitleTracks.videoId, video.id),
      ),
    );
  if (!track) throw new Error("Không tìm thấy track phụ đề để ghép");

  const preset = STYLE_PRESETS.find((p) => p.id === params.styleId);
  if (!preset) throw new Error(`Style không hợp lệ: ${params.styleId}`);

  const boxed = params.boxed ?? preset.borderStyle === 3;
  // combine box color + opacity into #RRGGBBAA
  const boxHex =
    params.boxColor && HEX_RE.test(params.boxColor)
      ? params.boxColor
      : (preset.back ?? "#000000");
  const opacity = clamp(params.boxOpacity ?? (preset.id === "solid-box" ? 100 : 67), 0, 100);
  const alpha = Math.round((opacity / 100) * 255)
    .toString(16)
    .padStart(2, "0")
    .toUpperCase();

  // user-drawn subtitle box → margins (position + wrap width); falls back to marginV
  const boxMargins = params.subBox
    ? subBoxToMargins(
        params.subBox,
        video.width,
        video.height,
        params.aspect,
      )
    : undefined;

  const style = {
    ...preset,
    font: RENDER_FONTS.includes(params.font as (typeof RENDER_FONTS)[number])
      ? (params.font as string)
      : preset.font,
    size: clamp(params.fontSize ?? preset.size, 20, 120),
    bold: params.bold ?? preset.bold,
    marginV: boxMargins
      ? boxMargins.marginV
      : clamp(params.marginV ?? preset.marginV, 0, 400),
    ...(boxMargins ? { marginL: boxMargins.marginL, marginR: boxMargins.marginR } : {}),
    borderStyle: (boxed ? 3 : 1) as 1 | 3,
    ...(params.primaryColor && HEX_RE.test(params.primaryColor)
      ? { primary: params.primaryColor }
      : {}),
    ...(params.outlineColor && HEX_RE.test(params.outlineColor)
      ? { outline: params.outlineColor }
      : {}),
    back: `${boxHex}${alpha}`,
  };

  const segments = track.segments as SubtitleSegment[];

  const dir = await jobTempDir(job.data.jobId);
  try {
    const srcPath = path.join(dir, path.basename(video.r2Key));
    await downloadFromR2(video.r2Key, srcPath);
    await job.updateProgress(5);

    const playRes = outputResolution({
      srcWidth: video.width,
      srcHeight: video.height,
      aspect: params.aspect,
    });
    const assPath = path.join(dir, "subs.ass");
    await writeFile(assPath, buildAss(segments, style, playRes), "utf8");

    const logo =
      params.logo?.text?.trim() && HEX_RE.test(params.logo.color)
        ? {
            ...params.logo,
            text: params.logo.text.trim().slice(0, 60),
            fontSize: clamp(params.logo.fontSize, 12, 96),
            opacity: clamp(params.logo.opacity, 0, 100),
            fontFile: path.join(FONTS_DIR, "BeVietnamPro-Bold.ttf"),
          }
        : undefined;

    const graph = buildFiltergraph({
      srcWidth: video.width,
      srcHeight: video.height,
      coverMode: params.coverMode,
      regions: params.regions,
      aspect: params.aspect,
      assPath,
      fontsDir: FONTS_DIR,
      logo,
    });

    const outPath = path.join(dir, "out.mp4");
    await runFfmpeg({
      args: [
        "-y",
        "-i", srcPath,
        "-filter_complex", graph,
        "-map", "[v]",
        "-map", "0:a?",
        "-c:v", "libx264",
        "-preset", "veryfast",
        "-crf", "20",
        "-c:a", "copy",
        "-movflags", "+faststart",
        outPath,
      ],
      durationSec: video.durationSec,
      onProgress: (pct) =>
        void job.updateProgress(5 + Math.round(pct * 0.85)), // 5..90
    });
    await job.updateProgress(90);

    const outKey = `outputs/${job.data.userId}/${video.id}/${job.data.jobId}.mp4`;
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
      .set({ result: { r2Key: outKey, sizeBytes: size } })
      .where(eq(jobs.id, job.data.jobId));

    logger.info(
      { jobId: job.data.jobId, outKey, sizeMb: Math.round(size / 1e6) },
      "render done",
    );
    return { r2Key: outKey, sizeBytes: size };
  } finally {
    await cleanupJobDir(job.data.jobId);
  }
}

const HEX_RE = /^#[0-9a-fA-F]{6}([0-9a-fA-F]{2})?$/;

function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n));
}
