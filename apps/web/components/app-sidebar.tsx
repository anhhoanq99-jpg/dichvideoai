"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Clapperboard, CreditCard, History, Home, Video } from "lucide-react";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Trang chủ", icon: Home },
  { href: "/videos", label: "Video của tôi", icon: Video },
  { href: "/history", label: "Lịch sử", icon: History },
  { href: "/credits", label: "Nạp credits", icon: CreditCard },
] as const;

export function AppSidebar() {
  const pathname = usePathname();

  return (
    <aside className="flex h-full w-60 flex-col border-r border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-950">
      <div className="flex h-14 items-center gap-2 border-b border-neutral-200 px-4 dark:border-neutral-800">
        <Clapperboard className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
        <span className="font-semibold tracking-tight">Dịch Video AI</span>
      </div>
      <nav className="flex-1 space-y-1 p-3">
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
          const active = pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                active
                  ? "bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300"
                  : "text-neutral-600 hover:bg-neutral-100 dark:text-neutral-400 dark:hover:bg-neutral-800/60",
              )}
            >
              <Icon className="h-4 w-4" />
              {label}
            </Link>
          );
        })}
      </nav>
      <p className="border-t border-neutral-200 p-3 text-xs text-neutral-400 dark:border-neutral-800 dark:text-neutral-600">
        Bản dựng Phase 1 — nội bộ
      </p>
    </aside>
  );
}
