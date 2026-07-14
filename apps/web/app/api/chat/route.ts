import { NextResponse, type NextRequest } from "next/server";
import { and, asc, eq, gt } from "drizzle-orm";
import { z } from "zod";
import { chatMessages, schema } from "@dichvideo/db";
import { db } from "@/lib/db";
import { getSession } from "@/lib/session";
import { isAdminEmail } from "@/lib/admin";
import { jsonError } from "@/lib/api-helpers";

/**
 * Quy tắc phòng chat:
 * - "community": mọi user đọc/gửi được.
 * - "support": user thường luôn bị neo vào phòng riêng "support:<userId>";
 *   admin xem phòng của user khác qua ?u=<userId>.
 */
function resolveRoom(
  kind: string,
  sessionUserId: string,
  admin: boolean,
  targetUserId: string | null,
): string | null {
  if (kind === "community") return "community";
  if (kind === "support") {
    if (admin && targetUserId) return `support:${targetUserId}`;
    return `support:${sessionUserId}`;
  }
  return null;
}

/** GET /api/chat?room=community|support[&u=<userId>][&after=<messageId-time ISO>] */
export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return jsonError("Chưa đăng nhập", 401);
  const admin = isAdminEmail(session.user.email);

  const kind = req.nextUrl.searchParams.get("room") ?? "community";
  const after = req.nextUrl.searchParams.get("after");
  const room = resolveRoom(kind, session.user.id, admin, req.nextUrl.searchParams.get("u"));
  if (!room) return jsonError("Phòng không hợp lệ", 400);

  const afterDate = after ? new Date(after) : null;
  const rows = await db
    .select({
      id: chatMessages.id,
      body: chatMessages.body,
      isAdmin: chatMessages.isAdmin,
      createdAt: chatMessages.createdAt,
      userId: chatMessages.userId,
      userName: schema.user.name,
      userImage: schema.user.image,
    })
    .from(chatMessages)
    .innerJoin(schema.user, eq(chatMessages.userId, schema.user.id))
    .where(
      afterDate && !Number.isNaN(afterDate.getTime())
        ? and(eq(chatMessages.room, room), gt(chatMessages.createdAt, afterDate))
        : eq(chatMessages.room, room),
    )
    .orderBy(asc(chatMessages.createdAt))
    .limit(200);

  return NextResponse.json({
    room,
    isAdmin: admin,
    me: session.user.id,
    messages: rows,
  });
}

const PostBody = z.object({
  room: z.enum(["community", "support"]),
  body: z.string().trim().min(1, "Tin nhắn trống").max(1000, "Tối đa 1.000 ký tự"),
  /** admin trả lời kênh hỗ trợ của user nào */
  u: z.string().optional(),
});

/** POST /api/chat — gửi tin nhắn. */
export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return jsonError("Chưa đăng nhập", 401);
  const admin = isAdminEmail(session.user.email);

  const parsed = PostBody.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return jsonError(parsed.error.issues[0]?.message ?? "Dữ liệu không hợp lệ", 400);
  }
  const room = resolveRoom(parsed.data.room, session.user.id, admin, parsed.data.u ?? null);
  if (!room) return jsonError("Phòng không hợp lệ", 400);

  // chống spam thô: tối đa 20 tin nhắn / phút / user
  const oneMinuteAgo = new Date(Date.now() - 60_000);
  const recent = await db
    .select({ id: chatMessages.id })
    .from(chatMessages)
    .where(
      and(eq(chatMessages.userId, session.user.id), gt(chatMessages.createdAt, oneMinuteAgo)),
    )
    .limit(20);
  if (recent.length >= 20) return jsonError("Bạn gửi quá nhanh — chờ một lát nhé", 429);

  const [msg] = await db
    .insert(chatMessages)
    .values({
      room,
      userId: session.user.id,
      body: parsed.data.body,
      isAdmin: admin,
    })
    .returning();

  return NextResponse.json({ message: msg });
}
