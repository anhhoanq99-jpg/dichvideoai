import type { Metadata } from "next";
import { MarketingHome } from "@/components/marketing/home-page";
import { SITE_DESCRIPTION, SITE_NAME } from "@/lib/site";

export const metadata: Metadata = {
  title: `${SITE_NAME} — AI video translation & dubbing`,
  description: SITE_DESCRIPTION.en,
  alternates: {
    canonical: "/en",
    languages: { vi: "/", en: "/en", "x-default": "/" },
  },
  openGraph: { locale: "en_US" },
};

/** English homepage — fully static, Vietnamese version lives at /. */
export default function MarketingPageEn() {
  return <MarketingHome lang="en" />;
}
