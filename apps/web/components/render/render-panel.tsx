"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Clapperboard, Download, Loader2, Sparkles } from "lucide-react";
import {
  ASPECT_PRESETS,
  STYLE_PRESETS,
  type CoverMode,
  type CoverRegion,
  type Placement,
} from "@dichvideo/shared";
import { useJobStream } from "@/hooks/use-job-stream";
import { RegionSelector } from "./region-selector";
import { cn } from "@/lib/utils";

interface RenderPanelProps {
  videoId: string;
  translatedTrackId: string | null;
  /** OCR tracks carry per-line boxes → enables auto-cover + replace placement */
  hasBoxes: boolean;
}

export function RenderPanel({
  videoId,
  translatedTrackId,
  hasBoxes,
}: RenderPanelProps) {
  const [open, setOpen] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [styleId, setStyleId] = useState(STYLE_PRESETS[0].id);
  const [aspect, setAspect] = useState<string>("keep");
  const [coverMode, setCoverMode] = useState<CoverMode>(hasBoxes ? "auto" : "none");
  const [placement, setPlacement] = useState<Placement>("bottom");
  const [primaryColor, setPrimaryColor] = useState("#FFFFFF");
  const [boxColor, setBoxColor] = useState("#000000");
  const [useCustomColors, setUseCustomColors] = useState(false);
  const [region, setRegion] = useState<CoverRegion | null>(null);
  const [jobId, setJobId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const job = useJobStream(jobId);
  const router = useRouter();

  useEffect(() => {
    if (open && !previewUrl) {
      fetch(`/api/videos/${videoId}/preview-url`)
        .then((r) => r.json())
        .then((d) => setPreviewUrl(d.url ?? null))
        .catch(() => {});
    }
  }, [open, previewUrl, videoId]);

  useEffect(() => {
    if (job?.status === "done") router.refresh();
  }, [job?.status, router]);

  if (!translatedTrackId) return null;

  const coverOptions: {
    value: CoverMode;
    label: string;
    hint: string;
    disabled?: boolean;
  }[] = [
    {
      value: "auto",
      label: "Tự động (AI)",
      hint: hasBoxes
        ? "Che đúng chỗ, đúng lúc mọi vùng chữ — kể cả nhiều chỗ cùng lúc"
        : "Cần trích xuất bằng OCR để có vị trí chữ",
      disabled: !hasBoxes,
    },
    { value: "blur", label: "Làm mờ thủ công", hint: "Tự khoanh một vùng cố định" },
    { value: "box", label: "Hộp tối thủ công", hint: "Che vùng cố định bằng nền tối" },
    { value: "none", label: "Không che", hint: "Video gốc không có chữ cứng" },
  ];

  const running = job !== null && (job.status === "queued" || job.status === "active");
  const doneKey = (job?.result as { r2Key?: string } | null)?.r2Key;
  const replaceForced = placement === "replace";

  async function start() {
    setError(null);
    const res = await fetch(`/api/videos/${videoId}/render`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        trackId: translatedTrackId,
        styleId,
        aspect: replaceForced ? "keep" : aspect,
        coverMode,
        placement,
        ...(useCustomColors ? { primaryColor, boxColor: `${boxColor}E6` } : {}),
        ...((coverMode === "blur" || coverMode === "box") && region ? { region } : {}),
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error ?? "Không bắt đầu được render");
      return;
    }
    setJobId(data.jobId);
  }

  return (
    <section className="rounded-lg border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900">
      <div className="flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-sm font-semibold">
          <Clapperboard className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
          Xuất video Việt hóa
        </h2>
        {!open && !running && (
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="rounded-md bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-indigo-700"
          >
            Thiết lập render
          </button>
        )}
      </div>

      {running && (
        <div className="mt-3">
          <p className="flex items-center gap-2 text-sm">
            <Loader2 className="h-4 w-4 animate-spin" />
            Đang render video… {job?.progress ?? 0}%
          </p>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-neutral-100 dark:bg-neutral-800">
            <div
              className="h-full rounded-full bg-indigo-600 transition-all dark:bg-indigo-500"
              style={{ width: `${job?.progress ?? 0}%` }}
            />
          </div>
        </div>
      )}

      {job?.status === "done" && doneKey && (
        <a
          href={`/api/jobs/${jobId}/download`}
          className="mt-3 inline-flex items-center gap-2 rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700"
        >
          <Download className="h-4 w-4" /> Tải video kết quả
        </a>
      )}

      {open && !running && (
        <div className="mt-4 space-y-4">
          {/* Vị trí phụ đề Việt */}
          <div>
            <p className="text-xs font-medium text-neutral-500 dark:text-neutral-400">
              Vị trí phụ đề tiếng Việt
            </p>
            <div className="mt-2 grid gap-2 sm:grid-cols-2">
              <button
                type="button"
                onClick={() => setPlacement("bottom")}
                className={cn(
                  "rounded-lg border p-2 text-left text-sm transition-colors",
                  placement === "bottom"
                    ? "border-indigo-500 bg-indigo-50 dark:bg-indigo-950/40"
                    : "border-neutral-200 hover:border-neutral-300 dark:border-neutral-700",
                )}
              >
                <span className="block font-medium">Dưới đáy video</span>
                <span className="block text-xs text-neutral-500 dark:text-neutral-400">
                  Kiểu phụ đề truyền thống
                </span>
              </button>
              <button
                type="button"
                disabled={!hasBoxes}
                onClick={() => setPlacement("replace")}
                className={cn(
                  "rounded-lg border p-2 text-left text-sm transition-colors disabled:cursor-not-allowed disabled:opacity-50",
                  placement === "replace"
                    ? "border-indigo-500 bg-indigo-50 dark:bg-indigo-950/40"
                    : "border-neutral-200 hover:border-neutral-300 dark:border-neutral-700",
                )}
              >
                <span className="flex items-center gap-1 font-medium">
                  <Sparkles className="h-3.5 w-3.5 text-indigo-500" />
                  Thay vào chỗ chữ gốc
                </span>
                <span className="block text-xs text-neutral-500 dark:text-neutral-400">
                  {hasBoxes
                    ? "Ô nền đậm đè lên chữ gốc, chữ Việt nằm đúng vị trí cũ"
                    : "Cần trích xuất bằng OCR"}
                </span>
              </button>
            </div>
          </div>

          {/* Che chữ gốc */}
          <div>
            <p className="text-xs font-medium text-neutral-500 dark:text-neutral-400">
              Che chữ nước ngoài gốc
              {replaceForced && (
                <span className="ml-1 text-neutral-400">
                  (ô nền của phụ đề đã che phần lớn — chọn thêm nếu muốn chắc chắn)
                </span>
              )}
            </p>
            <div className="mt-2 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
              {coverOptions.map((o) => (
                <button
                  key={o.value}
                  type="button"
                  disabled={o.disabled}
                  onClick={() => setCoverMode(o.value)}
                  className={cn(
                    "rounded-lg border p-2 text-left text-sm transition-colors disabled:cursor-not-allowed disabled:opacity-50",
                    coverMode === o.value
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
          </div>

          {(coverMode === "blur" || coverMode === "box") && previewUrl && (
            <RegionSelector
              previewUrl={previewUrl}
              region={region}
              onChange={setRegion}
            />
          )}

          {/* Kiểu chữ + màu + khung hình */}
          <div className="flex flex-wrap items-center gap-4">
            <label className="text-sm">
              <span className="mr-2 text-neutral-500 dark:text-neutral-400">
                Kiểu phụ đề:
              </span>
              <select
                value={styleId}
                onChange={(e) => setStyleId(e.target.value)}
                className="rounded-md border border-neutral-300 bg-white px-2 py-1.5 text-sm dark:border-neutral-700 dark:bg-neutral-800"
              >
                {STYLE_PRESETS.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-sm">
              <span className="mr-2 text-neutral-500 dark:text-neutral-400">
                Khung hình:
              </span>
              <select
                value={replaceForced ? "keep" : aspect}
                disabled={replaceForced}
                onChange={(e) => setAspect(e.target.value)}
                className="rounded-md border border-neutral-300 bg-white px-2 py-1.5 text-sm disabled:opacity-50 dark:border-neutral-700 dark:bg-neutral-800"
              >
                {ASPECT_PRESETS.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex items-center gap-2 text-sm text-neutral-600 dark:text-neutral-300">
              <input
                type="checkbox"
                checked={useCustomColors}
                onChange={(e) => setUseCustomColors(e.target.checked)}
              />
              Tùy chỉnh màu
            </label>
            {useCustomColors && (
              <>
                <label className="flex items-center gap-1.5 text-sm text-neutral-500 dark:text-neutral-400">
                  Chữ
                  <input
                    type="color"
                    value={primaryColor}
                    onChange={(e) => setPrimaryColor(e.target.value.toUpperCase())}
                    className="h-7 w-9 cursor-pointer rounded border border-neutral-300 dark:border-neutral-700"
                  />
                </label>
                <label className="flex items-center gap-1.5 text-sm text-neutral-500 dark:text-neutral-400">
                  Ô nền
                  <input
                    type="color"
                    value={boxColor}
                    onChange={(e) => setBoxColor(e.target.value.toUpperCase())}
                    className="h-7 w-9 cursor-pointer rounded border border-neutral-300 dark:border-neutral-700"
                  />
                </label>
              </>
            )}
          </div>

          <button
            type="button"
            onClick={() => void start()}
            disabled={(coverMode === "blur" || coverMode === "box") && !region}
            className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Bắt đầu render
          </button>
        </div>
      )}

      {(error || job?.status === "failed") && (
        <p className="mt-3 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-300">
          {error ?? job?.error ?? "Render thất bại"}
        </p>
      )}
    </section>
  );
}
