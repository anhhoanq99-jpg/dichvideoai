"use client";

import { useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { Clapperboard, Menu, X } from "lucide-react";

const NAV = [
  { href: "#tinh-nang", label: "Tính năng" },
  { href: "#cach-hoat-dong", label: "Cách hoạt động" },
  { href: "#bang-gia", label: "Bảng giá" },
  { href: "#faq", label: "Hỏi đáp" },
];

/** Phần 1 — thanh điều hướng sticky; menu mobile trượt mở/đóng mượt. */
export function SiteHeader() {
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 border-b border-white/5 bg-[#0b0d14]/80 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
        <Link
          href="/"
          className="flex items-center gap-2 font-semibold text-white transition-opacity hover:opacity-80"
        >
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
              className="group relative text-sm text-neutral-300 transition-colors hover:text-white"
            >
              {n.label}
              {/* gạch chân trượt ra khi rê chuột */}
              <span className="absolute -bottom-1 left-0 h-px w-0 bg-indigo-400 transition-all duration-300 group-hover:w-full" />
            </a>
          ))}
        </nav>

        <div className="hidden items-center gap-2 md:flex">
          <Link
            href="/login"
            className="rounded-lg px-4 py-2 text-sm font-medium text-neutral-300 transition-colors hover:text-white"
          >
            Đăng nhập
          </Link>
          <Link
            href="/dashboard"
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition-all duration-200 hover:scale-[1.03] hover:bg-indigo-500 active:scale-95"
          >
            Dùng thử miễn phí
          </Link>
        </div>

        <motion.button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-label="Menu"
          whileTap={{ scale: 0.85 }}
          className="rounded-lg p-2 text-neutral-300 hover:bg-white/5 md:hidden"
        >
          <motion.span
            key={open ? "x" : "menu"}
            initial={{ rotate: -90, opacity: 0 }}
            animate={{ rotate: 0, opacity: 1 }}
            transition={{ duration: 0.2 }}
            className="block"
          >
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </motion.span>
        </motion.button>
      </div>

      <AnimatePresence initial={false}>
        {open && (
          <motion.nav
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.28, ease: "easeOut" }}
            className="overflow-hidden border-t border-white/5 bg-[#0b0d14] md:hidden"
          >
            <div className="px-4 pb-4">
              {NAV.map((n, i) => (
                <motion.a
                  key={n.href}
                  href={n.href}
                  onClick={() => setOpen(false)}
                  initial={{ opacity: 0, x: -12 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.05 * i, duration: 0.25 }}
                  className="block border-b border-white/5 py-3 text-sm text-neutral-300"
                >
                  {n.label}
                </motion.a>
              ))}
              <div className="mt-3 flex gap-2">
                <Link
                  href="/login"
                  className="flex-1 rounded-lg border border-white/10 px-4 py-2.5 text-center text-sm font-medium text-neutral-200 transition-colors active:bg-white/5"
                >
                  Đăng nhập
                </Link>
                <Link
                  href="/dashboard"
                  className="flex-1 rounded-lg bg-indigo-600 px-4 py-2.5 text-center text-sm font-semibold text-white transition-transform active:scale-95"
                >
                  Dùng thử miễn phí
                </Link>
              </div>
            </div>
          </motion.nav>
        )}
      </AnimatePresence>
    </header>
  );
}
