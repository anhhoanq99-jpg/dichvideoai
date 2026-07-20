import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { subtitleTracks, videos } from "@dichvideo/db";
import {
  TARGET_LANG_IDS,
  TRANSLATION_STYLE_IDS,
  parseSrt,
} from "@dichvideo/shared";
import { db } from "@/lib/db";
import { getSession } from "@/lib/session";
import { createPipelineJob, jsonError, parseJsonBody } from "@/lib/api-helpers";
import { callerId, rateLimit, tooManyRequests } from "@/lib/rate-limit";

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
  if (!session) return jsonError("Chưa đăng nhập", 401);

  const rl = await rateLimit("srt-translate", callerId(req, session.user.id), 10, 60);
  if (!rl.ok) return tooManyRequests(rl.retryAfterSec);

  const body = await parseJsonBody(req, schema);
  if (body.response) return body.response;

  const segments = parseSrt(body.data.content);
  if (segments.length === 0) {
    return jsonError("Không đọc được câu phụ đề nào — kiểm tra định dạng .srt/.vtt", 400);
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
  const job = await createPipelineJob("translate", video.id, session.user.id, jobParams);

  return NextResponse.json({
    ok: true,
    jobId: job.id,
    videoId: video.id,
    lines: segments.length,
  });
}
