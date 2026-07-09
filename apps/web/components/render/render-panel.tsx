"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Clapperboard, Download, Loader2 } from "lucide-react";
import {
  ASPECT_PRESETS,
  RENDER_FONTS,
  STYLE_PRESETS,
  type CoverMode,
  type CoverRegion,
} from "@dichvideo/shared";
import { useJobStream } from "@/hooks/use-job-stream";
import { RegionSelector } from "./region-selector";
import { SubtitlePositionBox } from "./subtitle-position-box";
import { cn } from "@/lib/utils";

const DEFAULT_SUB_BOX: CoverRegion = { x: 0.1, y: 0.72, w: 0.8, h: 0.18 };

const COVER_OPTIONS: { value: CoverMode; label: string; hint: string }[] = [
  { value: "blur", label: "Làm mờ", hint: "Blur các vùng đã khoanh" },
  { value: "box", label: "Hộp tối", hint: "Che các vùng bằng nền tối" },
  { value: "none", label: "Không che", hint: "Video gốc không có chữ cứng" },
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
  const [coverMode, setCoverMode] = useState<CoverMode>("blur");
  const [regions, setRegions] = useState<CoverRegion[]>([]);
  // style overrides
  const [customize, setCustomize] = useState(false);
  const [font, setFont] = useState<string>(STYLE_PRESETS[0].font);
  const [fontSize, setFontSize] = useState(48);
  const [bold, setBold] = useState(false);
  const [primaryColor, setPrimaryColor] = useState("#FFFFFF");
  const [outlineColor, setOutlineColor] = useState("#000000");
  const [boxed, setBoxed] = useState(false);
  const [boxColor, setBoxColor] = useState("#000000");
  const [boxOpacity, setBoxOpacity] = useState(100);
  const [marginV, setMarginV] = useState(40);
  const [customPosition, setCustomPosition] = useState(false);
  const [subBox, setSubBox] = useState<CoverRegion>(DEFAULT_SUB_BOX);

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

  function applyPreset(id: string) {
    setStyleId(id);
    const p = STYLE_PRESETS.find((x) => x.id === id)!;
    setFont(p.font);
    setFontSize(p.size);
    setBold(p.bold);
    setPrimaryColor(p.primary);
    setOutlineColor(p.outline);
    setBoxed(p.borderStyle === 3);
    setBoxColor(p.back ?? "#000000");
    setBoxOpacity(p.id === "solid-box" ? 100 : 67);
    setMarginV(p.marginV);
  }

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
        ...(coverMode !== "none" && regions.length > 0 ? { regions } : {}),
        ...(customPosition ? { subBox } : {}),
        ...(customize
          ? {
              font,
              fontSize,
              bold,
              primaryColor,
              outlineColor,
              boxed,
              boxColor,
              boxOpacity,
              marginV,
            }
          : {}),
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
          {/* Che chữ gốc */}
          <div>
            <p className="text-xs font-medium text-neutral-500 dark:text-neutral-400">
              Che chữ nước ngoài gốc
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
            <p className="mt-1 text-xs text-neutral-400">
              Mẹo: kiểu phụ đề &quot;Ô kín (che chữ gốc)&quot; bên dưới cũng che được chữ ở vị trí
              phụ đề — chỉ cần khoanh thêm các vùng chữ khác.
            </p>
          </div>

          {coverMode !== "none" && previewUrl && (
            <RegionSelector
              previewUrl={previewUrl}
              regions={regions}
              onChange={setRegions}
            />
          )}

          {/* Vị trí phụ đề */}
          <div>
            <label className="flex items-center gap-2 text-sm text-neutral-600 dark:text-neutral-300">
              <input
                type="checkbox"
                checked={customPosition}
                onChange={(e) => setCustomPosition(e.target.checked)}
              />
              Tự chọn vị trí phụ đề trên video (kéo &amp; co dãn)
            </label>
            {customPosition && previewUrl && (
              <div className="mt-2">
                <SubtitlePositionBox
                  previewUrl={previewUrl}
                  box={subBox}
                  onChange={setSubBox}
                  fontSize={fontSize}
                  bold={bold}
                  primaryColor={primaryColor}
                  boxed={boxed}
                  boxColor={boxColor}
                  boxOpacity={boxOpacity}
                />
              </div>
            )}
          </div>

          {/* Kiểu phụ đề */}
          <div className="flex flex-wrap items-center gap-4">
            <label className="text-sm">
              <span className="mr-2 text-neutral-500 dark:text-neutral-400">
                Kiểu phụ đề:
              </span>
              <select
                value={styleId}
                onChange={(e) => applyPreset(e.target.value)}
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
            <label className="flex items-center gap-2 text-sm text-neutral-600 dark:text-neutral-300">
              <input
                type="checkbox"
                checked={customize}
                onChange={(e) => {
                  setCustomize(e.target.checked);
                  if (e.target.checked) applyPreset(styleId);
                }}
              />
              Tùy chỉnh chi tiết
            </label>
          </div>

          {customize && (
            <div className="grid gap-4 rounded-lg border border-neutral-200 p-3 sm:grid-cols-2 lg:grid-cols-3 dark:border-neutral-700">
              <label className="text-sm">
                <span className="block text-xs text-neutral-500 dark:text-neutral-400">
                  Font chữ
                </span>
                <select
                  value={font}
                  onChange={(e) => setFont(e.target.value)}
                  className="mt-1 w-full rounded-md border border-neutral-300 bg-white px-2 py-1.5 text-sm dark:border-neutral-700 dark:bg-neutral-800"
                >
                  {RENDER_FONTS.map((f) => (
                    <option key={f} value={f}>
                      {f}
                    </option>
                  ))}
                </select>
              </label>
              <label className="text-sm">
                <span className="block text-xs text-neutral-500 dark:text-neutral-400">
                  Cỡ chữ: {fontSize}
                </span>
                <input
                  type="range"
                  min={20}
                  max={120}
                  value={fontSize}
                  onChange={(e) => setFontSize(Number(e.target.value))}
                  className="mt-2 w-full"
                />
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={bold}
                  onChange={(e) => setBold(e.target.checked)}
                />
                Chữ đậm
              </label>
              <label className="flex items-center gap-2 text-sm">
                <span className="text-xs text-neutral-500 dark:text-neutral-400">Màu chữ</span>
                <input
                  type="color"
                  value={primaryColor}
                  onChange={(e) => setPrimaryColor(e.target.value.toUpperCase())}
                  className="h-7 w-9 cursor-pointer rounded border border-neutral-300 dark:border-neutral-700"
                />
              </label>
              <label className="flex items-center gap-2 text-sm">
                <span className="text-xs text-neutral-500 dark:text-neutral-400">Màu viền</span>
                <input
                  type="color"
                  value={outlineColor}
                  onChange={(e) => setOutlineColor(e.target.value.toUpperCase())}
                  className="h-7 w-9 cursor-pointer rounded border border-neutral-300 dark:border-neutral-700"
                />
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={boxed}
                  onChange={(e) => setBoxed(e.target.checked)}
                />
                Ô nền sau chữ
              </label>
              {boxed && (
                <>
                  <label className="flex items-center gap-2 text-sm">
                    <span className="text-xs text-neutral-500 dark:text-neutral-400">
                      Màu ô nền
                    </span>
                    <input
                      type="color"
                      value={boxColor}
                      onChange={(e) => setBoxColor(e.target.value.toUpperCase())}
                      className="h-7 w-9 cursor-pointer rounded border border-neutral-300 dark:border-neutral-700"
                    />
                  </label>
                  <label className="text-sm">
                    <span className="block text-xs text-neutral-500 dark:text-neutral-400">
                      Độ phủ ô nền: {boxOpacity}% {boxOpacity === 100 ? "(che kín chữ gốc)" : ""}
                    </span>
                    <input
                      type="range"
                      min={20}
                      max={100}
                      value={boxOpacity}
                      onChange={(e) => setBoxOpacity(Number(e.target.value))}
                      className="mt-2 w-full"
                    />
                  </label>
                </>
              )}
              {!customPosition && (
                <label className="text-sm">
                  <span className="block text-xs text-neutral-500 dark:text-neutral-400">
                    Vị trí (cách đáy): {marginV}px
                  </span>
                  <input
                    type="range"
                    min={0}
                    max={400}
                    value={marginV}
                    onChange={(e) => setMarginV(Number(e.target.value))}
                    className="mt-2 w-full"
                  />
                </label>
              )}
            </div>
          )}

          <button
            type="button"
            onClick={() => void start()}
            disabled={coverMode !== "none" && regions.length === 0}
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
