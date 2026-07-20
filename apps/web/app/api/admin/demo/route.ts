import { NextResponse, type NextRequest } from "next/server";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { getR2, r2Bucket } from "@/lib/r2";
import { jsonError, requireAdmin } from "@/lib/api-helpers";

export const maxDuration = 60;

const MAX_DEMO_BYTES = 50 * 1024 * 1024; // clip demo ngắn
const SLOT_FILES: Record<string, string> = {
  goc: "goc.mp4",
  "ban-viet": "ban-viet.mp4",
  "huong-dan": "huong-dan.mp4",
};

/**
 * POST /api/admin/demo — admin thay video demo trang chủ (multipart: slot, file).
 * Ghi đè lên khe cố định trong R2; trang chủ tự lấy bản mới.
 */
export async function POST(req: NextRequest) {
  const guard = await requireAdmin();
  if (guard.response) return guard.response;

  const form = await req.formData().catch(() => null);
  const slot = String(form?.get("slot") ?? "");
  const file = form?.get("file");
  const target = SLOT_FILES[slot];
  if (!target) return jsonError("Khe demo không hợp lệ", 400);
  if (!(file instanceof File) || file.size === 0) return jsonError("Thiếu file video", 400);
  if (!file.type.startsWith("video/")) return jsonError("File phải là video (MP4)", 400);
  if (file.size > MAX_DEMO_BYTES) return jsonError("Video demo tối đa 50MB", 400);

  await getR2().send(
    new PutObjectCommand({
      Bucket: r2Bucket(),
      Key: `demo/${target}`,
      Body: Buffer.from(await file.arrayBuffer()),
      ContentType: "video/mp4",
    }),
  );

  return NextResponse.json({ ok: true });
}
