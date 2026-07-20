import { NextResponse, type NextRequest } from "next/server";
import { eq } from "drizzle-orm";
import { communityPosts } from "@dichvideo/db";
import { db } from "@/lib/db";
import { jsonError, requireAdmin } from "@/lib/api-helpers";

/** DELETE /api/admin/community/posts/:id — admin xóa bài (bình luận tự xóa theo cascade). */
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const guard = await requireAdmin();
  if (guard.response) return guard.response;

  const { id } = await params;
  const deleted = await db
    .delete(communityPosts)
    .where(eq(communityPosts.id, id))
    .returning({ id: communityPosts.id });
  if (deleted.length === 0) return jsonError("Không tìm thấy bài viết", 404);

  return NextResponse.json({ ok: true });
}
