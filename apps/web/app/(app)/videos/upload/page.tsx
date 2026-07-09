"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import {
  BookOpen,
  CheckCircle2,
  CloudUpload,
  Loader2,
  Play,
  Trash2,
  X,
  XCircle,
} from "lucide-react";
import {
  TRANSLATION_STYLES,
  UPLOAD_ALLOWED_TYPES,
  UPLOAD_MAX_BYTES,
  type TranslationStyleId,
} from "@dichvideo/shared";
import {
  useMultipartUpload,
  type PipelineSettings,
} from "@/hooks/use-multipart-upload";
import { cn } from "@/lib/utils";

const SOURCE_OPTIONS = [
  {
    value: "ocr" as const,
    label: "OCR — video có chữ trên hình",
    hint: "AI đọc phụ đề gắn cứng trên khung hình",
  },
  {
    value: "stt" as const,
    label: "Âm thanh — video chỉ có tiếng nói",
    hint: "AI nghe giọng nói và tạo phụ đề",
  },
];

const LANG_OPTIONS = [
  { value: "", label: "Tự nhận diện" },
  { value: "zh", label: "中文 (Trung)" },
  { value: "en", label: "English (Anh)" },
  { value: "ja", label: "日本語 (Nhật)" },
  { value: "ko", label: "한국어 (Hàn)" },
  { value: "th", label: "ไทย (Thái)" },
];

const STYLE_OPTIONS = TRANSLATION_STYLES.filter((s) => s.id !== "custom");

type FileStatus = "waiting" | "uploading" | "done" | "error";

