import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { videos } from "@dichvideo/db";
import {
  EXTRACT_METHODS,
  TARGET_LANG_IDS,
  UPLOAD_STYLE_IDS,
  detectVideoSource,
  isImportableUrl,
  isValidVoiceId,
  normalizeImportUrl,
} from "@dichvideo/shared";
import { db } from "@/lib/db";
import { createPipelineJob, jsonError, parseJsonBody } from "@/lib/api-helpers";
import { getSession } from "@/lib/session";

const schema = z.object({
  url: z.string().min(8).max(2000),
  // cùng cấu trúc pipeline với upload tay (complete route)
  pipeline: z
    .object({
      method: z.enum(EXTRACT_METHODS),
      sourceLang: z.string().max(10).optional(),
      translate: z.boolean().default(true),
      targetLang: z.enum(TARGET_LANG_IDS).default("vi"),
      style: z.enum(UPLOAD_STYLE_IDS).default("natural"),
      glossary: z.string().max(10_000).optional(),
      finish: z
        .object({
          render: z.boolean().default(true),
          dub: z.boolean().default(false),
          voice: z.string().refine(isValidVoiceId).optional(),
        })
        .optional(),
    })
    .optional(),
});

/**
 * Nhập video từ đường link (Douyin, Bilibili, YouTube, TikTok… ~1.800 trang):
 * tạo video row → worker tải về bằng yt-dlp, đưa lên R2 → chạy pipeline
 * y như video upload tay. Miễn phí credits (probe/extract mới tính tiền).
 */
export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return jsonError("Chưa đăng nhập", 401);

  const body = await parseJsonBody(req, schema);
  if (body.response) return body.response;

  // link trang search/khám phá (Douyin modal_id…) → link video trực tiếp
  const url = normalizeImportUrl(body.data.url);
  if (!isImportableUrl(url)) {
    return jsonError("Đường link không hợp lệ — chỉ nhận link http(s) công khai", 400);
  }

  const uploadIp =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local";
  const source = detectVideoSource(url);
  const pipeline = body.data.pipeline;

  const [video] = await db
    .insert(videos)
    .values({
      userId: session.user.id,
      // tên tạm theo nguồn — worker thay bằng tiêu đề thật sau khi tải
      originalName: source ? `Video ${source.name}` : new URL(url).hostname,
      status: "processing",
      uploadIp,
      ...(pipeline
        ? {
            sourceLang: pipeline.sourceLang ?? null,
            targetLang: pipeline.targetLang,
            translationStyle: pipeline.style,
            glossary: pipeline.glossary ?? null,
          }
        : {}),
    })
    .returning();

  const chain = pipeline
    ? {
        method: pipeline.method,
        translate: pipeline.translate,
        ...(pipeline.finish && pipeline.translate ? { finish: pipeline.finish } : {}),
      }
    : undefined;
  const job = await createPipelineJob("import", video.id, session.user.id, {
    url,
    ...(chain ? { chain } : {}),
  });

  return NextResponse.json({
    videoId: video.id,
    importJobId: job.id,
    source: source?.name ?? null,
  });
}
