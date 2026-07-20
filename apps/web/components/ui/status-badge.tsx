import { cn } from "@/lib/utils";

/**
 * Nhãn trạng thái dạng viên thuốc (job/video). Bảng màu gom về một chỗ —
 * trước đây map này bị lặp ở trang Lịch sử. Nhãn chữ do nơi gọi truyền vào
 * (đã dịch i18n), component chỉ lo màu + hình dáng.
 */
const STATUS_CLS: Record<string, string> = {
  // hoàn tất / sẵn sàng
  done: "bg-success-100 text-success-700 dark:bg-success-950/50 dark:text-success-300",
  ready: "bg-success-100 text-success-700 dark:bg-success-950/50 dark:text-success-300",
  // đang chạy
  active: "bg-primary-100 text-primary-700 dark:bg-primary-950/50 dark:text-primary-300",
  processing: "bg-primary-100 text-primary-700 dark:bg-primary-950/50 dark:text-primary-300",
  // chờ / đang tải lên
  queued: "bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300",
  uploading: "bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300",
  // lỗi
  failed: "bg-red-100 text-red-700 dark:bg-red-950/50 dark:text-red-300",
  // đã hủy
  cancelled: "bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400",
};

export function StatusBadge({
  status,
  label,
  title,
  className,
}: {
  status: string;
  label: string;
  /** tooltip (vd nội dung lỗi khi status = failed) */
  title?: string;
  className?: string;
}) {
  return (
    <span
      title={title}
      className={cn(
        "shrink-0 rounded-full px-2.5 py-0.5 text-xs font-semibold",
        STATUS_CLS[status] ?? STATUS_CLS.queued,
        className,
      )}
    >
      {label}
    </span>
  );
}
