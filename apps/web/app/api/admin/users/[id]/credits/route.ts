import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { applyCreditDelta, InsufficientCreditsError } from "@dichvideo/db";
import { db } from "@/lib/db";
import { jsonError, parseJsonBody, requireAdmin } from "@/lib/api-helpers";

const bodySchema = z.object({
  /** dương = cộng, âm = trừ; khác 0 */
  delta: z.number().int().refine((n) => n !== 0, "Số xu điều chỉnh phải khác 0"),
});

/**
 * POST /api/admin/users/:id/credits — admin cộng/trừ xu thủ công.
 * Ghi vào sổ cái với reason "admin_adjust" (refType/refId để null → mỗi lần bấm
 * là một điều chỉnh độc lập, không bị ràng buộc chống-trùng chặn lại).
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
  const { delta } = parsed.data;

  try {
    const entry = await applyCreditDelta(db, { userId: id, delta, reason: "admin_adjust" });
    if (!entry) return jsonError("Không áp dụng được điều chỉnh", 409);
    return NextResponse.json({ ok: true, balanceAfter: entry.balanceAfter });
  } catch (err) {
    if (err instanceof InsufficientCreditsError) {
      return jsonError(`Số dư không đủ để trừ (hiện có ${err.available} xu)`, 400);
    }
    if (err instanceof Error && err.message.startsWith("User not found")) {
      return jsonError("Không tìm thấy người dùng", 404);
    }
    throw err;
  }
}
