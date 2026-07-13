import { NextRequest, NextResponse } from "next/server";
import { GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { getR2, r2Bucket } from "@/lib/r2";
import { jsonError, requireOwnVideo } from "@/lib/api-helpers";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireOwnVideo(params);
  if (auth.response) return auth.response;
  const { video } = auth;
  if (!video.r2Key) return jsonError("Không tìm thấy video", 404);

  const url = await getSignedUrl(
    getR2(),
    new GetObjectCommand({ Bucket: r2Bucket(), Key: video.r2Key }),
    { expiresIn: 3600 },
  );
  return NextResponse.json({ url });
}
