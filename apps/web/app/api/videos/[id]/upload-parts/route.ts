import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { presignPartUrls } from "@/lib/r2";
import { getSession } from "@/lib/session";
import { getOwnVideo } from "@/lib/video-access";

const schema = z.object({
  uploadId: z.string().min(1),
  partNumbers: z.array(z.number().int().min(1).max(10000)).min(1).max(50),
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
  if (!video?.r2Key || video.status !== "uploading") {
    return NextResponse.json({ error: "Video không hợp lệ" }, { status: 404 });
  }

  const body = schema.safeParse(await req.json());
  if (!body.success) {
    return NextResponse.json({ error: "Dữ liệu không hợp lệ" }, { status: 400 });
  }

  const urls = await presignPartUrls(
    video.r2Key,
    body.data.uploadId,
    body.data.partNumbers,
  );
  return NextResponse.json({ urls });
}
