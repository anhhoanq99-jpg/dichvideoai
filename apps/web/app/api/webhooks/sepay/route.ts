import { timingSafeEqual } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { sql } from "drizzle-orm";
import { z } from "zod";
import { applyCreditDelta, schema } from "@dichvideo/db";
import { VND_PER_CREDIT, topupBonusPercent } from "@dichvideo/shared";
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
  const [userRow] = await db
    .select({ id: schema.user.id })
    .from(schema.user)
    .where(sql`lower(left(${schema.user.id}, 8)) = ${userIdPrefix}`);
  if (!userRow) {
    return NextResponse.json({ success: true, skipped: "user not found" });
  }

  // nạp nhiều tặng thêm: +10% từ 200k … +80% từ 5 triệu
  const base = Math.floor(tx.transferAmount / VND_PER_CREDIT);
  const credits = Math.floor(base * (1 + topupBonusPercent(tx.transferAmount) / 100));
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
