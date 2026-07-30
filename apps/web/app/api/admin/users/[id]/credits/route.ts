import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { applyCreditDelta, InsufficientCreditsError } from "@dichvideo/db";
import { db } from "@/lib/db";
import { jsonError, parseJsonBody, requireAdmin } from "@/lib/api-helpers";
import { callerId, rateLimit, tooManyRequests } from "@/lib/rate-limit";

const bodySchema = z.object({
  /** dương = cộng, âm = trừ; khác 0 */
  delta: z.number().int().refine((n) => n !== 0, "Số xu điều chỉnh phải khác 0"),
  /**
   * Mã chống bấm trùng do client sinh cho MỖI lần bấm nút.
   * Không có mã thì hai lần gửi (bấm đúp, mạng chớp rồi trình duyệt gửi lại)
   * thành hai lần cộng xu — đây là endpoint tạo tiền, không được phép nhân đôi.
   * Bỏ trống vẫn chạy để tương thích ngược, nhưng client nên luôn gửi.
   */
  requestId: z.string().min(8).max(64).optional(),
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

  // Endpoint TẠO TIỀN — chặn cả script lẫn tay run bấm liên tục, kể cả khi tài
  // khoản admin bị chiếm. 20 lượt/phút thừa cho thao tác tay.
  const rl = await rateLimit("admin-credits", callerId(req, guard.session.user.id), 20, 60);
  if (!rl.ok) return tooManyRequests(rl.retryAfterSec);

  const parsed = await parseJsonBody(req, bodySchema);
  if (parsed.response) return parsed.response;

  const { id } = await params;
  const { delta, requestId } = parsed.data;

  try {
    const entry = await applyCreditDelta(db, {
      userId: id,
      delta,
      reason: "admin_adjust",
      // có requestId → ràng buộc unique (ref_type, ref_id, reason) chặn bấm trùng
      ...(requestId ? { refType: "admin_req", refId: requestId } : {}),
    });
    // null = đã có dòng y hệt (bấm trùng) → coi như thành công, KHÔNG cộng lần hai
    if (!entry) {
      return NextResponse.json({ ok: true, duplicate: true });
    }
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
