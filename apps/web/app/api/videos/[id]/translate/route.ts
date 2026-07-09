import { NextRequest, NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { jobs, subtitleTracks, videos } from "@dichvideo/db";
import { db } from "@/lib/db";
import { enqueuePipelineJob } from "@/lib/queue";
import { getSession } from "@/lib/session";
import { getOwnVideo } from "@/lib/video-access";

const schema = z.object({
  style: z.enum(["natural", "formal", "literal"]).default("natural"),
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
      glossary: body.data.glossary ?? video.glossary,
    })
    .where(eq(videos.id, video.id));

  const [job] = await db
    .insert(jobs)
    .values({
      videoId: video.id,
      userId: session.user.id,
      type: "translate",
      params: { style: body.data.style },
    })
    .returning();

  await enqueuePipelineJob("translate", {
    jobId: job.id,
    videoId: video.id,
    userId: session.user.id,
    params: { style: body.data.style },
  });

  return NextResponse.json({ ok: true, jobId: job.id });
}
