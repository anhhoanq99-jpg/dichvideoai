"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AudioLines, Loader2, ScanText } from "lucide-react";
import { useJobPoll } from "@/hooks/use-job-poll";
import { cn } from "@/lib/utils";

const LANG_HINTS = [
  { value: "", label: "Tự phát hiện" },
  { value: "zh", label: "Tiếng Trung" },
  { value: "en", label: "Tiếng Anh" },
  { value: "ko", label: "Tiếng Hàn" },
  { value: "ja", label: "Tiếng Nhật" },
  { value: "th", label: "Tiếng Thái" },
];

interface ExtractPanelProps {
  videoId: string;
  videoStatus: string;
  hasOriginalTrack: boolean;
}

export function ExtractPanel({
  videoId,
  videoStatus,
  hasOriginalTrack,
}: ExtractPanelProps) {
  const [method, setMethod] = useState<"stt" | "ocr">("stt");
  const [sourceLang, setSourceLang] = useState("");
  const [jobId, setJobId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const job = useJobPoll(jobId);
  const router = useRouter();

  if (job?.status === "done") {
    router.refresh();
  }

  const running = job?.status === "queued" || job?.status === "active";
  const canStart =
    (videoStatus === "uploaded" || videoStatus === "ready") && !running;

  async function start() {
    setError(null);
    const res = await fetch(`/api/videos/${videoId}/extract`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        method,
        ...(sourceLang ? { sourceLang } : {}),
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error ?? "Không bắt đầu được trích xuất");
      return;
    }
    setJobId(data.jobId);
  }

  if (hasOriginalTrack && !running) return null;

  return (
    <section className="rounded-lg border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900">
      <h2 className="text-sm font-semibold">Trích xuất phụ đề gốc</h2>

      {running ? (
        <div className="mt-4">
          <p className="flex items-center gap-2 text-sm">
            <Loader2 className="h-4 w-4 animate-spin" />
            {job?.type === "stt"
              ? "Đang nhận dạng giọng nói…"
              : "Đang đọc phụ đề trên hình…"}{" "}
            {job?.progress ?? 0}%
          </p>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-neutral-100 dark:bg-neutral-800">
            <div
              className="h-full rounded-full bg-indigo-600 transition-all dark:bg-indigo-500"
              style={{ width: `${job?.progress ?? 0}%` }}
            />
          </div>
        </div>
      ) : (
        <>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <button
              type="button"
              onClick={() => setMethod("stt")}
              className={cn(
                "flex items-start gap-3 rounded-lg border p-3 text-left transition-colors",
                method === "stt"
                  ? "border-indigo-500 bg-indigo-50 dark:bg-indigo-950/40"
                  : "border-neutral-200 hover:border-neutral-300 dark:border-neutral-700",
              )}
            >
              <AudioLines className="mt-0.5 h-5 w-5 shrink-0 text-indigo-600 dark:text-indigo-400" />
              <span>
                <span className="block text-sm font-medium">
                  Nhận dạng giọng nói (STT)
                </span>
                <span className="mt-0.5 block text-xs text-neutral-500 dark:text-neutral-400">
                  Video có lời thoại rõ — nhanh và rẻ nhất
                </span>
              </span>
            </button>
            <button
              type="button"
              onClick={() => setMethod("ocr")}
              className={cn(
                "flex items-start gap-3 rounded-lg border p-3 text-left transition-colors",
                method === "ocr"
                  ? "border-indigo-500 bg-indigo-50 dark:bg-indigo-950/40"
                  : "border-neutral-200 hover:border-neutral-300 dark:border-neutral-700",
              )}
            >
              <ScanText className="mt-0.5 h-5 w-5 shrink-0 text-indigo-600 dark:text-indigo-400" />
              <span>
                <span className="block text-sm font-medium">
                  Đọc phụ đề gắn cứng (OCR)
                </span>
                <span className="mt-0.5 block text-xs text-neutral-500 dark:text-neutral-400">
                  Video đã có phụ đề in trên hình
                </span>
              </span>
            </button>
          </div>

          <div className="mt-3 flex items-center gap-3">
            <label className="text-sm text-neutral-600 dark:text-neutral-300">
              Ngôn ngữ gốc:
            </label>
            <select
              value={sourceLang}
              onChange={(e) => setSourceLang(e.target.value)}
              className="rounded-md border border-neutral-300 bg-white px-2 py-1.5 text-sm dark:border-neutral-700 dark:bg-neutral-800"
            >
              {LANG_HINTS.map((l) => (
                <option key={l.value} value={l.value}>
                  {l.label}
                </option>
              ))}
            </select>
          </div>

          <button
            type="button"
            disabled={!canStart}
            onClick={() => void start()}
            className="mt-4 rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Bắt đầu trích xuất
          </button>
        </>
      )}

      {(error || job?.status === "failed") && (
        <p className="mt-3 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-300">
          {error ?? job?.error ?? "Trích xuất thất bại"}
        </p>
      )}
    </section>
  );
}
