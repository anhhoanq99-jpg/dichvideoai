import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { subtitleTracks } from "@dichvideo/db";
import { db } from "@/lib/db";
import { getSession } from "@/lib/session";
import { getOwnVideo } from "@/lib/video-access";

/** Danh sách track phụ đề của video (id, loại, ngôn ngữ, số dòng). */
export async function GET(
  _req: NextRequest,
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

  const tracks = await db
    .select({
      id: subtitleTracks.id,
      kind: subtitleTracks.kind,
      lang: subtitleTracks.lang,
      segments: subtitleTracks.segments,
    })
    .from(subtitleTracks)
    .where(eq(subtitleTracks.videoId, video.id));

  return NextResponse.json({
    tracks: tracks.map((t) => ({
      id: t.id,
      kind: t.kind,
      lang: t.lang,
      lines: Array.isArray(t.segments) ? t.segments.length : 0,
    })),
  });
}
