"use client";

import {
  createContext,
  useContext,
  useEffect,
  useLayoutEffect,
  useRef,
  type ReactNode,
} from "react";
import { X } from "lucide-react";
import type { Lang } from "@/lib/i18n";
import { cn } from "@/lib/utils";

const T = {
  vi: { close: "Đóng hộp thoại" },
  en: { close: "Close dialog" },
} as const;

/**
 * Vị trí nút vừa bấm để bảng `dock` neo NGAY DƯỚI nút đó (thay vì mép phải).
 * Toolbar studio đặt rect vào đây; Modal đọc ra để tính toạ độ. Null → không neo
 * theo nút (mobile, hoặc mở không qua nút) → giữ cách hiển thị cũ.
 */
export const ModalAnchorContext = createContext<DOMRect | null>(null);

/** Breakpoint lg của Tailwind — dưới mức này màn hẹp nên vẫn nổi giữa như cũ. */
const LG = 1024;

interface ModalProps {
  title: ReactNode;
  onClose: () => void;
  children: ReactNode;
  /** max-w-lg mặc định; wide → max-w-2xl (form nhiều cột) */
  wide?: boolean;
  /**
   * Neo bảng công cụ NGAY DƯỚI nút vừa bấm thay vì nổi che giữa màn hình (chỉ từ
   * lg trở lên). Dùng cho các bảng của studio: đang chỉnh làm mờ / phụ đề / lồng
   * tiếng thì phải NHÌN THẤY video mới biết mình chỉnh cái gì — hộp thoại nổi
   * giữa kèm nền mờ che mất đúng thứ cần xem.
   * Dưới lg vẫn nổi giữa vì màn hẹp không đủ chỗ neo.
   */
  dock?: boolean;
  lang?: Lang;
}

/**
 * Hộp thoại của studio. Bàn phím: ESC để đóng, tự focus vào hộp khi mở.
 */
export function Modal({
  title,
  onClose,
  children,
  wide = false,
  dock = false,
  lang = "vi",
}: ModalProps) {
  const t = T[lang];
  const panelRef = useRef<HTMLDivElement>(null);
  const anchor = useContext(ModalAnchorContext);

  // chỉ chạy đúng 1 lần khi mở — nếu phụ thuộc onClose (hàm mới mỗi render)
  // thì mỗi lần gõ phím effect chạy lại và cướp focus khỏi ô input bên trong
  useEffect(() => {
    // focus vào hộp để ESC/Tab hoạt động ngay, trả focus khi đóng.
    // preventScroll: KHÔNG để trình duyệt cuộn trang tới hộp → hết "giật 1 cái".
    const previouslyFocused = document.activeElement as HTMLElement | null;
    panelRef.current?.focus({ preventScroll: true });
    return () => {
      previouslyFocused?.focus?.({ preventScroll: true });
    };
  }, []);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  // Neo hộp NGAY DƯỚI nút (chỉ lg+). Đặt vị trí TRỰC TIẾP lên DOM trong
  // useLayoutEffect (TRƯỚC khi vẽ) thay vì qua state: tránh loé giữa màn rồi mới
  // nhảy về nút, và không vi phạm lint "cấm setState đồng bộ trong effect".
  useLayoutEffect(() => {
    function place() {
      const panel = panelRef.current;
      if (!panel) return;
      const desktop = window.innerWidth >= LG;
      if (!dock || !anchor || !desktop) {
        // trả về bố cục mặc định (căn giữa của cha)
        panel.style.position = "";
        panel.style.top = "";
        panel.style.left = "";
        return;
      }
      const w = panel.offsetWidth || 384;
      const h = panel.offsetHeight || 0;
      const margin = 8;
      const gap = 6;
      // căn mép trái theo nút, nhưng không để tràn mép phải màn hình
      let left = Math.min(anchor.left, window.innerWidth - w - margin);
      left = Math.max(margin, left);
      // thả xuống dưới nút; nếu quá cao chạm đáy thì kéo lên vừa khít
      let top = anchor.bottom + gap;
      if (top + h > window.innerHeight - margin) {
        top = Math.max(margin, window.innerHeight - h - margin);
      }
      panel.style.position = "fixed";
      panel.style.top = `${top}px`;
      panel.style.left = `${left}px`;
    }
    place();
    window.addEventListener("resize", place);
    return () => window.removeEventListener("resize", place);
  }, [dock, anchor]);

  return (
    <div
      className={cn(
        "fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-[2px]",
        // neo dưới nút: bỏ nền mờ và cho click xuyên qua, để video vẫn xem/tua được
        dock && "lg:pointer-events-none lg:bg-transparent lg:p-0 lg:backdrop-blur-none",
      )}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={panelRef}
        role="dialog"
        // neo dưới nút thì không chặn thao tác bên dưới → không còn là hộp thoại
        // chiếm quyền, khai báo aria-modal sai sẽ đánh lừa trình đọc màn hình
        aria-modal={dock ? undefined : true}
        tabIndex={-1}
        className={cn(
          "max-h-[90dvh] w-full overflow-y-auto rounded-xl border border-neutral-200 bg-white p-5 shadow-xl outline-none dark:border-neutral-800 dark:bg-neutral-900",
          // bảng neo dưới nút: HIỆN TỨC THÌ, không hiệu ứng nào (mọi cú trượt/phóng
          // đều bị cảm nhận là "giật"). Hộp thoại giữa (export…) mới trượt lên nhẹ.
          !dock && "animate-fade-up",
          wide ? "max-w-2xl" : "max-w-lg",
          dock &&
            "lg:pointer-events-auto lg:max-h-[calc(100dvh-5rem)] lg:shadow-2xl lg:ring-1 lg:ring-black/5",
          // hẹp lại khi neo để chừa chỗ nhìn video, nhưng bảng `wide` phải rộng
          // hơn — form 2 cột bên trong bóp quá là vỡ
          dock && (wide ? "lg:max-w-lg" : "lg:max-w-sm"),
        )}
        // position/top/left được đặt trực tiếp trong useLayoutEffect khi neo dưới nút
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
