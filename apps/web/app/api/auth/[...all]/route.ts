import { NextResponse, type NextRequest } from "next/server";
import { toNextJsHandler } from "better-auth/next-js";
import { auth } from "@/lib/auth";
import { callerId, rateLimit, tooManyRequests } from "@/lib/rate-limit";

const handler = toNextJsHandler(auth);

/**
 * Chặn tạo tài khoản hàng loạt.
 *
 * Mỗi tài khoản mới được tặng ngay 10.000 xu mà không cần xác minh email, nên
 * tạo tài khoản gần như là "in tiền": một email rác là thêm một suất dùng thử,
 * kèm luôn một rổ rate-limit mới cho mọi API khác.
 *
 * Giới hạn theo IP vì lúc đăng ký chưa có user. Đặt rộng tay — 5 tài khoản mỗi
 * giờ trên một IP — để nhà chung, quán net hay văn phòng dùng chung một IP vẫn
 * đăng ký bình thường; ngưỡng này chỉ chặn script.
 *
 * Dùng Redis sẵn có thay vì rate-limit tích hợp của better-auth: bản tích hợp
 * đếm trong RAM tiến trình, mà trên Vercel mỗi request có thể rơi vào instance
 * khác nên đếm không ăn thua; chuyển nó sang "database" thì phải thêm bảng,
 * trong khi lịch sử migration của repo đang lệch (xem CLAUDE.md).
 */
async function guardSignup(req: NextRequest): Promise<NextResponse | null> {
  if (!req.nextUrl.pathname.includes("/sign-up")) return null;
  const rl = await rateLimit("auth-signup", callerId(req), 5, 3600);
  if (rl.ok) return null;
  return tooManyRequests(rl.retryAfterSec);
}

export async function POST(req: NextRequest) {
  const blocked = await guardSignup(req);
  if (blocked) return blocked;
  return handler.POST(req);
}

export const { GET } = handler;
