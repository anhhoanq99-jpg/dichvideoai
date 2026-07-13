"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { X } from "lucide-react";
import type { Lang } from "@/lib/i18n";
import { cn } from "@/lib/utils";

const T = {
  vi: { close: "Đóng hộp thoại" },
  en: { close: "Close dialog" },
} as const;

interface ModalProps {
  title: ReactNode;
  onClose: () => void;
  children: ReactNode;
  /** max-w-lg mặc định; wide → max-w-2xl (form nhiều cột) */
  wide?: boolean;
  lang?: Lang;
}

/**
 * Hộp thoại nổi giữa màn hình — dùng cho các nút thiết lập trên toolbar studio.
 * Bàn phím: ESC để đóng, tự focus vào hộp khi mở, Tab quay vòng bên trong.
 */
export function Modal({ title, onClose, children, wide = false, lang = "vi" }: ModalProps) {
  const t = T[lang];
  const panelRef = useRef<HTMLDivElement>(null);

  // chỉ chạy đúng 1 lần khi mở — nếu phụ thuộc onClose (hàm mới mỗi render)
  // thì mỗi lần gõ phím effect chạy lại và cướp focus khỏi ô input bên trong
  useEffect(() => {
    // focus vào hộp để ESC/Tab hoạt động ngay, trả focus khi đóng
    const previouslyFocused = document.activeElement as HTMLElement | null;
    panelRef.current?.focus();
    return () => {
      previouslyFocused?.focus?.();
    };
  }, []);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-[2px]"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        tabIndex={-1}
        className={cn(
          "animate-fade-up max-h-[90dvh] w-full overflow-y-auto rounded-xl border border-neutral-200 bg-white p-5 shadow-xl outline-none dark:border-neutral-800 dark:bg-neutral-900",
          wide ? "max-w-2xl" : "max-w-lg",
        )}
        style={{ animationDuration: "0.2s" }}
      >
        <div className="flex items-center justify-between">
          <h3 className="flex items-center gap-2 text-sm font-semibold">{title}</h3>
          <button
            type="button"
            onClick={onClose}
            aria-label={t.close}
            className="rounded p-1 text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="mt-4">{children}</div>
      </div>
    </div>
  );
}
