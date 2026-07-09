import { NextRequest, NextResponse } from "next/server";
import { GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { getR2, r2Bucket } from "@/lib/r2";
import { getSession } from "@/lib/session";
import { getOwnVideo } from "@/lib/video-access";

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
  if (!video?.r2Key) {
    return NextResponse.json({ error: "Không tìm thấy video" }, { status: 404 });
  }

  const url = await getSignedUrl(
    getR2(),
    new GetObjectCommand({ Bucket: r2Bucket(), Key: video.r2Key }),
    { expiresIn: 3600 },
  );
  return NextResponse.json({ url });
}
