import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { subtitleTracks } from "@dichvideo/db";
import { db } from "@/lib/db";
import { requireOwnVideo } from "@/lib/api-helpers";

/** Danh sách track phụ đề của video (id, loại, ngôn ngữ, số dòng). */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireOwnVideo(params);
  if (auth.response) return auth.response;
  const { video } = auth;

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
