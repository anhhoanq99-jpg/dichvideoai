"use client";

import { useState } from "react";
import Link from "next/link";
import { Clapperboard, Menu, X } from "lucide-react";

const NAV = [
  { href: "#tinh-nang", label: "Tính năng" },
  { href: "#cach-hoat-dong", label: "Cách hoạt động" },
  { href: "#bang-gia", label: "Bảng giá" },
  { href: "#faq", label: "Hỏi đáp" },
];

/** Phần 1 — thanh điều hướng sticky, menu gập trên mobile. */
export function SiteHeader() {
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 border-b border-white/5 bg-[#0b0d14]/80 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
        <Link href="/" className="flex items-center gap-2 font-semibold text-white">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600">
            <Clapperboard className="h-4 w-4 text-white" />
          </span>
          Dịch Video AI
        </Link>

        <nav className="hidden items-center gap-6 md:flex">
          {NAV.map((n) => (
            <a
              key={n.href}
              href={n.href}
              className="text-sm text-neutral-300 transition-colors hover:text-white"
            >
              {n.label}
            </a>
          ))}
        </nav>

        <div className="hidden items-center gap-2 md:flex">
          <Link
            href="/login"
            className="rounded-lg px-4 py-2 text-sm font-medium text-neutral-300 hover:text-white"
          >
            Đăng nhập
          </Link>
          <Link
            href="/dashboard"
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-indigo-500"
          >
            Dùng thử miễn phí
          </Link>
        </div>

        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-label="Menu"
          className="rounded-lg p-2 text-neutral-300 hover:bg-white/5 md:hidden"
        >
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {open && (
        <nav className="border-t border-white/5 bg-[#0b0d14] px-4 pb-4 md:hidden">
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
              className="flex-1 rounded-lg border border-white/10 px-4 py-2.5 text-center text-sm font-medium text-neutral-200"
            >
              Đăng nhập
            </Link>
            <Link
              href="/dashboard"
              className="flex-1 rounded-lg bg-indigo-600 px-4 py-2.5 text-center text-sm font-semibold text-white"
            >
              Dùng thử miễn phí
            </Link>
          </div>
        </nav>
      )}
    </header>
  );
}
