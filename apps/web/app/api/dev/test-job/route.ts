import { NextResponse } from "next/server";
import { jobs, videos } from "@dichvideo/db";
import { db } from "@/lib/db";
import { enqueuePipelineJob } from "@/lib/queue";
import { getSession } from "@/lib/session";

/**
 * Dev-only smoke-test route: creates a fake video + probe job, enqueues it,
 * so the full web → Redis → worker → Postgres loop can be verified.
 */
export async function POST() {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });
  }

  const [video] = await db
    .insert(videos)
    .values({
      userId: session.user.id,
      originalName: "smoke-test.mp4",
      status: "uploaded",
    })
    .returning();

  const [job] = await db
    .insert(jobs)
    .values({
      videoId: video.id,
      userId: session.user.id,
      type: "probe",
      params: { smoke: true },
    })
    .returning();

  await enqueuePipelineJob("probe", {
    jobId: job.id,
    videoId: video.id,
    userId: session.user.id,
    params: { smoke: true },
  });

  return NextResponse.json({ ok: true, jobId: job.id, videoId: video.id });
}
