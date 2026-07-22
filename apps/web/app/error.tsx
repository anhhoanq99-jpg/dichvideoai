"use client";

import { useEffect } from "react";
import { AlertTriangle, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * Màn lỗi chung. Trước đây không có file này nên mọi lỗi server đều rơi về màn
 * "Application error" trắng trơn của Next.js — trên sản phẩm đang thu tiền thì
 * khách chỉ thấy web hỏng, không biết làm gì tiếp.
 *
 * Chuỗi để tiếng Việt cứng: đây là biên lỗi, không đọc được cookie ngôn ngữ.
 */
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="flex min-h-[60vh] flex-col items-center justify-center px-4 text-center">
      <AlertTriangle className="h-12 w-12 text-primary-600" />
      <h1 className="mt-4 text-xl font-bold">Có lỗi xảy ra</h1>
      <p className="mt-2 max-w-md text-sm text-neutral-600 dark:text-neutral-400">
        Xin lỗi, hệ thống gặp trục trặc khi tải trang này. Xu của bạn không bị
        trừ cho lỗi này.
      </p>
      {error.digest && (
        <p className="mt-2 text-xs text-neutral-400">Mã lỗi: {error.digest}</p>
      )}
      <div className="mt-6 flex gap-3">
        <Button pill onClick={reset}>
          <RotateCcw className="h-4 w-4" />
          Thử lại
        </Button>
        <Button pill variant="secondary" onClick={() => (window.location.href = "/")}>
          Về trang chủ
        </Button>
      </div>
    </main>
  );
}
