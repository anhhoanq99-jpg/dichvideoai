"use client";

import { useEffect, useState } from "react";
import { Download, Languages, Loader2, Play, Upload } from "lucide-react";
import {
  CREDIT_PRICING,
  TARGET_LANGS,
  TRANSLATION_STYLES,
  type TargetLangId,
  type TranslationStyleId,
} from "@dichvideo/shared";
import { useJobStream } from "@/hooks/use-job-stream";
import { cn } from "@/lib/utils";

interface DoneInfo {
  videoId: string;
  translatedTrackId: string | null;
}

/** Tab Dịch phụ đề: tải file .srt/.vtt lên, dịch sang ngôn ngữ bất kỳ, tải bản dịch về. */
export default function TranslateSrtPage() {
  const [file, setFile] = useState<File | null>(null);
  const [content, setContent] = useState<string>("");
  const [lineCount, setLineCount] = useState(0);
  const [targetLang, setTargetLang] = useState<TargetLangId>("vi");
  const [style, setStyle] = useState<TranslationStyleId>("natural");
  const [customPrompt, setCustomPrompt] = useState("");
  const [dragOver, setDragOver] = useState(false);
  const [jobId, setJobId] = useState<string | null>(null);
  const [videoId, setVideoId] = useState<string | null>(null);
  const [done, setDone] = useState<DoneInfo | null>(null);
  const [error, setError] = useState<string | null>(null);
  const job = useJobStream(jobId);

  const running = jobId !== null && !done && job?.status !== "failed";

  async function onFile(f: File | undefined) {
    if (!f) return;
    setError(null);
    setDone(null);
    setJobId(null);
    const text = await f.text();
    // đếm nhanh số cue để ước tính chi phí
    const cues = text.split(/\r?\n\r?\n/).filter((b) => /-->/.test(b)).length;
    setFile(f);
    setContent(text);
    setLineCount(cues);
  }

  async function start() {
    if (!file || !content) return;
    setError(null);
    const res = await fetch("/api/srt/translate", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        fileName: file.name,
        content,
        targetLang,
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
    setVideoId(data.videoId);
    setLineCount(data.lines);
  }

  // job xong → lấy id track bản dịch để tải về
  useEffect(() => {
    if (job?.status !== "done" || !videoId) return;
    fetch(`/api/videos/${videoId}/tracks`)
      .then((r) => r.json())
      .then((d) => {
        const translated = (
          d.tracks as { id: string; kind: string }[] | undefined
        )?.find((t) => t.kind === "translated");
        setDone({ videoId, translatedTrackId: translated?.id ?? null });
      })
      .catch(() => setDone({ videoId, translatedTrackId: null }));
  }, [job?.status, videoId]);

  const estimate = Math.max(
    CREDIT_PRICING.translateMin,
    lineCount * CREDIT_PRICING.translatePerLine,
  );

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <div className="text-center">
        <h1 className="flex items-center justify-center gap-2 text-2xl font-semibold tracking-tight">
          <Languages className="h-6 w-6 text-indigo-600 dark:text-indigo-400" />
          Dịch phụ đề AI
        </h1>
        <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
          Tải file .srt hoặc .vtt lên, chọn ngôn ngữ đích bất kỳ — AI dịch mượt theo ngữ
          cảnh, giữ nguyên mốc thời gian.
        </p>
      </div>

      {/* chọn file */}
      <label
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          void onFile(e.dataTransfer.files[0]);
        }}
        className={cn(
          "flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed py-10 transition-colors",
          dragOver
            ? "border-indigo-500 bg-indigo-50 dark:bg-indigo-950/30"
            : "border-neutral-300 hover:border-neutral-400 dark:border-neutral-700 dark:hover:border-neutral-600",
        )}
      >
        <Upload className="h-9 w-9 text-neutral-400" />
        <p className="mt-3 text-sm font-medium">
          {file ? file.name : "Kéo thả file phụ đề hoặc bấm để chọn (.srt, .vtt)"}
        </p>
        {file && (
          <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
            {lineCount} dòng · ước tính {estimate.toLocaleString("vi-VN")} credits
          </p>
        )}
        <input
          type="file"
          accept=".srt,.vtt,text/plain"
          className="hidden"
          onChange={(e) => {
            void onFile(e.target.files?.[0]);
            e.target.value = "";
          }}
        />
      </label>

      {/* thiết lập dịch */}
      <div className="grid gap-4 rounded-xl border border-neutral-200 bg-white p-4 sm:grid-cols-2 dark:border-neutral-800 dark:bg-neutral-900">
        <label className="text-sm">
          <span className="block text-xs font-medium text-neutral-500 dark:text-neutral-400">
            Dịch sang
          </span>
          <select
            value={targetLang}
            onChange={(e) => setTargetLang(e.target.value as TargetLangId)}
            className="mt-1 w-full rounded-md border border-neutral-300 bg-white px-2 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-800"
          >
            {TARGET_LANGS.map((l) => (
              <option key={l.id} value={l.id}>
                {l.name}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm">
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
        </label>
        {style === "custom" && (
          <textarea
            value={customPrompt}
            onChange={(e) => setCustomPrompt(e.target.value)}
            rows={3}
            placeholder="Mô tả phong cách dịch bạn muốn…"
            className="w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm sm:col-span-2 dark:border-neutral-700 dark:bg-neutral-800"
          />
        )}
      </div>

      {/* trạng thái + hành động */}
      {running ? (
        <div className="rounded-xl border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900">
          <p className="flex items-center gap-2 text-sm">
            <Loader2 className="h-4 w-4 animate-spin" />
            Đang dịch {lineCount} dòng… {job?.progress ?? 0}%
          </p>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-neutral-100 dark:bg-neutral-800">
            <div
              className="h-full rounded-full bg-indigo-600 transition-all"
              style={{ width: `${job?.progress ?? 0}%` }}
            />
          </div>
        </div>
      ) : done ? (
        <div className="flex flex-wrap items-center justify-center gap-3 rounded-xl border border-emerald-300 bg-emerald-50 p-4 dark:border-emerald-800 dark:bg-emerald-950/30">
          <p className="text-sm font-medium text-emerald-700 dark:text-emerald-300">
            Dịch xong!
          </p>
          {done.translatedTrackId && (
            <>
              <a
                href={`/api/tracks/${done.translatedTrackId}/export?format=srt`}
                className="inline-flex items-center gap-1.5 rounded-md bg-emerald-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-emerald-700"
              >
                <Download className="h-4 w-4" /> Bản dịch (.SRT)
              </a>
              <a
                href={`/api/tracks/${done.translatedTrackId}/export?format=txt`}
                className="inline-flex items-center gap-1.5 rounded-md border border-emerald-400 px-3 py-1.5 text-sm font-medium text-emerald-700 hover:bg-emerald-100 dark:text-emerald-300 dark:hover:bg-emerald-900/40"
              >
                <Download className="h-4 w-4" /> Văn bản (.TXT)
              </a>
            </>
          )}
        </div>
      ) : (
        <button
          type="button"
          disabled={!file}
          onClick={() => void start()}
          className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-indigo-600 px-6 py-3 text-sm font-semibold text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Play className="h-4 w-4" /> Dịch ngay
          {file ? ` — ${estimate.toLocaleString("vi-VN")} credits` : ""}
        </button>
      )}

      {(error || job?.status === "failed") && (
        <p className="rounded-md bg-red-50 px-4 py-3 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-300">
          {error ?? job?.error ?? "Dịch thất bại — credits đã được hoàn"}
        </p>
      )}
    </div>
  );
}
