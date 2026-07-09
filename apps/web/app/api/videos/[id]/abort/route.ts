import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { videos } from "@dichvideo/db";
import { db } from "@/lib/db";
import { abortMultipart } from "@/lib/r2";
import { getSession } from "@/lib/session";
import { getOwnVideo } from "@/lib/video-access";

const schema = z.object({ uploadId: z.string().min(1) });

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
  if (!video?.r2Key) {
    return NextResponse.json({ error: "Không tìm thấy video" }, { status: 404 });
  }

  const body = schema.safeParse(await req.json());
  if (!body.success) {
    return NextResponse.json({ error: "Dữ liệu không hợp lệ" }, { status: 400 });
  }

  try {
    await abortMultipart(video.r2Key, body.data.uploadId);
  } catch {
    // already aborted/completed — treat as idempotent
  }
  await db.update(videos).set({ status: "failed" }).where(eq(videos.id, video.id));
  return NextResponse.json({ ok: true });
}
