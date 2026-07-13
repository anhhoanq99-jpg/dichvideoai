import type { Metadata } from "next";
import { MarketingHome } from "@/components/marketing/home-page";

export const metadata: Metadata = {
  alternates: {
    canonical: "/",
    languages: { vi: "/", en: "/en", "x-default": "/" },
  },
};

/** Trang chủ tiếng Việt — tĩnh hoàn toàn (không đọc cookie), bản EN ở /en. */
export default function MarketingPage() {
  return <MarketingHome lang="vi" />;
}
