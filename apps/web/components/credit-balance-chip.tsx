"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { Lang } from "@/lib/i18n";

/** Đồng xu vàng — vẽ SVG cho sắc nét, có chữ Đ ở giữa kiểu tiền Việt. */
function CoinIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 20 20" className={className} aria-hidden focusable="false">
      <defs>
        <linearGradient id="coin-g" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#fcd34d" />
          <stop offset="0.5" stopColor="#f59e0b" />
          <stop offset="1" stopColor="#d97706" />
        </linearGradient>
      </defs>
      <circle cx="10" cy="10" r="9" fill="url(#coin-g)" />
      <circle cx="10" cy="10" r="6.5" fill="none" stroke="#fff7ed" strokeWidth="1.1" opacity="0.85" />
      <text
        x="10"
        y="13.6"
        textAnchor="middle"
        fontSize="9.5"
        fontWeight="800"
        fill="#fff7ed"
        fontFamily="system-ui, sans-serif"
      >
        Đ
      </text>
    </svg>
  );
}

/**
 * Chip số dư xu — hiện ở header mọi trang trong app, bấm vào là sang trang Nạp xu.
 * Tự cập nhật khi chuyển trang / quay lại tab (sau khi xuất file bị trừ xu là thấy ngay).
 */
export function CreditBalanceChip({ lang = "vi" }: { lang?: Lang }) {
  const [balance, setBalance] = useState<number | null>(null);
  const pathname = usePathname();

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const res = await fetch("/api/credits/balance");
        if (!res.ok) return;
        const data = await res.json();
        if (!cancelled) setBalance(data.balance ?? 0);
      } catch {
        /* mất mạng thoáng qua — giữ số cũ */
      }
    }
    load();
    // quay lại tab (vd sau khi chuyển khoản nạp xu) → cập nhật luôn
    const onFocus = () => load();
    window.addEventListener("focus", onFocus);
    return () => {
      cancelled = true;
      window.removeEventListener("focus", onFocus);
    };
  }, [pathname]);

  return (
    <Link
      href="/credits"
      title={lang === "vi" ? "Số dư xu — bấm để nạp thêm" : "Coin balance — click to top up"}
      className="flex items-center gap-1.5 rounded-full border border-amber-200 bg-gradient-to-r from-amber-50 to-yellow-50 py-1 pl-1.5 pr-3 text-sm font-bold text-amber-700 transition-colors hover:border-amber-300 hover:from-amber-100 hover:to-yellow-100 dark:border-amber-500/30 dark:from-amber-950/40 dark:to-yellow-950/30 dark:text-amber-300 dark:hover:border-amber-500/50"
    >
      <CoinIcon className="h-5 w-5 drop-shadow-sm" />
      {balance === null ? (
        <span className="inline-block h-3.5 w-10 animate-pulse rounded bg-amber-200/60 dark:bg-amber-800/40" />
      ) : (
        <span>{balance.toLocaleString("vi-VN")}</span>
      )}
    </Link>
  );
}
