import { timingSafeEqual } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { and, eq, sql } from "drizzle-orm";
import { z } from "zod";
import { applyCreditDelta, creditLedger, schema } from "@dichvideo/db";
import { topupCredits } from "@dichvideo/shared";
import { db } from "@/lib/db";

/**
 * Webhook SePay: nhận thông báo chuyển khoản ngân hàng, cộng credits.
 * Nội dung CK phải chứa mã "DV<8 ký tự đầu userId>" (hiện ở trang Nạp credits).
 * Bảo mật: header "Authorization: Apikey <SEPAY_WEBHOOK_KEY>" (cấu hình trong SePay).
 */
const schema_ = z.object({
  id: z.union([z.string(), z.number()]),
  transferType: z.string(),
  transferAmount: z.number(),
  content: z.string().nullable().optional(),
  description: z.string().nullable().optional(),
});

export async function POST(req: NextRequest) {
  const key = process.env.SEPAY_WEBHOOK_KEY;
  if (!key) {
    return NextResponse.json({ error: "SePay chưa được cấu hình" }, { status: 503 });
  }
  // so sánh theo thời gian hằng định — endpoint này chuyển tiền, đừng để lộ
  // độ dài/tiền tố khóa qua thời gian phản hồi
  const authz = req.headers.get("authorization") ?? "";
  const expected = `Apikey ${key}`;
  const authzBuf = Buffer.from(authz);
  const expectedBuf = Buffer.from(expected);
  const authorized =
    authzBuf.length === expectedBuf.length && timingSafeEqual(authzBuf, expectedBuf);
  if (!authorized) {
    return NextResponse.json({ error: "Sai khóa webhook" }, { status: 401 });
  }

  const body = schema_.safeParse(await req.json().catch(() => null));
  if (!body.success) {
    return NextResponse.json({ error: "Payload không hợp lệ" }, { status: 400 });
  }
  const tx = body.data;
  if (tx.transferType !== "in" || tx.transferAmount <= 0) {
    return NextResponse.json({ success: true, skipped: "not incoming" });
  }

  const refId = String(tx.id);

  // tìm mã DVxxxxxxxx trong nội dung CK (ngân hàng thường viết hoa, bỏ dấu cách)
  const haystack = `${tx.content ?? ""} ${tx.description ?? ""}`.replace(/\s+/g, "");
  const codeMatch = /DV([a-zA-Z0-9]{8})/i.exec(haystack);
  if (!codeMatch) {
    return NextResponse.json({ success: true, skipped: "no user code" });
  }
  const userIdPrefix = codeMatch[1].toLowerCase();
  const matches = await db
    .select({ id: schema.user.id })
    .from(schema.user)
    .where(sql`lower(left(${schema.user.id}, 8)) = ${userIdPrefix}`)
    .limit(2);
  if (matches.length === 0) {
    return NextResponse.json({ success: true, skipped: "user not found" });
  }
  /**
   * Mã nạp chỉ lấy 8 ký tự đầu của userId nên VỀ LÝ THUYẾT hai tài khoản có thể
   * trùng tiền tố. Trước đây code lấy luôn kết quả đầu tiên — tiền của khách này
   * cộng vào tài khoản khách khác, âm thầm, không ai biết. Xác suất rất thấp
   * nhưng hậu quả là mất tiền của khách nên thà DỪNG để xử tay còn hơn đoán.
   */
  if (matches.length > 1) {
    return NextResponse.json(
      { success: false, error: "Mã nạp trùng nhiều tài khoản — cần xử lý thủ công" },
      { status: 409 },
    );
  }
  const userRow = matches[0];

  // Lần nạp ĐẦU (chưa có lượt topup nào) đủ điều kiện → cộng thêm bonus mồi.
  // Trên webhook retry, lượt topup lần 1 đã ghi vào ledger nên lần 2 thấy "đã có"
  // → không tính bonus lại; mà applyCreditDelta cũng chặn trùng ở tầng DB.
  const [priorTopup] = await db
    .select({ id: creditLedger.id })
    .from(creditLedger)
    .where(and(eq(creditLedger.userId, userRow.id), eq(creditLedger.reason, "topup")))
    .limit(1);
  const isFirstTopup = !priorTopup;

  // nạp nhiều tặng thêm (+10% từ 200k … +80% từ 5 triệu) + bonus lần đầu (50k → +20k)
  const credits = topupCredits(tx.transferAmount, isFirstTopup);
  if (credits <= 0) return NextResponse.json({ success: true, skipped: "amount too small" });

  /**
   * Chống cộng trùng bằng RÀNG BUỘC DB, không bằng SELECT trước đó.
   * SePay retry webhook khi timeout: hai lần gọi song song đều thấy "chưa có
   * dòng nào" rồi cùng cộng tiền — khách nạp 1 lần được cộng 2 lần.
   * `credit_ledger_ref_uidx` chặn ở tầng dưới cùng; trùng thì trả null.
   */
  const entry = await applyCreditDelta(db, {
    userId: userRow.id,
    delta: credits,
    reason: "topup",
    refType: "sepay_tx",
    refId,
  });
  if (!entry) return NextResponse.json({ success: true, skipped: "duplicate" });

  return NextResponse.json({ success: true, credits });
}
