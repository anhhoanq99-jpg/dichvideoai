import { NextRequest, NextResponse } from "next/server";
import { desc, eq } from "drizzle-orm";
import { z } from "zod";
import { videos } from "@dichvideo/db";
import { UPLOAD_ALLOWED_TYPES, UPLOAD_MAX_BYTES } from "@dichvideo/shared";
import { db } from "@/lib/db";
import { createMultipart } from "@/lib/r2";
import { getSession } from "@/lib/session";

const initSchema = z.object({
  name: z.string().min(1).max(255),
  sizeBytes: z.number().int().positive().max(UPLOAD_MAX_BYTES),
  contentType: z.string(),
});

/** Init upload: create video row + R2 multipart upload. */
export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });
  }

  const body = initSchema.safeParse(await req.json());
  if (!body.success) {
    return NextResponse.json({ error: "Dữ liệu không hợp lệ" }, { status: 400 });
  }
  const ext = UPLOAD_ALLOWED_TYPES[body.data.contentType];
  if (!ext) {
    return NextResponse.json(
      { error: "Định dạng không hỗ trợ. Chỉ nhận MP4, MOV, MKV, WebM." },
      { status: 400 },
    );
  }

  const uploadIp =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local";

  const [video] = await db
    .insert(videos)
    .values({
      userId: session.user.id,
      originalName: body.data.name,
      sizeBytes: body.data.sizeBytes,
      status: "uploading",
      uploadIp,
    })
    .returning();

  const key = `uploads/${session.user.id}/${video.id}/source.${ext}`;
  const uploadId = await createMultipart(key, body.data.contentType);

  await db.update(videos).set({ r2Key: key }).where(eq(videos.id, video.id));

  return NextResponse.json({ videoId: video.id, key, uploadId });
}

/** List own videos. */
export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });
  }
  const rows = await db
    .select()
    .from(videos)
    .where(eq(videos.userId, session.user.id))
    .orderBy(desc(videos.createdAt))
    .limit(100);
  return NextResponse.json({ videos: rows });
}
