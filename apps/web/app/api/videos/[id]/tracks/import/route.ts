import { NextRequest, NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { subtitleTracks } from "@dichvideo/db";
import { parseSrt } from "@dichvideo/shared";
import { db } from "@/lib/db";
import { getSession } from "@/lib/session";
import { getOwnVideo } from "@/lib/video-access";

const MAX_SRT_BYTES = 2 * 1024 * 1024;

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

  const form = await req.formData();
  const file = form.get("file");
  const kind = form.get("kind") === "translated" ? "translated" : "original";
  const lang = String(form.get("lang") ?? (kind === "translated" ? "vi" : "unknown")).slice(0, 10);

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Thiếu file SRT" }, { status: 400 });
  }
  if (file.size > MAX_SRT_BYTES) {
    return NextResponse.json({ error: "File SRT vượt quá 2MB" }, { status: 400 });
  }

  const segments = parseSrt(await file.text());
  if (segments.length === 0) {
    return NextResponse.json(
      { error: "Không đọc được dòng phụ đề nào — kiểm tra định dạng SRT" },
      { status: 400 },
    );
  }

  // replace same-kind track
  await db
    .delete(subtitleTracks)
    .where(
      and(eq(subtitleTracks.videoId, video.id), eq(subtitleTracks.kind, kind)),
    );
  const [track] = await db
    .insert(subtitleTracks)
    .values({ videoId: video.id, kind, lang, segments })
    .returning({ id: subtitleTracks.id });

  return NextResponse.json({ ok: true, trackId: track.id, count: segments.length });
}
