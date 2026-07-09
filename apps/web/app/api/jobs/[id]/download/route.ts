import { NextRequest, NextResponse } from "next/server";
import { GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { and, eq } from "drizzle-orm";
import { jobs } from "@dichvideo/db";
import { db } from "@/lib/db";
import { getR2, r2Bucket } from "@/lib/r2";
import { getSession } from "@/lib/session";

/** Redirect to a presigned GET for a finished render output. */
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
    .select({ result: jobs.result, status: jobs.status })
    .from(jobs)
    .where(and(eq(jobs.id, id), eq(jobs.userId, session.user.id)));

  const r2Key = (job?.result as { r2Key?: string } | null)?.r2Key;
  if (!job || job.status !== "done" || !r2Key) {
    return NextResponse.json({ error: "Chưa có video kết quả" }, { status: 404 });
  }

  const url = await getSignedUrl(
    getR2(),
    new GetObjectCommand({
      Bucket: r2Bucket(),
      Key: r2Key,
      ResponseContentDisposition: `attachment; filename*=UTF-8''${encodeURIComponent("video-vietsub.mp4")}`,
    }),
    { expiresIn: 3600 },
  );
  return NextResponse.redirect(url);
}
