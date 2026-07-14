import { NextResponse, type NextRequest } from "next/server";
import { and, asc, eq, gt } from "drizzle-orm";
import { z } from "zod";
import { communityComments, communityPosts, schema } from "@dichvideo/db";
import { db } from "@/lib/db";
import { getSession } from "@/lib/session";
import { isAdminEmail } from "@/lib/admin";
import { jsonError } from "@/lib/api-helpers";

/** GET /api/community/posts/:id/comments — toàn bộ bình luận của bài (cũ → mới). */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSession();
  if (!session) return jsonError("Chưa đăng nhập", 401);
  const { id } = await params;

  const comments = await db
    .select({
      id: communityComments.id,
      body: communityComments.body,
      isAdmin: communityComments.isAdmin,
      createdAt: communityComments.createdAt,
      userId: communityComments.userId,
      userName: schema.user.name,
      userImage: schema.user.image,
    })
    .from(communityComments)
    .innerJoin(schema.user, eq(communityComments.userId, schema.user.id))
    .where(eq(communityComments.postId, id))
    .orderBy(asc(communityComments.createdAt))
    .limit(200);

  return NextResponse.json({ me: session.user.id, comments });
}

const CommentBody = z.object({
  body: z.string().trim().min(1, "Bình luận trống").max(1000, "Tối đa 1.000 ký tự"),
});

/** POST /api/community/posts/:id/comments — bình luận (tối đa 20 / phút / user). */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSession();
  if (!session) return jsonError("Chưa đăng nhập", 401);
  const { id } = await params;

  // bài phải tồn tại
  const [post] = await db
    .select({ id: communityPosts.id })
    .from(communityPosts)
    .where(eq(communityPosts.id, id));
  if (!post) return jsonError("Bài viết không tồn tại", 404);

  const parsed = CommentBody.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return jsonError(parsed.error.issues[0]?.message ?? "Dữ liệu không hợp lệ", 400);
  }

  const oneMinuteAgo = new Date(Date.now() - 60_000);
  const recent = await db
    .select({ id: communityComments.id })
    .from(communityComments)
    .where(
      and(
        eq(communityComments.userId, session.user.id),
        gt(communityComments.createdAt, oneMinuteAgo),
      ),
    )
    .limit(20);
  if (recent.length >= 20) return jsonError("Bạn gửi quá nhanh — chờ một lát nhé", 429);

  const [comment] = await db
    .insert(communityComments)
    .values({
      postId: id,
      userId: session.user.id,
      body: parsed.data.body,
      isAdmin: isAdminEmail(session.user.email),
    })
    .returning();

  return NextResponse.json({ comment });
}
