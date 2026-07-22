import { NextRequest, NextResponse } from "next/server";
import { desc, eq } from "drizzle-orm";
import { z } from "zod";
import { videos } from "@dichvideo/db";
import { UPLOAD_ALLOWED_TYPES, UPLOAD_MAX_BYTES } from "@dichvideo/shared";
import { db } from "@/lib/db";
import { createMultipart } from "@/lib/r2";
import { getSession } from "@/lib/session";
import { jsonError } from "@/lib/api-helpers";
import { callerId, rateLimit, tooManyRequests } from "@/lib/rate-limit";

const initSchema = z.object({
  name: z.string().min(1).max(255),
  sizeBytes: z.number().int().positive().max(UPLOAD_MAX_BYTES),
  contentType: z.string(),
});

/** Init upload: create video row + R2 multipart upload. */
export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) {
    return jsonError("Chưa đăng nhập", 401);
  }

  // chặn tạo hàng loạt video row (mỗi upload là 1 row + 1 multipart R2)
  const rl = await rateLimit("video-create", callerId(req, session.user.id), 20, 60);
  if (!rl.ok) return tooManyRequests(rl.retryAfterSec);

  // req.json() ném nếu thân request hỏng → phải bắt, không thì route đổ ra 500
  // với thân RỖNG và client chỉ nhận được "Unexpected end of JSON input"
  const raw = await req.json().catch(() => null);
  const body = initSchema.safeParse(raw);
  if (!body.success) {
    // nói rõ sai ở đâu thay vì "Dữ liệu không hợp lệ" chung chung — tên file
    // Douyin/TikTok kèm hashtag rất dễ vượt 255 ký tự
    const issue = body.error.issues[0];
    const detail =
      issue?.path?.[0] === "name"
        ? "Tên file quá dài hoặc trống — đổi tên ngắn lại rồi tải lên"
        : issue?.path?.[0] === "sizeBytes"
          ? "Video vượt giới hạn 2GB"
          : "Dữ liệu không hợp lệ";
    return NextResponse.json({ error: detail }, { status: 400 });
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

  /**
   * Bọc phần chạm DB + R2: nếu R2 thiếu cấu hình hoặc DB chớp, để lỗi ném ra
   * ngoài thì Next trả 500 THÂN RỖNG và người dùng chỉ thấy
   * "Unexpected end of JSON input" — không biết hỏng ở đâu.
   */
  try {
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
  } catch (err) {
    console.error("[videos/init] khong tao duoc upload:", err);
    return NextResponse.json(
      {
        error: `Không khởi tạo được upload: ${err instanceof Error ? err.message : String(err)}`,
      },
      { status: 500 },
    );
  }
}

/** List own videos. */
export async function GET() {
  const session = await getSession();
  if (!session) {
    return jsonError("Chưa đăng nhập", 401);
  }
  const rows = await db
    .select()
    .from(videos)
    .where(eq(videos.userId, session.user.id))
    .orderBy(desc(videos.createdAt))
    .limit(100);
  return NextResponse.json({ videos: rows });
}
