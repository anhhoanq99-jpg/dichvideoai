"use client";

import Link from "next/link";
import { ArrowRight, Clapperboard } from "lucide-react";
import { Reveal } from "./motion";

/** Phần 7 — dải CTA cuối trang (reveal khi cuộn tới) + footer. */
export function SiteFooter() {
  return (
    <footer className="border-t border-white/5">
      {/* CTA band */}
      <div className="px-4 py-16">
        <Reveal className="mx-auto max-w-4xl rounded-3xl bg-gradient-to-r from-indigo-600 to-violet-600 px-6 py-10 text-center sm:px-12">
          <h2 className="text-2xl font-bold text-white sm:text-3xl">
            Sẵn sàng Việt hóa video đầu tiên?
          </h2>
          <p className="mt-2 text-sm text-indigo-100">
            Đăng nhập bằng Google, nhận 10.000 credits dùng thử — không cần thẻ.
          </p>
          <Link
            href="/dashboard"
            className="mt-6 inline-flex items-center gap-2 rounded-xl bg-white px-7 py-3 text-sm font-semibold text-indigo-700 transition-all duration-200 hover:scale-[1.04] hover:shadow-lg hover:shadow-black/20 active:scale-95"
          >
            Bắt đầu ngay <ArrowRight className="h-4 w-4" />
          </Link>
        </Reveal>
      </div>

      <div className="mx-auto flex max-w-6xl flex-col items-center gap-4 border-t border-white/5 px-4 py-8 sm:flex-row sm:justify-between">
        <p className="flex items-center gap-2 text-sm font-semibold text-white">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600">
            <Clapperboard className="h-3.5 w-3.5 text-white" />
          </span>
          Dịch Video AI
        </p>
        <nav className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs text-neutral-400">
          <a href="#tinh-nang" className="hover:text-white">Tính năng</a>
          <a href="#bang-gia" className="hover:text-white">Bảng giá</a>
          <a href="#faq" className="hover:text-white">Hỏi đáp</a>
          <Link href="/login" className="hover:text-white">Đăng nhập</Link>
        </nav>
        <p className="text-xs text-neutral-500">
          © {new Date().getFullYear()} Dịch Video AI. Người dùng chịu trách nhiệm bản
          quyền nội dung tải lên.
        </p>
      </div>
    </footer>
  );
}
