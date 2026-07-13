import type { Lang } from "@/lib/i18n";
import { cn } from "@/lib/utils";

const LABELS: Record<Lang, Record<string, { text: string; cls: string }>> = {
  vi: {
    uploading: {
      text: "Đang tải lên",
      cls: "bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300",
    },
    uploaded: {
      text: "Sẵn sàng",
      cls: "bg-success-50 text-success-700 dark:bg-success-950/50 dark:text-success-300",
    },
    processing: {
      text: "Đang xử lý",
      cls: "bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300",
    },
    ready: {
      text: "Có phụ đề",
      cls: "bg-primary-50 text-primary-700 dark:bg-primary-950/50 dark:text-primary-300",
    },
    failed: {
      text: "Lỗi",
      cls: "bg-red-50 text-red-700 dark:bg-red-950/50 dark:text-red-300",
    },
  },
  en: {
    uploading: {
      text: "Uploading",
      cls: "bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300",
    },
    uploaded: {
      text: "Ready",
      cls: "bg-success-50 text-success-700 dark:bg-success-950/50 dark:text-success-300",
    },
    processing: {
      text: "Processing",
      cls: "bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300",
    },
    ready: {
      text: "Subtitled",
      cls: "bg-primary-50 text-primary-700 dark:bg-primary-950/50 dark:text-primary-300",
    },
    failed: {
      text: "Failed",
      cls: "bg-red-50 text-red-700 dark:bg-red-950/50 dark:text-red-300",
    },
  },
};

export function VideoStatusBadge({
  status,
  lang = "vi",
}: {
  status: string;
  lang?: Lang;
}) {
  const info = LABELS[lang][status] ?? { text: status, cls: "bg-neutral-100 text-neutral-600" };
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
