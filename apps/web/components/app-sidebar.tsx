"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  AudioLines,
  CreditCard,
  FileVideo,
  History,
  Menu,
  MessagesSquare,
  Mic,
  Receipt,
  Video,
  X,
} from "lucide-react";
import { BrandLogo } from "@/components/brand-logo";
import type { Lang } from "@/lib/i18n";
import { cn } from "@/lib/utils";

/* Nav nhóm theo mục kiểu veed.io: "Công cụ" (làm việc) và "Quản lý" (dữ liệu) */
const NAV_GROUPS = [
  {
    vi: "Công cụ",
    en: "Tools",
    items: [
      {
        href: "/videos/upload",
        vi: "Dịch & lồng tiếng video",
        en: "Translate & dub video",
        icon: Mic,
      },
      {
        href: "/voice-clone",
        vi: "Nhân bản giọng nói",
        en: "Voice cloning",
        icon: AudioLines,
      },
    ],
  },
  {
    vi: "Quản lý",
    en: "Manage",
    items: [
      { href: "/videos", vi: "Video của tôi", en: "My videos", icon: Video },
      { href: "/exports", vi: "Video đã xuất", en: "Exported videos", icon: FileVideo },
      { href: "/history", vi: "Lịch sử xử lý", en: "History", icon: History },
      { href: "/transactions", vi: "Lịch sử giao dịch", en: "Transactions", icon: Receipt },
      { href: "/credits", vi: "Nạp tiền", en: "Top up", icon: CreditCard },
    ],
  },
  {
    vi: "Cộng đồng",
    en: "Community",
    items: [
      {
        href: "/chat",
        vi: "Trò chuyện & hỗ trợ",
        en: "Chat & support",
        icon: MessagesSquare,
      },
    ],
  },
] as const;

function NavLinks({ lang, onNavigate }: { lang: Lang; onNavigate?: () => void }) {
  const pathname = usePathname();
  return (
    <nav className="flex-1 space-y-5 overflow-y-auto p-3">
      {NAV_GROUPS.map((group) => (
        <div key={group.en}>
          <p className="px-3 pb-1.5 text-[11px] font-semibold uppercase tracking-wider text-neutral-400 dark:text-neutral-500">
            {group[lang]}
          </p>
          <div className="space-y-1">
            {group.items.map(({ href, icon: Icon, ...labels }) => {
              // "/videos" không được sáng khi đang ở "/videos/upload" (tab riêng)
              const active =
                href === "/videos"
                  ? pathname === "/videos" ||
                    (pathname.startsWith("/videos/") &&
                      !pathname.startsWith("/videos/upload"))
                  : pathname.startsWith(href);
              return (
                <Link
                  key={href}
                  href={href}
                  onClick={onNavigate}
                  className={cn(
                    "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
                    active
                      ? "bg-primary-50 font-semibold text-primary-700 dark:bg-primary-950/60 dark:text-primary-300"
                      : "text-neutral-600 hover:bg-neutral-100 dark:text-neutral-400 dark:hover:bg-neutral-800/60",
                  )}
                >
                  <Icon
                    className={cn(
                      "h-4 w-4",
                      active ? "text-primary-600 dark:text-primary-400" : "text-neutral-400",
                    )}
                  />
                  {labels[lang]}
                </Link>
              );
            })}
          </div>
        </div>
      ))}
    </nav>
  );
}

/** Sidebar desktop — ẩn trên mobile (mobile dùng MobileNav dạng drawer). */
export function AppSidebar({ lang = "vi" }: { lang?: Lang }) {
  return (
    <aside className="hidden h-full w-60 flex-col border-r border-neutral-200 bg-white lg:flex dark:border-neutral-800 dark:bg-neutral-950">
      <div className="flex h-14 items-center px-4">
        <BrandLogo />
      </div>
      <NavLinks lang={lang} />
      <p className="border-t border-neutral-100 p-3 text-xs text-neutral-400 dark:border-neutral-800 dark:text-neutral-600">
        {lang === "vi" ? "Bản dựng Phase 1 — nội bộ" : "Phase 1 build — internal"}
      </p>
    </aside>
  );
}

/** Nút menu + drawer trượt cho điện thoại/tablet — nội dung chiếm full màn. */
export function MobileNav({ lang = "vi" }: { lang?: Lang }) {
  // bấm link nào cũng đóng drawer (onNavigate) — không cần theo dõi pathname
  const [open, setOpen] = useState(false);

  return (
    <div className="lg:hidden">
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={lang === "vi" ? "Mở menu" : "Open menu"}
        className="flex h-9 w-9 items-center justify-center rounded-lg border border-neutral-200 text-neutral-600 hover:bg-neutral-100 dark:border-neutral-800 dark:text-neutral-300 dark:hover:bg-neutral-800"
      >
        <Menu className="h-4 w-4" />
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 bg-black/50 backdrop-blur-[2px]"
          onClick={(e) => {
            if (e.target === e.currentTarget) setOpen(false);
          }}
        >
          <aside className="flex h-full w-72 max-w-[85vw] flex-col rounded-r-2xl bg-white shadow-xl dark:bg-neutral-950">
            <div className="flex h-14 items-center justify-between px-4">
              <BrandLogo />
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label={lang === "vi" ? "Đóng menu" : "Close menu"}
                className="rounded-lg p-1.5 text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <NavLinks lang={lang} onNavigate={() => setOpen(false)} />
          </aside>
        </div>
      )}
    </div>
  );
}
