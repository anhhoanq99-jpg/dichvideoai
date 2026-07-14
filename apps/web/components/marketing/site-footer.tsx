import Link from "next/link";
import { ArrowRight, Clapperboard } from "lucide-react";
import type { Lang } from "@/lib/i18n";
import { Reveal } from "./reveal";

const T = {
  vi: {
    ctaH2: "Sẵn sàng Việt hóa video đầu tiên?",
    ctaP: "Đăng nhập bằng Google, nhận 10.000 credits dùng thử — không cần thẻ.",
    ctaBtn: "Bắt đầu ngay",
    brand: "Dịch Video AI",
    navFeatures: "Tính năng",
    navPricing: "Bảng giá",
    navFaq: "Hỏi đáp",
    navTerms: "Điều khoản",
    navPrivacy: "Bảo mật",
    navLogin: "Đăng nhập",
    copyright: "Người dùng chịu trách nhiệm bản quyền nội dung tải lên.",
  },
  en: {
    ctaH2: "Ready to localize your first video?",
    ctaP: "Sign in with Google and get 10,000 free trial credits — no card required.",
    ctaBtn: "Get started",
    brand: "Dịch Video AI",
    navFeatures: "Features",
    navPricing: "Pricing",
    navFaq: "FAQ",
    navTerms: "Terms",
    navPrivacy: "Privacy",
    navLogin: "Sign in",
    copyright: "Users are responsible for the copyright of uploaded content.",
  },
} as const;

/** Phần 7 — dải CTA cuối trang (reveal khi cuộn tới) + footer. */
export function SiteFooter({ lang = "vi" }: { lang?: Lang }) {
  const t = T[lang];
  // link neo về đúng bản ngôn ngữ của trang chủ (/ hoặc /en)
  const home = lang === "en" ? "/en" : "/";
  return (
    <footer className="border-t border-white/5">
      {/* CTA band */}
      <div className="px-4 py-16">
        <Reveal className="mx-auto max-w-4xl rounded-3xl bg-gradient-to-r from-primary-600 to-accent-600 px-6 py-10 text-center sm:px-12">
          <h2 className="text-2xl font-bold text-white sm:text-3xl">
            {t.ctaH2}
          </h2>
          <p className="mt-2 text-sm text-primary-100">
            {t.ctaP}
          </p>
          <Link
            href="/videos/upload"
            className="mt-6 inline-flex items-center gap-2 rounded-xl bg-white px-7 py-3 text-sm font-semibold text-primary-700 transition-all duration-200 hover:scale-[1.04] hover:shadow-lg hover:shadow-black/20 active:scale-95"
          >
            {t.ctaBtn} <ArrowRight className="h-4 w-4" />
          </Link>
        </Reveal>
      </div>

      <div className="mx-auto flex max-w-6xl flex-col items-center gap-4 border-t border-white/5 px-4 py-8 sm:flex-row sm:justify-between">
        <p className="flex items-center gap-2 text-sm font-semibold text-white">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-primary-500 to-accent-600">
            <Clapperboard className="h-3.5 w-3.5 text-white" />
          </span>
          {t.brand}
        </p>
        <nav className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs text-neutral-400">
          <Link href={`${home}#tinh-nang`} className="hover:text-white">{t.navFeatures}</Link>
          <Link href={`${home}#bang-gia`} className="hover:text-white">{t.navPricing}</Link>
          <Link href={`${home}#faq`} className="hover:text-white">{t.navFaq}</Link>
          <Link href="/dieu-khoan" className="hover:text-white">{t.navTerms}</Link>
          <Link href="/bao-mat" className="hover:text-white">{t.navPrivacy}</Link>
          <Link href="/login" className="hover:text-white">{t.navLogin}</Link>
        </nav>
        <p className="text-xs text-neutral-500">
          © {new Date().getFullYear()} {t.brand}. {t.copyright}
        </p>
      </div>
    </footer>
  );
}
