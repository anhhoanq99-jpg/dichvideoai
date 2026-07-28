import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { jsonError } from "@/lib/api-helpers";
import { resolveSpendableBalance } from "@/lib/trial";

/** Số dư credits hiện tại — trang Nạp tiền poll để báo "tiền đã vào" tức thì. */
export async function GET() {
  const session = await getSession();
  if (!session) return jsonError("Chưa đăng nhập", 401);
  // kết toán credit dùng thử hết hạn → trả về số dư THỰC tiêu được
  const { balance } = await resolveSpendableBalance(session.user.id);
  return NextResponse.json({ balance });
}
