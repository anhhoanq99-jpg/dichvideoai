import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { presignPartUrls } from "@/lib/r2";
import { jsonError, parseJsonBody, requireOwnVideo } from "@/lib/api-helpers";

const schema = z.object({
  uploadId: z.string().min(1),
  partNumbers: z.array(z.number().int().min(1).max(10000)).min(1).max(50),
});

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireOwnVideo(params);
  if (auth.response) return auth.response;
  const { video } = auth;
  if (!video.r2Key || video.status !== "uploading") {
    return jsonError("Video không hợp lệ", 404);
  }

  const body = await parseJsonBody(req, schema);
  if (body.response) return body.response;

  const urls = await presignPartUrls(
    video.r2Key,
    body.data.uploadId,
    body.data.partNumbers,
  );
  return NextResponse.json({ urls });
}
