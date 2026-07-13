"use client";

import {
  createContext,
  useCallback,
  useContext,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { CheckCircle2, Info, X, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";

type ToastVariant = "success" | "error" | "info";

interface Toast {
  id: number;
  message: string;
  variant: ToastVariant;
}

interface ToastApi {
  toast: (message: string, variant?: ToastVariant) => void;
}

const ToastContext = createContext<ToastApi>({ toast: () => {} });

/** Bắn thông báo nổi: toast("Đã lưu"), toast("Lỗi...", "error"). */
export function useToast() {
  return useContext(ToastContext);
}

const VARIANT_STYLES: Record<ToastVariant, { icon: typeof Info; bar: string }> = {
  success: { icon: CheckCircle2, bar: "bg-success-500" },
  error: { icon: XCircle, bar: "bg-red-500" },
  info: { icon: Info, bar: "bg-primary-500" },
};

const TOAST_TTL_MS = 3500;

/** Provider + khay thông báo góc dưới phải — gắn một lần ở root layout. */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const nextId = useRef(1);

  const dismiss = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const toast = useCallback(
    (message: string, variant: ToastVariant = "success") => {
      const id = nextId.current++;
      setToasts((prev) => [...prev.slice(-3), { id, message, variant }]);
      setTimeout(() => dismiss(id), TOAST_TTL_MS);
    },
    [dismiss],
  );

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      {/* aria-live để trình đọc màn hình đọc thông báo */}
      <div
        aria-live="polite"
        className="pointer-events-none fixed bottom-4 right-4 z-[100] flex w-80 max-w-[calc(100vw-2rem)] flex-col gap-2"
      >
        {toasts.map((t) => {
          const Icon = VARIANT_STYLES[t.variant].icon;
          return (
            <div
              key={t.id}
              className="animate-fade-up pointer-events-auto relative flex items-start gap-2.5 overflow-hidden rounded-lg border border-neutral-200 bg-white py-2.5 pl-3 pr-2 shadow-lg dark:border-neutral-700 dark:bg-neutral-900"
              style={{ animationDuration: "0.25s" }}
            >
              <span
                className={cn(
                  "absolute inset-y-0 left-0 w-1",
                  VARIANT_STYLES[t.variant].bar,
                )}
              />
              <Icon
                className={cn(
                  "mt-0.5 h-4 w-4 shrink-0",
                  t.variant === "success" && "text-success-500",
                  t.variant === "error" && "text-red-500",
                  t.variant === "info" && "text-primary-500",
                )}
              />
              <p className="min-w-0 flex-1 text-sm leading-snug">{t.message}</p>
              <button
                type="button"
                onClick={() => dismiss(t.id)}
                aria-label="Đóng thông báo"
                className="shrink-0 rounded p-1 text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}
