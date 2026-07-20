"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";

/**
 * Vùng kéo-thả chọn file dùng chung (trước đây lặp nguyên khối ở trang
 * Trích xuất & Dịch phụ đề). Truyền nội dung (icon + chữ) qua children;
 * chỉnh cỡ/khoảng cách bằng className (cn dùng tailwind-merge nên ghi đè an toàn).
 */
export function Dropzone({
  onFiles,
  accept,
  multiple = false,
  disabled = false,
  className,
  children,
}: {
  /** Gọi khi người dùng thả file HOẶC chọn qua hộp thoại. */
  onFiles: (files: FileList | null) => void;
  accept?: string;
  multiple?: boolean;
  disabled?: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  const [dragOver, setDragOver] = useState(false);

  return (
    <label
      onDragOver={(e) => {
        e.preventDefault();
        if (!disabled) setDragOver(true);
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragOver(false);
        if (!disabled) onFiles(e.dataTransfer.files);
      }}
      className={cn(
        "flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed py-12 transition-colors",
        dragOver
          ? "border-primary-500 bg-primary-50 dark:bg-primary-950/30"
          : "border-neutral-300 hover:border-neutral-400 dark:border-neutral-700 dark:hover:border-neutral-600",
        disabled && "cursor-not-allowed opacity-60",
        className,
      )}
    >
      {children}
      <input
        type="file"
        accept={accept}
        multiple={multiple}
        disabled={disabled}
        className="hidden"
        onChange={(e) => {
          onFiles(e.target.files);
          e.target.value = "";
        }}
      />
    </label>
  );
}
