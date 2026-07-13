import { randomUUID } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { GetObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { getR2, r2Bucket } from "@/lib/r2";
import { getSession } from "@/lib/session";
import { jsonError } from "@/lib/api-helpers";

const MAX_LOGO_BYTES = 2 * 1024 * 1024;
const ALLOWED_TYPES: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
};

/** Upload logo/watermark hình ảnh của user lên R2 — dùng khi render video. */
export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return jsonError("Chưa đăng nhập", 401);

  const form = await req.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof File)) return jsonError("Thiếu file logo", 400);
  const ext = ALLOWED_TYPES[file.type];
  if (!ext) return jsonError("Logo phải là ảnh PNG, JPG hoặc WebP", 400);
  if (file.size > MAX_LOGO_BYTES) return jsonError("Logo vượt quá 2MB", 400);

  const r2Key = `logos/${session.user.id}/${randomUUID()}.${ext}`;
  await getR2().send(
    new PutObjectCommand({
      Bucket: r2Bucket(),
      Key: r2Key,
      Body: Buffer.from(await file.arrayBuffer()),
      ContentType: file.type,
    }),
  );

  // url xem trước trong studio (1h — render dùng r2Key nên không phụ thuộc url)
  const url = await getSignedUrl(
    getR2(),
    new GetObjectCommand({ Bucket: r2Bucket(), Key: r2Key }),
    { expiresIn: 3600 },
  );
  return NextResponse.json({ ok: true, r2Key, url });
}
