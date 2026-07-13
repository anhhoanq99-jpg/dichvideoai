import { NextRequest, NextResponse } from "next/server";
import { desc, eq } from "drizzle-orm";
import { jobs, subtitleTracks } from "@dichvideo/db";
import { db } from "@/lib/db";
import { requireOwnVideo } from "@/lib/api-helpers";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireOwnVideo(params);
  if (auth.response) return auth.response;
  const { video } = auth;
  // latestJob: màn "đang xử lý" đọc tiến độ/lỗi của bước pipeline hiện tại
  const [tracks, [latestJob]] = await Promise.all([
    db
      .select({
        id: subtitleTracks.id,
        kind: subtitleTracks.kind,
        lang: subtitleTracks.lang,
        segments: subtitleTracks.segments,
        createdAt: subtitleTracks.createdAt,
      })
      .from(subtitleTracks)
      .where(eq(subtitleTracks.videoId, video.id)),
    db
      .select({
        id: jobs.id,
        type: jobs.type,
        status: jobs.status,
        progress: jobs.progress,
        error: jobs.error,
      })
      .from(jobs)
      .where(eq(jobs.videoId, video.id))
      .orderBy(desc(jobs.createdAt))
      .limit(1),
  ]);

  return NextResponse.json({ video, tracks, latestJob: latestJob ?? null });
}
