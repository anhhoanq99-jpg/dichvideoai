import { Download, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { JobStreamInfo } from "@/hooks/use-job-stream";

/** Màu nhấn theo loại job — đồng bộ với nút bấm của từng panel. */
export type JobAccent = "indigo" | "emerald" | "violet";

const BAR_COLORS: Record<JobAccent, string> = {
  indigo: "bg-primary-600 dark:bg-primary-500",
  emerald: "bg-success-600 dark:bg-success-500",
  violet: "bg-accent-600 dark:bg-accent-500",
};

/** Dòng "Đang xử lý… x%" kèm thanh tiến độ, dùng chung cho mọi panel job. */
export function JobProgress({
  label,
  progress,
  accent = "indigo",
  className,
}: {
  label: string;
  progress: number;
  accent?: JobAccent;
  className?: string;
}) {
  return (
    <div className={className}>
      <p className="flex items-center gap-2 text-sm">
        <Loader2 className="h-4 w-4 animate-spin" />
        {label} {progress}%
      </p>
      <div className="mt-2 h-2 overflow-hidden rounded-full bg-neutral-100 dark:bg-neutral-800">
        <div
          className={cn("h-full rounded-full transition-all", BAR_COLORS[accent])}
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
}

/** Ô báo lỗi đỏ: hiện khi start thất bại hoặc job failed. */
export function JobError({
  error,
  job,
  fallback,
  className,
}: {
  error: string | null;
  job: JobStreamInfo | null;
  fallback: string;
  className?: string;
}) {
  if (!error && job?.status !== "failed") return null;
  return (
    <p
      className={cn(
        "rounded-md bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-300",
        className,
      )}
    >
      {error ?? job?.error ?? fallback}
    </p>
  );
}

/** Nút tải kết quả khi job render/dub hoàn tất. */
export function JobDownloadLink({ jobId, label }: { jobId: string; label: string }) {
  return (
    <a
      href={`/api/jobs/${jobId}/download`}
      className="mt-3 inline-flex items-center gap-2 rounded-md bg-success-600 px-4 py-2 text-sm font-medium text-white hover:bg-success-700"
    >
      <Download className="h-4 w-4" /> {label}
    </a>
  );
}
