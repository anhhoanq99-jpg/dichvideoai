import { NextRequest, NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { jobs, subtitleTracks } from "@dichvideo/db";
import { EDGE_VOICE_IDS } from "@dichvideo/shared";
import { db } from "@/lib/db";
import { enqueuePipelineJob } from "@/lib/queue";
import { getSession } from "@/lib/session";
import { getOwnVideo } from "@/lib/video-access";

const schema = z.object({
  trackId: z.string().uuid(),
  voice: z.string().refine((v) => EDGE_VOICE_IDS.has(v), "Giọng không hợp lệ"),
  speed: z.number().min(0.8).max(1.3).default(1),
  aiVolume: z.number().int().min(0).max(200).default(100),
  bgVolume: z.number().int().min(0).max(100).default(20),
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
  if (!video.durationSec) {
    return NextResponse.json({ error: "Video chưa xử lý xong" }, { status: 409 });
  }

  const body = schema.safeParse(await req.json());
  if (!body.success) {
    return NextResponse.json({ error: "Dữ liệu không hợp lệ" }, { status: 400 });
  }

  const [track] = await db
    .select({ id: subtitleTracks.id })
    .from(subtitleTracks)
    .where(
      and(
        eq(subtitleTracks.id, body.data.trackId),
        eq(subtitleTracks.videoId, video.id),
      ),
    );
  if (!track) {
    return NextResponse.json({ error: "Track phụ đề không hợp lệ" }, { status: 400 });
  }

  const [job] = await db
    .insert(jobs)
    .values({
      videoId: video.id,
      userId: session.user.id,
      type: "dub",
      params: body.data,
    })
    .returning();

  await enqueuePipelineJob("dub", {
    jobId: job.id,
    videoId: video.id,
    userId: session.user.id,
    params: body.data,
  });

  return NextResponse.json({ ok: true, jobId: job.id });
}
