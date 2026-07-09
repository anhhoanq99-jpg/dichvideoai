import { NextRequest, NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { subtitleTracks, videos } from "@dichvideo/db";
import {
  segmentsToSrt,
  segmentsToVtt,
  type SubtitleSegment,
} from "@dichvideo/shared";
import { db } from "@/lib/db";
import { getSession } from "@/lib/session";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });
  }
  const { id } = await params;
  const [row] = await db
    .select({ track: subtitleTracks, videoName: videos.originalName })
    .from(subtitleTracks)
    .innerJoin(videos, eq(subtitleTracks.videoId, videos.id))
    .where(and(eq(subtitleTracks.id, id), eq(videos.userId, session.user.id)));
  if (!row) {
    return NextResponse.json({ error: "Không tìm thấy" }, { status: 404 });
  }

  const format = req.nextUrl.searchParams.get("format") === "vtt" ? "vtt" : "srt";
  const segments = row.track.segments as SubtitleSegment[];
  const content = format === "vtt" ? segmentsToVtt(segments) : segmentsToSrt(segments);
  const base = row.videoName.replace(/\.[^.]+$/, "");
  const filename = `${base}.${row.track.lang}.${format}`;

  return new NextResponse(content, {
    headers: {
      "content-type": format === "vtt" ? "text/vtt; charset=utf-8" : "text/plain; charset=utf-8",
      "content-disposition": `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`,
    },
  });
}
