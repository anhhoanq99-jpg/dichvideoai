"use client";

import { CheckCircle2, Loader2, Trash2, XCircle } from "lucide-react";
import { estimateJobCredits } from "@dichvideo/shared";
import type { Lang } from "@/lib/i18n";

const T = {
  vi: {
    listTitle: (n: number) => `Danh sách video (${n})`,
    estimate: (credits: string) => `~${credits} credits + dịch 5/dòng`,
  },
  en: {
    listTitle: (n: number) => `Video queue (${n})`,
    estimate: (credits: string) => `~${credits} credits + translation 5/line`,
  },
} as const;

export type UploadFileStatus = "waiting" | "uploading" | "done" | "error";

/** Khóa nhận diện file trong map thời lượng (tên + kích thước). */
export function fileKey(file: File) {
  return `${file.name}:${file.size}`;
}

interface UploadFileListProps {
  files: File[];
  statuses: UploadFileStatus[];
  /** thời lượng (giây) đọc được từ metadata — để ước tính credits */
  durations: Record<string, number | null>;
  method: "ocr" | "stt";
  uploadingPct: number | null;
  running: boolean;
  onRemove: (index: number) => void;
  lang?: Lang;
}

/** Danh sách video chờ upload kèm trạng thái + ước tính credits từng file. */
export function UploadFileList({
  files,
  statuses,
  durations,
  method,
  uploadingPct,
  running,
  onRemove,
  lang = "vi",
}: UploadFileListProps) {
  const t = T[lang];
  if (files.length === 0) return null;

  return (
    <div className="rounded-xl border border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900">
      <p className="border-b border-neutral-200 px-4 py-2 text-xs font-medium text-neutral-500 dark:border-neutral-800 dark:text-neutral-400">
        {t.listTitle(files.length)}
      </p>
      <ul className="divide-y divide-neutral-100 dark:divide-neutral-800">
        {files.map((file, i) => {
          const durationSec = durations[fileKey(file)];
          return (
            <li key={`${file.name}-${i}`} className="flex items-center gap-3 px-4 py-2.5 text-sm">
              {statuses[i] === "uploading" && (
                <Loader2 className="h-4 w-4 shrink-0 animate-spin text-primary-500" />
              )}
              {statuses[i] === "done" && (
                <CheckCircle2 className="h-4 w-4 shrink-0 text-success-500" />
              )}
              {statuses[i] === "error" && (
                <XCircle className="h-4 w-4 shrink-0 text-red-500" />
              )}
              {statuses[i] === "waiting" && (
                <span className="h-4 w-4 shrink-0 rounded-full border border-neutral-300 dark:border-neutral-600" />
              )}
              <span className="min-w-0 flex-1 truncate">{file.name}</span>
              {durationSec ? (
                <span className="shrink-0 rounded bg-amber-50 px-1.5 py-0.5 text-xs font-medium text-amber-700 dark:bg-amber-950/40 dark:text-amber-300">
                  {t.estimate(
                    estimateJobCredits(method, { durationSec }).toLocaleString("vi-VN"),
                  )}
                </span>
              ) : null}
              <span className="shrink-0 text-xs text-neutral-400">
                {(file.size / 1e6).toFixed(1)} MB
              </span>
              {statuses[i] === "uploading" && uploadingPct !== null && (
                <span className="shrink-0 text-xs font-medium text-primary-500">
                  {uploadingPct}%
                </span>
              )}
              {!running && (
                <button
                  type="button"
                  onClick={() => onRemove(i)}
                  className="shrink-0 rounded p-1 text-neutral-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/40"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
