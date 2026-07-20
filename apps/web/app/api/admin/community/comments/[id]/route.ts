import { NextResponse, type NextRequest } from "next/server";
import { eq } from "drizzle-orm";
import { communityComments } from "@dichvideo/db";
import { db } from "@/lib/db";
import { jsonError, requireAdmin } from "@/lib/api-helpers";

/** DELETE /api/admin/community/comments/:id — admin xóa một bình luận. */
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const guard = await requireAdmin();
  if (guard.response) return guard.response;

  const { id } = await params;
  const deleted = await db
    .delete(communityComments)
    .where(eq(communityComments.id, id))
    .returning({ id: communityComments.id });
  if (deleted.length === 0) return jsonError("Không tìm thấy bình luận", 404);

  return NextResponse.json({ ok: true });
}
