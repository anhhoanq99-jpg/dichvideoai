import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { videos } from "@dichvideo/db";
import {
  EXTRACT_METHODS,
  TARGET_LANG_IDS,
  UPLOAD_STYLE_IDS,
  isValidVoiceId,
} from "@dichvideo/shared";
import { db } from "@/lib/db";
import { completeMultipart } from "@/lib/r2";
import {
  createPipelineJob,
  jsonError,
  parseJsonBody,
  requireOwnVideo,
} from "@/lib/api-helpers";

const schema = z.object({
  uploadId: z.string().min(1),
  parts: z
    .array(z.object({ partNumber: z.number().int().min(1), etag: z.string().min(1) }))
    .min(1),
  // pipeline một chạm: probe xong tự trích xuất rồi tự dịch
  pipeline: z
    .object({
      method: z.enum(EXTRACT_METHODS),
      sourceLang: z.string().max(10).optional(),
      /** false = chỉ trích xuất, không dịch (tab Trích xuất phụ đề) */
      translate: z.boolean().default(true),
      targetLang: z.enum(TARGET_LANG_IDS).default("vi"),
      style: z.enum(UPLOAD_STYLE_IDS).default("natural"),
      glossary: z.string().max(10_000).optional(),
      /** trọn gói: dịch xong tự render + lồng tiếng, ra thẳng video hoàn chỉnh */
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

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireOwnVideo(params);
  if (auth.response) return auth.response;
  const { session, video } = auth;
  if (!video.r2Key || video.status !== "uploading") {
    return jsonError("Video không hợp lệ", 404);
  }

  const body = await parseJsonBody(req, schema);
  if (body.response) return body.response;

  await completeMultipart(video.r2Key, body.data.uploadId, body.data.parts);
  const pipeline = body.data.pipeline;
  await db
    .update(videos)
    .set({
      status: "processing",
      ...(pipeline
        ? {
            sourceLang: pipeline.sourceLang ?? null,
            targetLang: pipeline.targetLang,
            translationStyle: pipeline.style,
            glossary: pipeline.glossary ?? null,
          }
        : {}),
    })
    .where(eq(videos.id, video.id));

  const probeParams = pipeline
    ? {
        chain: {
          method: pipeline.method,
          translate: pipeline.translate,
          ...(pipeline.finish && pipeline.translate ? { finish: pipeline.finish } : {}),
        },
      }
    : {};
  const job = await createPipelineJob("probe", video.id, session.user.id, probeParams);
  return NextResponse.json({ ok: true, probeJobId: job.id });
}
