"use client";

import { useState } from "react";
import { AudioLines, ScanText } from "lucide-react";
import { useJobRunner } from "@/hooks/use-job-runner";
import { JobError, JobProgress } from "@/components/jobs/job-ui";
import { optionCardClass, selectClass } from "@/components/ui/form-styles";
import type { Lang } from "@/lib/i18n";

const T = {
  vi: {
    langHints: [
      { value: "", label: "Tự phát hiện" },
      { value: "zh", label: "Tiếng Trung" },
      { value: "en", label: "Tiếng Anh" },
      { value: "ko", label: "Tiếng Hàn" },
      { value: "ja", label: "Tiếng Nhật" },
      { value: "th", label: "Tiếng Thái" },
    ],
    title: "Trích xuất phụ đề gốc",
    progressStt: "Đang nhận dạng giọng nói…",
    progressOcr: "Đang đọc phụ đề trên hình…",
    sttLabel: "Nhận dạng giọng nói (STT)",
    sttHint: "Video có lời thoại rõ — nhanh và rẻ nhất",
    ocrLabel: "Đọc phụ đề gắn cứng (OCR)",
    ocrHint: "Video đã có phụ đề in trên hình",
    sourceLang: "Ngôn ngữ gốc:",
    errStart: "Không bắt đầu được trích xuất",
    start: "Bắt đầu trích xuất",
    errFallback: "Trích xuất thất bại",
  },
  en: {
    langHints: [
      { value: "", label: "Auto-detect" },
      { value: "zh", label: "Chinese" },
      { value: "en", label: "English" },
      { value: "ko", label: "Korean" },
      { value: "ja", label: "Japanese" },
      { value: "th", label: "Thai" },
    ],
    title: "Extract original subtitles",
    progressStt: "Recognizing speech…",
    progressOcr: "Reading on-screen subtitles…",
    sttLabel: "Speech recognition (STT)",
    sttHint: "Videos with clear dialogue — fastest and cheapest",
    ocrLabel: "Hardcoded subtitle reading (OCR)",
    ocrHint: "Videos with subtitles burned into the frames",
    sourceLang: "Source language:",
    errStart: "Could not start extraction",
    start: "Start extraction",
    errFallback: "Extraction failed",
  },
} as const;

interface ExtractPanelProps {
  videoId: string;
  videoStatus: string;
  hasOriginalTrack: boolean;
  lang?: Lang;
}

export function ExtractPanel({
  videoId,
  videoStatus,
  hasOriginalTrack,
  lang = "vi",
}: ExtractPanelProps) {
  const t = T[lang];
  const [method, setMethod] = useState<"stt" | "ocr">("stt");
  const [sourceLang, setSourceLang] = useState("");
  const { job, running, error, start } = useJobRunner();

  const canStart =
    (videoStatus === "uploaded" || videoStatus === "ready") && !running;

  if (hasOriginalTrack && !running) return null;

  return (
    <section className="rounded-lg border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900">
      <h2 className="text-sm font-semibold">{t.title}</h2>

      {running ? (
        <JobProgress
          className="mt-4"
          label={method === "stt" ? t.progressStt : t.progressOcr}
          progress={job?.progress ?? 0}
        />
      ) : (
        <>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <button
              type="button"
              onClick={() => setMethod("stt")}
              className={`flex items-start gap-3 ${optionCardClass(method === "stt")}`}
            >
              <AudioLines className="mt-0.5 h-5 w-5 shrink-0 text-primary-600 dark:text-primary-400" />
              <span>
                <span className="block text-sm font-medium">
                  {t.sttLabel}
                </span>
                <span className="mt-0.5 block text-xs text-neutral-500 dark:text-neutral-400">
                  {t.sttHint}
                </span>
              </span>
            </button>
            <button
              type="button"
              onClick={() => setMethod("ocr")}
              className={`flex items-start gap-3 ${optionCardClass(method === "ocr")}`}
            >
              <ScanText className="mt-0.5 h-5 w-5 shrink-0 text-primary-600 dark:text-primary-400" />
              <span>
                <span className="block text-sm font-medium">
                  {t.ocrLabel}
                </span>
                <span className="mt-0.5 block text-xs text-neutral-500 dark:text-neutral-400">
                  {t.ocrHint}
                </span>
              </span>
            </button>
          </div>

          <div className="mt-3 flex items-center gap-3">
            <label className="text-sm text-neutral-600 dark:text-neutral-300">
              {t.sourceLang}
            </label>
            <select
              value={sourceLang}
              onChange={(e) => setSourceLang(e.target.value)}
              className={selectClass}
            >
              {t.langHints.map((l) => (
                <option key={l.value} value={l.value}>
                  {l.label}
                </option>
              ))}
            </select>
          </div>

          <button
            type="button"
            disabled={!canStart}
            onClick={() =>
              void start(
                `/api/videos/${videoId}/extract`,
                { method, ...(sourceLang ? { sourceLang } : {}) },
                t.errStart,
              )
            }
            className="mt-4 rounded-md bg-primary-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {t.start}
          </button>
        </>
      )}

      <JobError className="mt-3" error={error} job={job} fallback={t.errFallback} />
    </section>
  );
}
