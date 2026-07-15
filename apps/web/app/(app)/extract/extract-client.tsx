"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, FileText, Loader2, Play, Trash2, XCircle } from "lucide-react";
import { UPLOAD_ALLOWED_TYPES, UPLOAD_MAX_BYTES } from "@dichvideo/shared";
import {
  useMultipartUpload,
  type PipelineSettings,
} from "@/hooks/use-multipart-upload";
import type { Lang } from "@/lib/i18n";
import { fieldLabelClass, selectClass } from "@/components/ui/form-styles";
import { sourceLangOptions } from "@/lib/source-langs";
import { cn } from "@/lib/utils";

const T = {
  vi: {
    sourceOptions: [
      {
        value: "ocr" as const,
        label: "OCR — chữ trên hình",
        hint: "Đọc phụ đề gắn cứng trong khung hình",
      },
      {
        value: "stt" as const,
        label: "Âm thanh — giọng nói",
        hint: "Nghe audio và tạo phụ đề kèm mốc thời gian",
      },
    ],
    title: "Trích xuất phụ đề",
    subtitle:
      "Tách phụ đề từ video (chữ trên hình hoặc giọng nói) ra file SRT — không dịch. Xong vào video để tải file về.",
    errSkipped: "Một số file bị bỏ qua (chỉ nhận MP4/MOV/MKV/WebM, tối đa 2GB).",
    videoLang: "Ngôn ngữ trong video",
    dropTitle: "Kéo thả video/âm thanh hoặc bấm để chọn",
    dropHint: "MP4, MOV, MKV, WebM — tối đa 2GB/file",
    uploading: "Đang tải lên…",
    start: "Bắt đầu trích xuất",
  },
  en: {
    sourceOptions: [
      {
        value: "ocr" as const,
        label: "OCR — on-screen text",
        hint: "Reads hardcoded subtitles from the frames",
      },
      {
        value: "stt" as const,
        label: "Audio — speech",
        hint: "Listens to the audio and creates timestamped subtitles",
      },
    ],
    title: "Extract subtitles",
    subtitle:
      "Extract subtitles from a video (on-screen text or speech) into an SRT file — no translation. Then open the video to download the file.",
    errSkipped: "Some files were skipped (only MP4/MOV/MKV/WebM, up to 2GB).",
    videoLang: "Language in the video",
    dropTitle: "Drag & drop video/audio or click to browse",
    dropHint: "MP4, MOV, MKV, WebM — up to 2GB each",
    uploading: "Uploading…",
    start: "Start extraction",
  },
} as const;

type FileStatus = "waiting" | "uploading" | "done" | "error";

