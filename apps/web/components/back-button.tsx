"use client";

import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";

/** Nút quay lại trang trước — đặt ở header, trang nào cũng dùng được. */
export function BackButton({ label = "Quay lại" }: { label?: string }) {
  const router = useRouter();
  return (
    <button
      type="button"
      onClick={() => router.back()}
      aria-label={label}
      title={label}
      className="flex h-9 w-9 items-center justify-center rounded-md border border-neutral-200 text-neutral-600 hover:bg-neutral-100 dark:border-neutral-800 dark:text-neutral-300 dark:hover:bg-neutral-800"
    >
      <ArrowLeft className="h-4 w-4" />
    </button>
  );
}
