import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { videos } from "@dichvideo/db";
import { db } from "@/lib/db";
import { abortMultipart } from "@/lib/r2";
import { jsonError, parseJsonBody, requireOwnVideo } from "@/lib/api-helpers";

const schema = z.object({ uploadId: z.string().min(1) });

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireOwnVideo(params);
  if (auth.response) return auth.response;
  const { video } = auth;
  if (!video.r2Key) return jsonError("Không tìm thấy video", 404);

  const body = await parseJsonBody(req, schema);
  if (body.response) return body.response;

  try {
    await abortMultipart(video.r2Key, body.data.uploadId);
  } catch {
    // already aborted/completed — treat as idempotent
  }
  await db.update(videos).set({ status: "failed" }).where(eq(videos.id, video.id));
  return NextResponse.json({ ok: true });
}
