"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Clapperboard, Download, Loader2 } from "lucide-react";
import {
  ASPECT_PRESETS,
  STYLE_PRESETS,
  type CoverMode,
  type CoverRegion,
} from "@dichvideo/shared";
import { useJobStream } from "@/hooks/use-job-stream";
import { RegionSelector } from "./region-selector";
import { cn } from "@/lib/utils";

const COVER_OPTIONS: { value: CoverMode; label: string; hint: string }[] = [
  { value: "none", label: "Không che", hint: "Video gốc không có phụ đề cứng" },
  { value: "blur", label: "Làm mờ", hint: "Blur vùng phụ đề gốc" },
  { value: "box", label: "Hộp tối", hint: "Che bằng nền tối đồng màu" },
];

interface RenderPanelProps {
  videoId: string;
  translatedTrackId: string | null;
}

export function RenderPanel({ videoId, translatedTrackId }: RenderPanelProps) {
  const [open, setOpen] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [styleId, setStyleId] = useState(STYLE_PRESETS[0].id);
  const [aspect, setAspect] = useState<string>("keep");
  const [coverMode, setCoverMode] = useState<CoverMode>("none");
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

  const running = job !== null && (job.status === "queued" || job.status === "active");
  const doneKey = (job?.result as { r2Key?: string } | null)?.r2Key;

  async function start() {
    setError(null);
    const res = await fetch(`/api/videos/${videoId}/render`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        trackId: translatedTrackId,
        styleId,
        aspect,
        coverMode,
        ...(coverMode !== "none" && region ? { region } : {}),
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
          <div>
            <p className="text-xs font-medium text-neutral-500 dark:text-neutral-400">
              Che phụ đề gốc
            </p>
            <div className="mt-2 grid gap-2 sm:grid-cols-3">
              {COVER_OPTIONS.map((o) => (
                <button
                  key={o.value}
                  type="button"
                  onClick={() => setCoverMode(o.value)}
                  className={cn(
                    "rounded-lg border p-2 text-left text-sm transition-colors",
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

          {coverMode !== "none" && previewUrl && (
            <RegionSelector
              previewUrl={previewUrl}
              region={region}
              onChange={setRegion}
            />
          )}

          <div className="flex flex-wrap gap-4">
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
                value={aspect}
                onChange={(e) => setAspect(e.target.value)}
                className="rounded-md border border-neutral-300 bg-white px-2 py-1.5 text-sm dark:border-neutral-700 dark:bg-neutral-800"
              >
                {ASPECT_PRESETS.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <button
            type="button"
            onClick={() => void start()}
            disabled={coverMode !== "none" && !region}
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