export default function UploadPage() {
  const { state, upload, cancel } = useMultipartUpload();
  const [dragOver, setDragOver] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const router = useRouter();

  // thiết lập pipeline (áp cho tất cả video trong danh sách)
  const [method, setMethod] = useState<"ocr" | "stt">("ocr");
  const [sourceLang, setSourceLang] = useState("");
  const [style, setStyle] = useState<TranslationStyleId>("natural");
  const [glossary, setGlossary] = useState("");

  const [files, setFiles] = useState<File[]>([]);
  const [statuses, setStatuses] = useState<FileStatus[]>([]);
  const [running, setRunning] = useState(false);

  const addFiles = useCallback((list: FileList | null) => {
    if (!list) return;
    setLocalError(null);
    const accepted: File[] = [];
    for (const file of Array.from(list)) {
      if (!UPLOAD_ALLOWED_TYPES[file.type]) {
        setLocalError(`"${file.name}": định dạng không hỗ trợ (MP4, MOV, MKV, WebM).`);
        continue;
      }
      if (file.size > UPLOAD_MAX_BYTES) {
        setLocalError(`"${file.name}": vượt giới hạn 2GB.`);
        continue;
      }
      accepted.push(file);
    }
    if (accepted.length) {
      setFiles((prev) => [...prev, ...accepted]);
      setStatuses((prev) => [...prev, ...accepted.map(() => "waiting" as FileStatus)]);
    }
  }, []);

  async function startAll() {
    if (files.length === 0 || running) return;
    setRunning(true);
    setLocalError(null);
    const pipeline: PipelineSettings = {
      method,
      ...(sourceLang ? { sourceLang } : {}),
      style,
      ...(glossary.trim() ? { glossary: glossary.trim() } : {}),
    };

    let okCount = 0;
    for (let i = 0; i < files.length; i++) {
      setStatuses((prev) => prev.map((s, k) => (k === i ? "uploading" : s)));
      const videoId = await upload(files[i], pipeline);
      setStatuses((prev) =>
        prev.map((s, k) => (k === i ? (videoId ? "done" : "error") : s)),
      );
      if (videoId) okCount++;
    }
    setRunning(false);
    if (okCount > 0) router.push("/videos");
  }

  const uploadingPct = state.phase === "uploading" ? state.pct : null;

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <div className="text-center">
        <h1 className="text-2xl font-semibold tracking-tight">Việt hóa video</h1>
        <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
          Thả video vào, bấm Bắt Đầu — hệ thống tự trích phụ đề rồi tự dịch sang tiếng
          Việt. Hỗ trợ nhiều video cùng lúc.
        </p>
      </div>

      {/* Thiết lập chung */}
      <div className="space-y-4 rounded-xl border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900">
        <div className="grid gap-3 sm:grid-cols-2">
          {SOURCE_OPTIONS.map((o) => (
            <button
              key={o.value}
              type="button"
              disabled={running}
              onClick={() => setMethod(o.value)}
              className={cn(
                "rounded-lg border p-3 text-left text-sm transition-colors",
                method === o.value
                  ? "border-indigo-500 bg-indigo-50 dark:bg-indigo-950/40"
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

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="text-sm">
            <span className="block text-xs font-medium text-neutral-500 dark:text-neutral-400">
              Ngôn ngữ gốc
            </span>
            <select
              value={sourceLang}
              disabled={running}
              onChange={(e) => setSourceLang(e.target.value)}
              className="mt-1 w-full rounded-md border border-neutral-300 bg-white px-2 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-800"
            >
              {LANG_OPTIONS.map((l) => (
                <option key={l.value} value={l.value}>
                  {l.label}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm">
            <span className="block text-xs font-medium text-neutral-500 dark:text-neutral-400">
              Phong cách dịch (sang tiếng Việt)
            </span>
            <select
              value={style}
              disabled={running}
              onChange={(e) => setStyle(e.target.value as typeof style)}
              className="mt-1 w-full rounded-md border border-neutral-300 bg-white px-2 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-800"
            >
              {STYLE_OPTIONS.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </label>
        </div>

        <details>
          <summary className="flex cursor-pointer items-center gap-2 text-sm text-neutral-600 dark:text-neutral-300">
            <BookOpen className="h-4 w-4" /> Từ điển &amp; nhân vật (tùy chọn)
          </summary>
          <textarea
            value={glossary}
            disabled={running}
            onChange={(e) => setGlossary(e.target.value)}
            placeholder={
              "Mỗi dòng một quy tắc, ví dụ:\n咪 = Mi (tên mèo, xưng hô: hoàng thượng)\n主人 = con sen"
            }
            rows={4}
            className="mt-2 w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-800"
          />
        </details>
      </div>

      {/* Khu thả file */}
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
            ? "border-indigo-500 bg-indigo-50 dark:bg-indigo-950/30"
            : "border-neutral-300 hover:border-neutral-400 dark:border-neutral-700 dark:hover:border-neutral-600",
        )}
      >
        <CloudUpload className="h-10 w-10 text-neutral-400" />
        <p className="mt-3 text-sm font-medium">Kéo thả video hoặc bấm để chọn</p>
        <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
          Chọn được nhiều video cùng lúc — MP4, MOV, MKV, WebM, tối đa 2GB/video
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

      {/* Danh sách video */}
      {files.length > 0 && (
        <div className="rounded-xl border border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900">
          <p className="border-b border-neutral-200 px-4 py-2 text-xs font-medium text-neutral-500 dark:border-neutral-800 dark:text-neutral-400">
            Danh sách video ({files.length})
          </p>
          <ul className="divide-y divide-neutral-100 dark:divide-neutral-800">
            {files.map((f, i) => (
              <li key={`${f.name}-${i}`} className="flex items-center gap-3 px-4 py-2.5 text-sm">
                {statuses[i] === "uploading" && (
                  <Loader2 className="h-4 w-4 shrink-0 animate-spin text-indigo-500" />
                )}
                {statuses[i] === "done" && (
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500" />
                )}
                {statuses[i] === "error" && (
                  <XCircle className="h-4 w-4 shrink-0 text-red-500" />
                )}
                {statuses[i] === "waiting" && (
                  <span className="h-4 w-4 shrink-0 rounded-full border border-neutral-300 dark:border-neutral-600" />
                )}
                <span className="min-w-0 flex-1 truncate">{f.name}</span>
                <span className="shrink-0 text-xs text-neutral-400">
                  {(f.size / 1e6).toFixed(1)} MB
                </span>
                {statuses[i] === "uploading" && uploadingPct !== null && (
                  <span className="shrink-0 text-xs font-medium text-indigo-500">
                    {uploadingPct}%
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
        </div>
      )}

      {/* Nút bắt đầu */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          disabled={files.length === 0 || running}
          onClick={() => void startAll()}
          className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-indigo-600 to-violet-600 px-6 py-3 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {running ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" /> Đang tải lên…
            </>
          ) : (
            <>
              <Play className="h-4 w-4" /> Bắt Đầu
            </>
          )}
        </button>
        {running && (
          <button
            type="button"
            onClick={() => void cancel()}
            className="flex items-center gap-1 rounded-lg border border-neutral-300 px-4 py-3 text-sm text-red-600 hover:bg-red-50 dark:border-neutral-700 dark:text-red-400 dark:hover:bg-red-950/40"
          >
            <X className="h-4 w-4" /> Hủy
          </button>
        )}
      </div>
      <p className="text-center text-xs text-neutral-400">
        Sau khi tải lên, từng video sẽ tự chạy: đọc thông số → trích phụ đề gốc → dịch
        sang tiếng Việt. Theo dõi tiến trình trong danh sách video.
      </p>

      {(localError || state.phase === "error") && (
        <p className="rounded-md bg-red-50 px-4 py-3 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-300">
          {localError ?? (state.phase === "error" ? state.message : "")}
        </p>
      )}
    </div>
  );
}
