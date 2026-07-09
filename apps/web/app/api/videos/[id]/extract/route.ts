import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { jobs } from "@dichvideo/db";
import { EXTRACT_METHODS } from "@dichvideo/shared";
import { db } from "@/lib/db";
import { enqueuePipelineJob } from "@/lib/queue";
import { getSession } from "@/lib/session";
import { getOwnVideo } from "@/lib/video-access";

const schema = z.object({
  method: z.enum(EXTRACT_METHODS),
  sourceLang: z.string().max(10).optional(),
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
  if (!video) {
    return NextResponse.json({ error: "Không tìm thấy video" }, { status: 404 });
  }
  if (video.status !== "uploaded" && video.status !== "ready") {
    return NextResponse.json(
      { error: "Video chưa sẵn sàng để trích xuất (đang tải lên hoặc đang xử lý)" },
      { status: 409 },
    );
  }

  const body = schema.safeParse(await req.json());
  if (!body.success) {
    return NextResponse.json({ error: "Dữ liệu không hợp lệ" }, { status: 400 });
  }

  const jobParams = { sourceLang: body.data.sourceLang ?? null };
  const [job] = await db
    .insert(jobs)
    .values({
      videoId: video.id,
      userId: session.user.id,
      type: body.data.method,
      params: jobParams,
    })
    .returning();

  await enqueuePipelineJob(body.data.method, {
    jobId: job.id,
    videoId: video.id,
    userId: session.user.id,
    params: jobParams,
  });

  return NextResponse.json({ ok: true, jobId: job.id });
}
