"use client";

import { useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";

export interface AdminTab {
  id: string;
  label: string;
  /** Nhãn phụ bên phải (vd số bài chờ duyệt) — bỏ trống thì không hiện. */
  badge?: string | number;
  content: ReactNode;
}

/**
 * Thanh tab cho trang Quản trị.
 *
 * Nội dung từng tab do SERVER render rồi truyền vào làm children — component
 * này chỉ đảm nhiệm việc chọn tab. Nhờ vậy mọi truy vấn DB vẫn chạy phía máy
 * chủ, không phải chuyển sang gọi API từ trình duyệt.
 *
 * Đánh đổi: cả 4 tab đều được render sẵn, chỉ ẩn/hiện. Với trang quản trị chỉ
 * mình admin vào thì đây là lựa chọn đúng — đổi tab tức thì, không chờ tải lại.
 */
export function AdminTabs({ tabs }: { tabs: AdminTab[] }) {
  const [active, setActive] = useState(tabs[0]?.id);

  return (
    <div>
      {/* cuộn ngang trên điện thoại thay vì xuống dòng lộn xộn */}
      <div
        role="tablist"
        className="-mx-1 flex gap-1 overflow-x-auto border-b border-neutral-200 px-1 dark:border-neutral-800"
      >
        {tabs.map((tab) => {
          const on = tab.id === active;
          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={on}
              aria-controls={`panel-${tab.id}`}
              onClick={() => setActive(tab.id)}
              className={cn(
                "relative shrink-0 whitespace-nowrap px-3 py-2.5 text-sm font-medium transition-colors",
                on
                  ? "text-primary-700 dark:text-primary-300"
                  : "text-neutral-500 hover:text-neutral-800 dark:text-neutral-400 dark:hover:text-neutral-100",
              )}
            >
              {tab.label}
              {tab.badge !== undefined && tab.badge !== 0 && (
                <span className="ml-1.5 rounded-full bg-neutral-200 px-1.5 py-0.5 text-xs font-semibold text-neutral-600 dark:bg-neutral-700 dark:text-neutral-200">
                  {tab.badge}
                </span>
              )}
              {on && (
                <span className="absolute inset-x-2 -bottom-px h-0.5 rounded-full bg-primary-600 dark:bg-primary-400" />
              )}
            </button>
          );
        })}
      </div>

      {tabs.map((tab) => (
        <div
          key={tab.id}
          id={`panel-${tab.id}`}
          role="tabpanel"
          // `hidden` thay vì bỏ khỏi cây: giữ nguyên trạng thái bên trong
          // (vd ô đang gõ ở phần kiểm duyệt) khi qua lại giữa các tab
          hidden={tab.id !== active}
          className="pt-5"
        >
          {tab.content}
        </div>
      ))}
    </div>
  );
}
