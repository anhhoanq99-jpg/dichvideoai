"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { CloudUpload, Loader2, X } from "lucide-react";
import { UPLOAD_ALLOWED_TYPES, UPLOAD_MAX_BYTES } from "@dichvideo/shared";
import { useMultipartUpload } from "@/hooks/use-multipart-upload";
import { cn } from "@/lib/utils";

export default function UploadPage() {
  const { state, upload, cancel } = useMultipartUpload();
  const [dragOver, setDragOver] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const router = useRouter();

  const onFile = useCallback(
    (file: File | undefined) => {
      setLocalError(null);
      if (!file) return;
      if (!UPLOAD_ALLOWED_TYPES[file.type]) {
        setLocalError("Định dạng không hỗ trợ. Chỉ nhận MP4, MOV, MKV, WebM.");
        return;
      }
      if (file.size > UPLOAD_MAX_BYTES) {
        setLocalError("File vượt quá giới hạn 2GB.");
        return;
      }
      void upload(file);
    },
    [upload],
  );

  if (state.phase === "done") {
    router.push(`/videos/${state.videoId}`);
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Tải video lên</h1>
        <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
          MP4, MOV, MKV hoặc WebM — tối đa 2GB, 60 phút.
        </p>
      </div>

      {state.phase === "uploading" ? (
        <div className="rounded-lg border border-neutral-200 bg-white p-6 dark:border-neutral-800 dark:bg-neutral-900">
          <div className="flex items-center justify-between">
            <p className="flex items-center gap-2 text-sm font-medium">
              <Loader2 className="h-4 w-4 animate-spin" />
              Đang tải lên… {state.pct}%
            </p>
            <button
              type="button"
              onClick={() => void cancel()}
              className="flex items-center gap-1 rounded-md px-2 py-1 text-sm text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/40"
            >
              <X className="h-4 w-4" /> Hủy
            </button>
          </div>
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-neutral-100 dark:bg-neutral-800">
            <div
              className="h-full rounded-full bg-indigo-600 transition-all dark:bg-indigo-500"
              style={{ width: `${state.pct}%` }}
            />
          </div>
        </div>
      ) : (
        <label
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragOver(false);
            onFile(e.dataTransfer.files[0]);
          }}
          className={cn(
            "flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed py-16 transition-colors",
            dragOver
              ? "border-indigo-500 bg-indigo-50 dark:bg-indigo-950/30"
              : "border-neutral-300 hover:border-neutral-400 dark:border-neutral-700 dark:hover:border-neutral-600",
          )}
        >
          <CloudUpload className="h-10 w-10 text-neutral-400" />
          <p className="mt-3 text-sm font-medium">
            Kéo thả video vào đây hoặc bấm để chọn file
          </p>
          <input
            type="file"
            accept="video/mp4,video/quicktime,video/x-matroska,video/webm"
            className="hidden"
            onChange={(e) => onFile(e.target.files?.[0])}
          />
        </label>
      )}

      {(localError || state.phase === "error") && (
        <p className="rounded-md bg-red-50 px-4 py-3 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-300">
          {localError ?? (state.phase === "error" ? state.message : "")}
        </p>
      )}
    </div>
  );
}
