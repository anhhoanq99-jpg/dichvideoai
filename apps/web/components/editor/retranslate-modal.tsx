"use client";

import { useEffect, useState } from "react";
import { Loader2, Sparkles, X } from "lucide-react";
import { TRANSLATION_STYLES, type TranslationStyleId } from "@dichvideo/shared";
import { useJobStream } from "@/hooks/use-job-stream";

interface RetranslateModalProps {
  videoId: string;
  lineCount: number;
  onClose: () => void;
}

/** Dịch lại toàn bộ bằng AI với phong cách chọn được (ghi đè bản dịch hiện tại). */
export function RetranslateModal({ videoId, lineCount, onClose }: RetranslateModalProps) {
  const [style, setStyle] = useState<TranslationStyleId>("natural");
  const [customPrompt, setCustomPrompt] = useState("");
  const [jobId, setJobId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const job = useJobStream(jobId);

  const running =
    jobId !== null && (!job || job.status === "queued" || job.status === "active");

  // bản dịch mới đã lưu server-side — nạp lại trang để đồng bộ editor
  useEffect(() => {
    if (job?.status === "done") window.location.reload();
  }, [job?.status]);

  async function start() {
    setError(null);
    if (style === "custom" && !customPrompt.trim()) {
      setError("Hãy mô tả phong cách dịch bạn muốn");
      return;
    }
    const res = await fetch(`/api/videos/${videoId}/translate`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        style,
        ...(style === "custom" ? { customPrompt: customPrompt.trim() } : {}),
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error ?? "Không bắt đầu được");
      return;
    }
    setJobId(data.jobId);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-xl border border-neutral-200 bg-white p-5 shadow-xl dark:border-neutral-800 dark:bg-neutral-900">
        <div className="flex items-center justify-between">
          <h3 className="flex items-center gap-2 text-sm font-semibold">
            <Sparkles className="h-4 w-4 text-violet-500" /> Dịch lại bằng AI
          </h3>
          <button
            type="button"
            onClick={onClose}
            disabled={running}
            className="rounded p-1 text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {running ? (
          <div className="mt-5 space-y-3 text-center">
            <p className="flex items-center justify-center gap-2 text-sm">
              <Loader2 className="h-4 w-4 animate-spin" />
              Đang dịch lại {lineCount} dòng… {job?.progress ?? 0}%
            </p>
            <div className="h-2 overflow-hidden rounded-full bg-neutral-100 dark:bg-neutral-800">
              <div
                className="h-full rounded-full bg-violet-600 transition-all"
                style={{ width: `${job?.progress ?? 0}%` }}
              />
            </div>
            <p className="text-xs text-neutral-400">
              Xong sẽ tự tải lại trang với bản dịch mới.
            </p>
          </div>
        ) : (
          <div className="mt-4 space-y-3">
            <label className="block text-sm">
              <span className="block text-xs font-medium text-neutral-500 dark:text-neutral-400">
                Phong cách dịch
              </span>
              <select
                value={style}
                onChange={(e) => setStyle(e.target.value as TranslationStyleId)}
                className="mt-1 w-full rounded-md border border-neutral-300 bg-white px-2 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-800"
              >
                {TRANSLATION_STYLES.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
              <span className="mt-1 block text-xs text-neutral-400">
                {TRANSLATION_STYLES.find((s) => s.id === style)?.hint}
              </span>
            </label>

            {style === "custom" && (
              <textarea
                value={customPrompt}
                onChange={(e) => setCustomPrompt(e.target.value)}
                rows={3}
                placeholder="Mô tả phong cách bạn muốn, vd: dịch kiểu giọng miền Nam thân mật, xưng tui - bà..."
                className="w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-800"
              />
            )}

            <p className="rounded-md bg-amber-50 px-3 py-2 text-xs text-amber-700 dark:bg-amber-950/40 dark:text-amber-300">
              Bản dịch hiện tại (kể cả chỗ bạn đã sửa tay) sẽ bị thay bằng bản dịch mới.
            </p>

            {(error || job?.status === "failed") && (
              <p className="rounded-md bg-red-50 px-3 py-2 text-xs text-red-700 dark:bg-red-950/40 dark:text-red-300">
                {error ?? job?.error ?? "Dịch thất bại"}
              </p>
            )}

            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={onClose}
                className="rounded-md border border-neutral-300 px-4 py-2 text-sm dark:border-neutral-700"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={() => void start()}
                className="rounded-md bg-violet-600 px-4 py-2 text-sm font-medium text-white hover:bg-violet-700"
              >
                Dịch lại toàn bộ
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
