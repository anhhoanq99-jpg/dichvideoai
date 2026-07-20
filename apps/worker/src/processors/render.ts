import { writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { Job } from "bullmq";
import { and, eq } from "drizzle-orm";
import { createDb, jobs, subtitleTracks, videos } from "@dichvideo/db";
import {
  RENDER_FONTS,
  STYLE_PRESETS,
  SUB_EFFECT_IDS,
  buildAss,
  opacityToHexAlpha,
  type JobPayload,
  type RenderParams,
  type SubtitleSegment,
} from "@dichvideo/shared";
import { DUB_VOICES } from "@dichvideo/shared";
import { chainJob } from "../lib/chain";
import { runFfmpeg } from "../lib/ffmpeg-run";
import {
  buildFiltergraph,
  MAX_LINE_COVERS,
  outputResolution,
  subBoxToMargins,
} from "../lib/filtergraph";
import { cleanupJobDir, downloadFromR2, jobTempDir, uploadToR2 } from "../lib/r2";
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
  // mặc định lấy backOpacity của chính preset (trước đây hard-code theo id
  // "solid-box" nên các preset mới có hộp nền đều bị ép về 67)
  const opacity = clamp(params.boxOpacity ?? preset.backOpacity ?? 67, 0, 100);
  const alpha = opacityToHexAlpha(opacity);

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
    ...(params.accentColor && HEX_RE.test(params.accentColor)
      ? { accent: params.accentColor }
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
    const effect = SUB_EFFECT_IDS.includes(params.effect as (typeof SUB_EFFECT_IDS)[number])
      ? (params.effect as (typeof SUB_EFFECT_IDS)[number])
      : "none";
    await writeFile(assPath, buildAss(segments, style, playRes, effect), "utf8");

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

    // logo hình ảnh: tải từ R2 về rồi đưa vào ffmpeg làm input thứ 2 ([1:v])
    let logoImagePath: string | null = null;
    if (params.logoImage?.r2Key) {
      logoImagePath = path.join(dir, `logo${path.extname(params.logoImage.r2Key) || ".png"}`);
      await downloadFromR2(params.logoImage.r2Key, logoImagePath);
    }

    // Vùng che gắn theo từng dòng phụ đề: dòng nào có `box` thì che đúng chỗ đó,
    // chỉ trong khoảng thời gian dòng đó chạy (chữ nước ngoài xuất hiện rải rác).
    const allLineCovers = segments
      .filter((s) => s.box)
      .map((s) => ({ box: s.box!, startMs: s.startMs, endMs: s.endMs }));
    const lineCovers = allLineCovers.slice(0, MAX_LINE_COVERS);
    if (allLineCovers.length > lineCovers.length) {
      logger.warn(
        { jobId: job.data.jobId, total: allLineCovers.length, used: lineCovers.length },
        "quá nhiều vùng che theo dòng — chỉ áp dụng phần đầu để render không quá chậm",
      );
    }

    const graph = buildFiltergraph({
      srcWidth: video.width,
      srcHeight: video.height,
      coverMode: params.coverMode,
      regions: params.regions,
      lineCovers,
      blurStrength: params.blurStrength,
      aspect: params.aspect,
      assPath,
      fontsDir: FONTS_DIR,
      logo: logoImagePath ? undefined : logo,
      logoImage: logoImagePath ? params.logoImage : undefined,
    });

    const outPath = path.join(dir, "out.mp4");
    await runFfmpeg({
      args: [
        "-y",
        "-i", srcPath,
        ...(logoImagePath ? ["-i", logoImagePath] : []),
        "-filter_complex", graph,
        "-map", "[v]",
        "-map", "0:a?",
        "-c:v", "libx264",
        "-preset", "veryfast",
        "-crf", "20",
        // yuv420p 8-bit: phát được mọi thiết bị (nguồn 10-bit/AV1 nếu không ép sẽ ra
        // H.264 10-bit — nhiều điện thoại/trình duyệt không phát nổi)
        "-pix_fmt", "yuv420p",
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
    const { sizeBytes } = await uploadToR2(outKey, outPath, "video/mp4");

    await db
      .update(jobs)
      .set({ result: { r2Key: outKey, sizeBytes } })
      .where(eq(jobs.id, job.data.jobId));

    logger.info(
      { jobId: job.data.jobId, outKey, sizeMb: Math.round(sizeBytes / 1e6) },
      "render done",
    );

    // trọn gói: render xong tự lồng tiếng LÊN BẢN ĐÃ RENDER (video cuối có cả phụ đề lẫn giọng đọc)
    const finish = (
      job.data.params as {
        finish?: {
          dub?: boolean;
          voice?: string;
          speed?: number;
          aiVolume?: number;
          bgVolume?: number;
          origVoiceVolume?: number;
        };
      }
    ).finish;
    if (finish?.dub) {
      const nextId = await chainJob({
        videoId: video.id,
        userId: job.data.userId,
        type: "dub",
        params: {
          trackId: params.trackId,
          voice: finish.voice ?? DUB_VOICES[0].id,
          speed: finish.speed ?? 1,
          aiVolume: finish.aiVolume ?? 100,
          bgVolume: finish.bgVolume ?? 20,
          ...(finish.origVoiceVolume !== undefined
            ? { origVoiceVolume: finish.origVoiceVolume }
            : {}),
          sourceR2Key: outKey,
        },
      });
      logger.info({ videoId: video.id, nextId }, "chained dub on rendered output");
    }

    return { r2Key: outKey, sizeBytes };
  } finally {
    await cleanupJobDir(job.data.jobId);
  }
}

const HEX_RE = /^#[0-9a-fA-F]{6}([0-9a-fA-F]{2})?$/;

function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n));
}
