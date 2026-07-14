import { NextResponse, type NextRequest } from "next/server";
import { and, count, desc, eq, gt } from "drizzle-orm";
import { z } from "zod";
import { communityComments, communityPosts, schema } from "@dichvideo/db";
import { db } from "@/lib/db";
import { getSession } from "@/lib/session";
import { isAdminEmail } from "@/lib/admin";
import { jsonError } from "@/lib/api-helpers";

/** GET /api/community/posts — 50 bài mới nhất kèm số bình luận. */
export async function GET() {
  const session = await getSession();
  if (!session) return jsonError("Chưa đăng nhập", 401);

  const posts = await db
    .select({
      id: communityPosts.id,
      title: communityPosts.title,
      body: communityPosts.body,
      isAdmin: communityPosts.isAdmin,
      createdAt: communityPosts.createdAt,
      userId: communityPosts.userId,
      userName: schema.user.name,
      userImage: schema.user.image,
      commentCount: count(communityComments.id),
    })
    .from(communityPosts)
    .innerJoin(schema.user, eq(communityPosts.userId, schema.user.id))
    .leftJoin(communityComments, eq(communityComments.postId, communityPosts.id))
    .groupBy(communityPosts.id, schema.user.name, schema.user.image)
    .orderBy(desc(communityPosts.createdAt))
    .limit(50);

  return NextResponse.json({ me: session.user.id, posts });
}

const PostBody = z.object({
  title: z.string().trim().min(3, "Tiêu đề quá ngắn").max(120, "Tiêu đề tối đa 120 ký tự"),
  body: z.string().trim().max(2000, "Nội dung tối đa 2.000 ký tự").default(""),
});

/** POST /api/community/posts — đăng bài mới (tối đa 5 bài / 10 phút / user). */
export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return jsonError("Chưa đăng nhập", 401);

  const parsed = PostBody.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return jsonError(parsed.error.issues[0]?.message ?? "Dữ liệu không hợp lệ", 400);
  }

  const tenMinutesAgo = new Date(Date.now() - 10 * 60_000);
  const recent = await db
    .select({ id: communityPosts.id })
    .from(communityPosts)
    .where(
      and(eq(communityPosts.userId, session.user.id), gt(communityPosts.createdAt, tenMinutesAgo)),
    )
    .limit(5);
  if (recent.length >= 5) return jsonError("Bạn đăng quá nhanh — chờ một lát nhé", 429);

  const [post] = await db
    .insert(communityPosts)
    .values({
      userId: session.user.id,
      title: parsed.data.title,
      body: parsed.data.body,
      isAdmin: isAdminEmail(session.user.email),
    })
    .returning();

  return NextResponse.json({ post });
}
