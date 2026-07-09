import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { jobs, videos } from "@dichvideo/db";
import { EXTRACT_METHODS, UPLOAD_STYLE_IDS } from "@dichvideo/shared";
import { db } from "@/lib/db";
import { enqueuePipelineJob } from "@/lib/queue";
import { completeMultipart } from "@/lib/r2";
import { getSession } from "@/lib/session";
import { getOwnVideo } from "@/lib/video-access";

const schema = z.object({
  uploadId: z.string().min(1),
  parts: z
    .array(z.object({ partNumber: z.number().int().min(1), etag: z.string().min(1) }))
    .min(1),
  // pipeline một chạm: probe xong tự trích xuất rồi tự dịch
  pipeline: z
    .object({
      method: z.enum(EXTRACT_METHODS),
      sourceLang: z.string().max(10).optional(),
      style: z.enum(UPLOAD_STYLE_IDS).default("natural"),
      glossary: z.string().max(10_000).optional(),
    })
    .optional(),
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

  await completeMultipart(video.r2Key, body.data.uploadId, body.data.parts);
  const p = body.data.pipeline;
  await db
    .update(videos)
    .set({
      status: "processing",
      ...(p
        ? {
            sourceLang: p.sourceLang ?? null,
            translationStyle: p.style,
            glossary: p.glossary ?? null,
          }
        : {}),
    })
    .where(eq(videos.id, video.id));

  const probeParams = p ? { chain: { method: p.method } } : {};
  const [job] = await db
    .insert(jobs)
    .values({
      videoId: video.id,
      userId: session.user.id,
      type: "probe",
      params: probeParams,
    })
    .returning();

  await enqueuePipelineJob("probe", {
    jobId: job.id,
    videoId: video.id,
    userId: session.user.id,
    params: probeParams,
  });

  return NextResponse.json({ ok: true, probeJobId: job.id });
}
