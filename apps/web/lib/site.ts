/**
 * Thông tin site dùng cho SEO (metadata, sitemap, robots, OG image).
 * URL lấy từ NEXT_PUBLIC_SITE_URL, rơi về BETTER_AUTH_URL (đã là domain thật khi deploy).
 */
export const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ??
  process.env.BETTER_AUTH_URL ??
  "http://localhost:3000";

export const SITE_NAME = "Dịch Video AI";

export const SITE_DESCRIPTION = {
  vi: "Trích xuất phụ đề, dịch sang tiếng Việt và lồng tiếng AI cho video của bạn. Nhanh, chính xác, tự nhiên.",
  en: "Extract subtitles, translate, and dub your videos with AI. Fast, accurate, natural.",
} as const;
