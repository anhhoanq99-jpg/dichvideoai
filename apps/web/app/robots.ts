import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";

/** robots.txt — mở trang marketing, chặn API và các trang app cần đăng nhập. */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/api/",
          "/dashboard",
          "/videos",
          "/exports",
          "/extract",
          "/translate",
          "/history",
          "/transactions",
          "/credits",
        ],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
