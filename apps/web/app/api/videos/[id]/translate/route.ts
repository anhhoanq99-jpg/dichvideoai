import { NextRequest, NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { subtitleTracks, videos } from "@dichvideo/db";
import { TARGET_LANG_IDS, TRANSLATION_STYLE_IDS } from "@dichvideo/shared";
import { db } from "@/lib/db";
import {
  createPipelineJob,
  jsonError,
  parseJsonBody,
  requireOwnVideo,
} from "@/lib/api-helpers";
import { callerId, rateLimit, tooManyRequests } from "@/lib/rate-limit";

const schema = z.object({
  style: z.enum(TRANSLATION_STYLE_IDS).default("natural"),
  targetLang: z.enum(TARGET_LANG_IDS).default("vi"),
  customPrompt: z.string().max(2000).optional(),
  glossary: z.string().max(10_000).optional(),
});

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireOwnVideo(params);
  if (auth.response) return auth.response;

  // route tao job = ton CPU worker + tien API; chan spam/script
  const rl = await rateLimit("job-translate", callerId(req, auth.session.user.id), 10, 60);
  if (!rl.ok) return tooManyRequests(rl.retryAfterSec);
  const { session, video } = auth;

  const [original] = await db
    .select({ id: subtitleTracks.id })
    .from(subtitleTracks)
    .where(
      and(eq(subtitleTracks.videoId, video.id), eq(subtitleTracks.kind, "original")),
    );
  if (!original) {
    return jsonError("Video chưa có phụ đề gốc — hãy trích xuất trước", 409);
  }

  const body = await parseJsonBody(req, schema);
  if (body.response) return body.response;

  await db
    .update(videos)
    .set({
      translationStyle: body.data.style,
      targetLang: body.data.targetLang,
      glossary: body.data.glossary ?? video.glossary,
    })
    .where(eq(videos.id, video.id));

  const jobParams = {
    style: body.data.style,
    targetLang: body.data.targetLang,
    ...(body.data.customPrompt ? { customPrompt: body.data.customPrompt } : {}),
  };
  const job = await createPipelineJob("translate", video.id, session.user.id, jobParams);
  return NextResponse.json({ ok: true, jobId: job.id });
}