/** Tab Trích xuất phụ đề: tách phụ đề ra file SRT độc lập, KHÔNG dịch. */
export function ExtractPageClient({ lang = "vi" }: { lang?: Lang }) {
  const t = T[lang];
  const { state, upload } = useMultipartUpload();
  const [dragOver, setDragOver] = useState(false);
  const [method, setMethod] = useState<"ocr" | "stt">("ocr");
  const [sourceLang, setSourceLang] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [statuses, setStatuses] = useState<FileStatus[]>([]);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const addFiles = useCallback(
    (list: FileList | null) => {
      if (!list) return;
      setError(null);
      const ok = Array.from(list).filter(
        (f) => UPLOAD_ALLOWED_TYPES[f.type] && f.size <= UPLOAD_MAX_BYTES,
      );
      if (ok.length < list.length) {
        setError(t.errSkipped);
      }
      setFiles((prev) => [...prev, ...ok]);
      setStatuses((prev) => [...prev, ...ok.map(() => "waiting" as FileStatus)]);
    },
    [t],
  );

  async function startAll() {
    if (files.length === 0 || running) return;
    setRunning(true);
    const pipeline: PipelineSettings = {
      method,
      ...(sourceLang ? { sourceLang } : {}),
      translate: false, // chỉ tách phụ đề
      style: "natural",
    };
    let ok = 0;
    for (let i = 0; i < files.length; i++) {
      setStatuses((prev) => prev.map((s, k) => (k === i ? "uploading" : s)));
      const id = await upload(files[i], pipeline);
      setStatuses((prev) => prev.map((s, k) => (k === i ? (id ? "done" : "error") : s)));
      if (id) ok++;
    }
    setRunning(false);
    if (ok > 0) router.push("/videos");
  }

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <div className="text-center">
        <h1 className="flex items-center justify-center gap-2 text-2xl font-semibold tracking-tight">
          <FileText className="h-6 w-6 text-primary-600 dark:text-primary-400" />
          {t.title}
        </h1>
        <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
          {t.subtitle}
        </p>
      </div>

      <div className="space-y-4 rounded-xl border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900">
        <div className="grid gap-3 sm:grid-cols-2">
          {t.sourceOptions.map((o) => (
            <button
              key={o.value}
              type="button"
              disabled={running}
              onClick={() => setMethod(o.value)}
              className={cn(
                "rounded-lg border p-3 text-left text-sm transition-colors",
                method === o.value
                  ? "border-primary-500 bg-primary-50 dark:bg-primary-950/40"
                  : "border-neutral-200 hover:border-neutral-300 dark:border-neutral-700",
              )}
            >
              <span className="block font-medium">{o.label}</span>
              <span className="block text-xs text-neutral-500 dark:text-neutral-400">
                {o.hint}
              </span>
            </button>
          ))}
        </div>
        <label className="block text-sm sm:w-1/2">
          <span className={cn(fieldLabelClass, "font-medium")}>
            {t.videoLang}
          </span>
          <select
            value={sourceLang}
            disabled={running}
            onChange={(e) => setSourceLang(e.target.value)}
            className={cn(selectClass, "mt-1 w-full")}
          >
            {sourceLangOptions(lang).map((l) => (
              <option key={l.value} value={l.value}>
                {l.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      <label
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          addFiles(e.dataTransfer.files);
        }}
        className={cn(
          "flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed py-12 transition-colors",
          dragOver
            ? "border-primary-500 bg-primary-50 dark:bg-primary-950/30"
            : "border-neutral-300 hover:border-neutral-400 dark:border-neutral-700 dark:hover:border-neutral-600",
        )}
      >
        <FileText className="h-10 w-10 text-neutral-400" />
        <p className="mt-3 text-sm font-medium">{t.dropTitle}</p>
        <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
          {t.dropHint}
        </p>
        <input
          type="file"
          multiple
          accept="video/mp4,video/quicktime,video/x-matroska,video/webm"
          className="hidden"
          disabled={running}
          onChange={(e) => {
            addFiles(e.target.files);
            e.target.value = "";
          }}
        />
      </label>

      {files.length > 0 && (
        <ul className="divide-y divide-neutral-100 rounded-xl border border-neutral-200 bg-white dark:divide-neutral-800 dark:border-neutral-800 dark:bg-neutral-900">
          {files.map((f, i) => (
            <li key={`${f.name}-${i}`} className="flex items-center gap-3 px-4 py-2.5 text-sm">
              {statuses[i] === "uploading" && (
                <Loader2 className="h-4 w-4 shrink-0 animate-spin text-primary-500" />
              )}
              {statuses[i] === "done" && (
                <CheckCircle2 className="h-4 w-4 shrink-0 text-success-500" />
              )}
              {statuses[i] === "error" && <XCircle className="h-4 w-4 shrink-0 text-red-500" />}
              {statuses[i] === "waiting" && (
                <span className="h-4 w-4 shrink-0 rounded-full border border-neutral-300 dark:border-neutral-600" />
              )}
              <span className="min-w-0 flex-1 truncate">{f.name}</span>
              {statuses[i] === "uploading" && state.phase === "uploading" && (
                <span className="shrink-0 text-xs font-medium text-primary-500">
                  {state.pct}%
                </span>
              )}
              {!running && (
                <button
                  type="button"
                  onClick={() => {
                    setFiles((prev) => prev.filter((_, k) => k !== i));
                    setStatuses((prev) => prev.filter((_, k) => k !== i));
                  }}
                  className="shrink-0 rounded p-1 text-neutral-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/40"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              )}
            </li>
          ))}
        </ul>
      )}

      <button
        type="button"
        disabled={files.length === 0 || running}
        onClick={() => void startAll()}
        className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-primary-600 px-6 py-3 text-sm font-semibold text-white hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {running ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" /> {t.uploading}
          </>
        ) : (
          <>
            <Play className="h-4 w-4" /> {t.start}
          </>
        )}
      </button>

      {(error || state.phase === "error") && (
        <p className="rounded-md bg-red-50 px-4 py-3 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-300">
          {error ?? (state.phase === "error" ? state.message : "")}
        </p>
      )}
    </div>
  );
}
