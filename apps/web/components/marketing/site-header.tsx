"use client";

import { useState } from "react";
import Link from "next/link";
import { Menu, X } from "lucide-react";
import { BrandLogo } from "@/components/brand-logo";
import { LangSwitcher } from "@/components/lang-switcher";
import type { Lang } from "@/lib/i18n";
import { cn } from "@/lib/utils";

const NAV_T = {
  vi: [
    { href: "#nguon-video", label: "Nguồn video" },
    { href: "#tinh-nang", label: "Tính năng" },
    { href: "#cach-hoat-dong", label: "Cách hoạt động" },
    { href: "#bang-gia", label: "Bảng giá" },
    { href: "#faq", label: "Hỏi đáp" },
  ],
  en: [
    { href: "#nguon-video", label: "Video sources" },
    { href: "#tinh-nang", label: "Features" },
    { href: "#cach-hoat-dong", label: "How it works" },
    { href: "#bang-gia", label: "Pricing" },
    { href: "#faq", label: "FAQ" },
  ],
} as const;

const BTN_T = {
  vi: { login: "Đăng nhập", cta: "Dùng thử miễn phí" },
  en: { login: "Sign in", cta: "Try for free" },
} as const;

/** Phần 1 — thanh điều hướng sticky; menu mobile trượt mở/đóng mượt (CSS grid-rows). */
export function SiteHeader({ lang = "vi" }: { lang?: Lang }) {
  const [open, setOpen] = useState(false);
  const NAV = NAV_T[lang];
  const btn = BTN_T[lang];

  return (
    <header className="sticky top-0 z-40 border-b border-white/5 bg-cinema/80 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
        <BrandLogo textClassName="text-white" />

        <nav className="hidden items-center gap-6 md:flex">
          {NAV.map((n) => (
            <a
              key={n.href}
              href={n.href}
              className="group relative text-sm text-neutral-300 transition-colors hover:text-white"
            >
              {n.label}
              {/* gạch chân trượt ra khi rê chuột — scaleX để không đụng layout */}
              <span className="absolute -bottom-1 left-0 h-px w-full origin-left scale-x-0 bg-primary-400 transition-transform duration-300 group-hover:scale-x-100" />
            </a>
          ))}
        </nav>

        <div className="hidden items-center gap-3 md:flex">
          <LangSwitcher lang={lang} dark routes={{ vi: "/", en: "/en" }} />
          <Link
            href="/login"
            className="rounded-lg px-4 py-2 text-sm font-medium text-neutral-300 transition-colors hover:text-white"
          >
            {btn.login}
          </Link>
          <Link
            href="/videos/upload"
            className="rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white transition-all duration-200 hover:scale-[1.03] hover:bg-primary-500 active:scale-95"
          >
            {btn.cta}
          </Link>
        </div>

        <span className="flex items-center gap-2 md:hidden">
          <LangSwitcher lang={lang} dark routes={{ vi: "/", en: "/en" }} />
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-label="Menu"
            className="rounded-lg p-2 text-neutral-300 transition-transform hover:bg-white/5 active:scale-90"
          >
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </span>
      </div>

      {/* menu mobile: trượt mở/đóng bằng grid-template-rows (composited, không cần JS đo chiều cao) */}
      <div
        className={cn(
          "grid transition-[grid-template-rows,opacity] duration-300 ease-out md:hidden",
          open ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0",
        )}
      >
        <nav className="overflow-hidden border-t border-white/5 bg-cinema">
          <div className="px-4 pb-4">
            {NAV.map((n) => (
              <a
                key={n.href}
                href={n.href}
                onClick={() => setOpen(false)}
                className="block border-b border-white/5 py-3 text-sm text-neutral-300"
              >
                {n.label}
              </a>
            ))}
            <div className="mt-3 flex gap-2">
              <Link
                href="/login"
                className="flex-1 rounded-lg border border-white/10 px-4 py-2.5 text-center text-sm font-medium text-neutral-200 transition-colors active:bg-white/5"
              >
                {btn.login}
              </Link>
              <Link
                href="/videos/upload"
                className="flex-1 rounded-lg bg-primary-600 px-4 py-2.5 text-center text-sm font-semibold text-white transition-transform active:scale-95"
              >
                {btn.cta}
              </Link>
            </div>
          </div>
        </nav>
      </div>
    </header>
  );
}
