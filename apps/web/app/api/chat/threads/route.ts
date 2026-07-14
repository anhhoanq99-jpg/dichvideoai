import { NextResponse } from "next/server";
import { desc, eq, like, max } from "drizzle-orm";
import { chatMessages, schema } from "@dichvideo/db";
import { db } from "@/lib/db";
import { getSession } from "@/lib/session";
import { isAdminEmail } from "@/lib/admin";
import { jsonError } from "@/lib/api-helpers";

/** GET /api/chat/threads — admin: danh sách kênh hỗ trợ (mỗi user một kênh). */
export async function GET() {
  const session = await getSession();
  if (!session) return jsonError("Chưa đăng nhập", 401);
  if (!isAdminEmail(session.user.email)) return jsonError("Chỉ dành cho admin", 403);

  // mỗi phòng support:<userId> lấy thời điểm tin nhắn mới nhất
  const rooms = await db
    .select({ room: chatMessages.room, lastAt: max(chatMessages.createdAt) })
    .from(chatMessages)
    .where(like(chatMessages.room, "support:%"))
    .groupBy(chatMessages.room)
    .orderBy(desc(max(chatMessages.createdAt)))
    .limit(100);

  // gắn tên user cho từng kênh
  const threads = await Promise.all(
    rooms.map(async (r) => {
      const userId = r.room.slice("support:".length);
      const [u] = await db
        .select({ name: schema.user.name, email: schema.user.email })
        .from(schema.user)
        .where(eq(schema.user.id, userId));
      return {
        userId,
        name: u?.name ?? "(đã xóa)",
        email: u?.email ?? "",
        lastAt: r.lastAt,
      };
    }),
  );

  return NextResponse.json({ threads });
}
