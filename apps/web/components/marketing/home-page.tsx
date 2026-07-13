import type { Lang } from "@/lib/i18n";
import { SiteHeader } from "./site-header";
import { HeroSection } from "./hero-section";
import { FeaturesSection } from "./features-section";
import { HowItWorksSection } from "./how-it-works-section";
import { VideoSourcesSection } from "./video-sources-section";
import { PricingSection } from "./pricing-section";
import { FaqSection } from "./faq-section";
import { SiteFooter } from "./site-footer";
import { FAQ_T } from "./faq-data";

/**
 * Trang chủ marketing hoàn chỉnh — prerender TĨNH cho cả hai ngôn ngữ
 * (/ = vi, /en = en) để CDN phục vụ tức thì, không SSR theo từng request.
 * Kèm JSON-LD schema.org/FAQPage để Google hiện rich result.
 */
export function MarketingHome({ lang }: { lang: Lang }) {
  const faqJsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: FAQ_T[lang].faqs.map((f) => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: { "@type": "Answer", text: f.a },
    })),
  };

  return (
    <div className="min-h-screen bg-cinema text-neutral-200">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />
      <SiteHeader lang={lang} />
      <main>
        <HeroSection lang={lang} />
        <VideoSourcesSection lang={lang} />
        <FeaturesSection lang={lang} />
        <HowItWorksSection lang={lang} />
        <PricingSection lang={lang} />
        <FaqSection lang={lang} />
      </main>
      <SiteFooter lang={lang} />
    </div>
  );
}
