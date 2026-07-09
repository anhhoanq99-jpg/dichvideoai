import { NextRequest, NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { jobs } from "@dichvideo/db";
import { db } from "@/lib/db";
import { getSession } from "@/lib/session";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });
  }
  const { id } = await params;
  const [job] = await db
    .select({
      id: jobs.id,
      type: jobs.type,
      status: jobs.status,
      progress: jobs.progress,
      error: jobs.error,
      videoId: jobs.videoId,
    })
    .from(jobs)
    .where(and(eq(jobs.id, id), eq(jobs.userId, session.user.id)));

  if (!job) {
    return NextResponse.json({ error: "Không tìm thấy job" }, { status: 404 });
  }
  return NextResponse.json(job);
}
