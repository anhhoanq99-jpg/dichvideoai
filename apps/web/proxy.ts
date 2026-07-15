import { NextResponse, type NextRequest } from "next/server";

/**
 * Web có nhiều alias trên Vercel (bản dài -wc-s-projects5, bản -git-main…).
 * Cookie đăng nhập gắn theo từng host — user vào bằng alias khác sẽ tưởng bị
 * đăng xuất. Ép mọi alias về MỘT địa chỉ chính để phiên đăng nhập luôn dính.
 */
const CANONICAL_HOST = "dichvideoai-web.vercel.app";

const ALIAS_HOSTS = new Set([
  "dichvideoai-web-wc-s-projects5.vercel.app",
  "dichvideoai-web-git-main-wc-s-projects5.vercel.app",
]);

export function proxy(request: NextRequest) {
  const host = request.headers.get("host");
  if (host && ALIAS_HOSTS.has(host)) {
    const url = new URL(request.url);
    url.host = CANONICAL_HOST;
    url.protocol = "https:";
    url.port = "";
    return NextResponse.redirect(url, 308);
  }
  return NextResponse.next();
}

export const config = {
  // bỏ qua asset tĩnh cho nhẹ — trang đã redirect thì asset tự theo host mới
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
