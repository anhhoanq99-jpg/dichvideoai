import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { jobs, subtitleTracks, videos } from "@dichvideo/db";
import {
  TARGET_LANG_IDS,
  TRANSLATION_STYLE_IDS,
  parseSrt,
} from "@dichvideo/shared";
import { db } from "@/lib/db";
import { enqueuePipelineJob } from "@/lib/queue";
import { getSession } from "@/lib/session";

const schema = z.object({
  fileName: z.string().min(1).max(200),
  /** nội dung file .srt/.vtt */
  content: z.string().min(1).max(2_000_000),
  targetLang: z.enum(TARGET_LANG_IDS).default("vi"),
  style: z.enum(TRANSLATION_STYLE_IDS).default("natural"),
  customPrompt: z.string().max(2000).optional(),
  glossary: z.string().max(10_000).optional(),
});

/**
 * Dịch file phụ đề độc lập (không cần video): tạo bản ghi video "ảo" chứa
 * track gốc từ SRT rồi chạy job dịch như bình thường.
 */
export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });
  }
  const body = schema.safeParse(await req.json().catch(() => null));
  if (!body.success) {
    return NextResponse.json({ error: "Dữ liệu không hợp lệ" }, { status: 400 });
  }

  const segments = parseSrt(body.data.content);
  if (segments.length === 0) {
    return NextResponse.json(
      { error: "Không đọc được câu phụ đề nào — kiểm tra định dạng .srt/.vtt" },
      { status: 400 },
    );
  }

  const durationSec = Math.ceil((segments[segments.length - 1]?.endMs ?? 0) / 1000);
  const [video] = await db
    .insert(videos)
    .values({
      userId: session.user.id,
      originalName: body.data.fileName,
      status: "ready",
      durationSec: Math.max(1, durationSec),
      targetLang: body.data.targetLang,
      translationStyle: body.data.style,
      glossary: body.data.glossary ?? null,
    })
    .returning();

  await db.insert(subtitleTracks).values({
    videoId: video.id,
    kind: "original",
    lang: "unknown",
    segments,
  });

  const jobParams = {
    style: body.data.style,
    targetLang: body.data.targetLang,
    ...(body.data.customPrompt ? { customPrompt: body.data.customPrompt } : {}),
  };
  const [job] = await db
    .insert(jobs)
    .values({
      videoId: video.id,
      userId: session.user.id,
      type: "translate",
      params: jobParams,
    })
    .returning();

  await enqueuePipelineJob("translate", {
    jobId: job.id,
    videoId: video.id,
    userId: session.user.id,
    params: jobParams,
  });

  return NextResponse.json({
    ok: true,
    jobId: job.id,
    videoId: video.id,
    lines: segments.length,
  });
}
