import { NextRequest, NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { jobs, subtitleTracks, videos } from "@dichvideo/db";
import { TARGET_LANG_IDS, TRANSLATION_STYLE_IDS } from "@dichvideo/shared";
import { db } from "@/lib/db";
import { enqueuePipelineJob } from "@/lib/queue";
import { getSession } from "@/lib/session";
import { getOwnVideo } from "@/lib/video-access";

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
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });
  }
  const { id } = await params;
  const video = await getOwnVideo(id, session.user.id);
  if (!video) {
    return NextResponse.json({ error: "Không tìm thấy video" }, { status: 404 });
  }

  const [original] = await db
    .select({ id: subtitleTracks.id })
    .from(subtitleTracks)
    .where(
      and(eq(subtitleTracks.videoId, video.id), eq(subtitleTracks.kind, "original")),
    );
  if (!original) {
    return NextResponse.json(
      { error: "Video chưa có phụ đề gốc — hãy trích xuất trước" },
      { status: 409 },
    );
  }

  const body = schema.safeParse(await req.json().catch(() => ({})));
  if (!body.success) {
    return NextResponse.json({ error: "Dữ liệu không hợp lệ" }, { status: 400 });
  }

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

  return NextResponse.json({ ok: true, jobId: job.id });
}
