import { cn } from "@/lib/utils";

const LABELS: Record<string, { text: string; cls: string }> = {
  uploading: {
    text: "Đang tải lên",
    cls: "bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300",
  },
  uploaded: {
    text: "Sẵn sàng",
    cls: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300",
  },
  processing: {
    text: "Đang xử lý",
    cls: "bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300",
  },
  ready: {
    text: "Có phụ đề",
    cls: "bg-indigo-50 text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-300",
  },
  failed: {
    text: "Lỗi",
    cls: "bg-red-50 text-red-700 dark:bg-red-950/50 dark:text-red-300",
  },
};

export function VideoStatusBadge({ status }: { status: string }) {
  const info = LABELS[status] ?? { text: status, cls: "bg-neutral-100 text-neutral-600" };
  return (
    <span
      className={cn(
        "shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium",
        info.cls,
      )}
    >
      {info.text}
    </span>
  );
}
