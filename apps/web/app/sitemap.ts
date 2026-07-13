import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";

/** Sitemap cho bot tìm kiếm — chỉ các trang marketing công khai. */
export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();
  const homeLanguages = { vi: `${SITE_URL}/`, en: `${SITE_URL}/en` };
  return [
    {
      url: `${SITE_URL}/`,
      lastModified,
      changeFrequency: "weekly",
      priority: 1,
      alternates: { languages: homeLanguages },
    },
    {
      url: `${SITE_URL}/en`,
      lastModified,
      changeFrequency: "weekly",
      priority: 0.8,
      alternates: { languages: homeLanguages },
    },
    {
      url: `${SITE_URL}/dieu-khoan`,
      lastModified,
      changeFrequency: "monthly",
      priority: 0.3,
    },
    {
      url: `${SITE_URL}/bao-mat`,
      lastModified,
      changeFrequency: "monthly",
      priority: 0.3,
    },
  ];
}
