import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { presignPut } from "@/lib/r2";
import { jsonError, parseJsonBody, requireAdmin } from "@/lib/api-helpers";

const MAX_DEMO_BYTES = 200 * 1024 * 1024;
const SLOT_FILES = {
  goc: "goc.mp4",
  "ban-viet": "ban-viet.mp4",
  "huong-dan": "huong-dan.mp4",
} as const;

const schema = z.object({
  slot: z.enum(["goc", "ban-viet", "huong-dan"]),
  contentType: z.string().min(1),
  sizeBytes: z.number().int().positive(),
});

/**
 * POST /api/admin/demo — cấp URL ký sẵn để admin PUT video demo THẲNG lên R2.
 * KHÔNG nhận file qua body nữa: Vercel chặn body request ở ~4.5MB nên cách cũ
 * (FormData → route → R2) chết với gần như mọi video thật, mà lỗi 413 lại trả
 * về HTML chứ không phải JSON nên client chỉ hiện được "Tải lên không được".
 */
export async function POST(req: NextRequest) {
  const guard = await requireAdmin();
  if (guard.response) return guard.response;

  const body = await parseJsonBody(req, schema);
  if (body.response) return body.response;
  const { slot, contentType, sizeBytes } = body.data;

  if (!contentType.startsWith("video/")) return jsonError("File phải là video", 400);
  if (sizeBytes > MAX_DEMO_BYTES) return jsonError("Video demo tối đa 200MB", 400);

  const url = await presignPut(`demo/${SLOT_FILES[slot]}`);
  return NextResponse.json({ url });
}
