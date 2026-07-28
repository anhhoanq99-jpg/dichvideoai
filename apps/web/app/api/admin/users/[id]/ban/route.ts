import { NextResponse, type NextRequest } from "next/server";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { schema } from "@dichvideo/db";
import { db } from "@/lib/db";
import { jsonError, parseJsonBody, requireAdmin } from "@/lib/api-helpers";

const bodySchema = z.object({ banned: z.boolean() });

/**
 * POST /api/admin/users/:id/ban — admin khoá/mở tài khoản.
 * Khoá: đặt banned_at + XOÁ mọi phiên đăng nhập của user (đá ra ngay). Mở: xoá
 * banned_at. Layout (app) chặn truy cập theo banned_at ở mỗi lần tải trang.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const guard = await requireAdmin();
  if (guard.response) return guard.response;

  const parsed = await parseJsonBody(req, bodySchema);
  if (parsed.response) return parsed.response;

  const { id } = await params;
  const { banned } = parsed.data;

  // không tự khoá chính mình (tránh admin tự đá mình ra khỏi hệ thống)
  if (banned && id === guard.session.user.id) {
    return jsonError("Không thể tự khoá tài khoản của mình", 400);
  }

  const [updated] = await db
    .update(schema.user)
    .set({ bannedAt: banned ? new Date() : null })
    .where(eq(schema.user.id, id))
    .returning({ id: schema.user.id });
  if (!updated) return jsonError("Không tìm thấy người dùng", 404);

  // khoá → xoá phiên để hết hiệu lực ngay, không chờ cache phiên hết hạn
  if (banned) {
    await db.delete(schema.session).where(eq(schema.session.userId, id));
  }

  return NextResponse.json({ ok: true, banned });
}
