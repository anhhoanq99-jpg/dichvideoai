"use client";

import { useEffect, useState } from "react";
import { Clapperboard, Save } from "lucide-react";
import {
  ASPECT_PRESETS,
  STYLE_PRESETS,
  estimateJobCredits,
  type CoverMode,
  type CoverRegion,
  type SubtitleSegment,
} from "@dichvideo/shared";
import { useJobRunner } from "@/hooks/use-job-runner";
import { JobDownloadLink, JobError, JobProgress } from "@/components/jobs/job-ui";
import { inputClass, optionCardClass, selectClass } from "@/components/ui/form-styles";
import type { Lang } from "@/lib/i18n";
import { RenderPreview } from "./render-preview";
import {
  DEFAULT_RENDER_SETTINGS,
  loadSavedPresets,
  lowestRegion,
  storeSavedPresets,
  styleFieldsFromPreset,
  type RenderSettings,
} from "./render-settings";
import { LogoFields } from "./logo-fields";
import { SubtitleStyleFields } from "./subtitle-style-fields";

/** dải đáy video — vị trí phụ đề gốc thường gặp */
const DEFAULT_BAND: CoverRegion = { x: 0.02, y: 0.78, w: 0.96, h: 0.16 };

const T = {
  vi: {
    coverOptions: [
      { value: "blur", label: "Làm mờ", hint: "Blur các vùng đã khoanh" },
      { value: "box", label: "Hộp tối", hint: "Che các vùng bằng nền tối" },
      { value: "none", label: "Không che", hint: "Video gốc không có chữ cứng" },
    ] as { value: CoverMode; label: string; hint: string }[],
    startFail: "Không bắt đầu được render",
    title: "Xuất video Việt hóa",
    setup: "Thiết lập render",
    rendering: "Đang render video…",
    download: "Tải video kết quả",
    coverLabel: "Che chữ nước ngoài gốc",
    coverHint:
      "Đã khoanh sẵn dải đáy video (chỗ phụ đề gốc thường nằm). Nếu chữ gốc ở chỗ khác, xóa vùng và kéo chuột khoanh lại — được nhiều vùng.",
    placeOver: "Đặt phụ đề Việt đè vào vùng che (thay đúng chỗ chữ gốc)",
    manualPos: "Vị trí phụ đề: đang chỉnh tay",
    resetAuto: "Đặt lại tự động",
    styleLabel: "Kiểu phụ đề:",
    aspectLabel: "Khung hình:",
    customize: "Tùy chỉnh chi tiết",
    savedPresets: "— Cài đặt đã lưu —",
    presetNamePh: "Tên cài đặt…",
    savePreset: "Lưu cài đặt",
    startRender: "Bắt đầu render",
    failed: "Render thất bại",
  },
  en: {
    coverOptions: [
      { value: "blur", label: "Blur", hint: "Blur the marked regions" },
      { value: "box", label: "Dark box", hint: "Cover regions with a dark box" },
      { value: "none", label: "No cover", hint: "Original video has no burned-in text" },
    ] as { value: CoverMode; label: string; hint: string }[],
    startFail: "Could not start the render",
    title: "Export localized video",
    setup: "Set up render",
    rendering: "Rendering video…",
    download: "Download result",
    coverLabel: "Cover original foreign text",
    coverHint:
      "The bottom band (where original subtitles usually sit) is pre-marked. If the text is elsewhere, delete the region and drag to redraw — multiple regions allowed.",
    placeOver: "Place translated subtitles over the covered area (right where the original text was)",
    manualPos: "Subtitle position: manually adjusted",
    resetAuto: "Reset to automatic",
    styleLabel: "Subtitle style:",
    aspectLabel: "Aspect ratio:",
    customize: "Advanced customization",
    savedPresets: "— Saved presets —",
    presetNamePh: "Preset name…",
    savePreset: "Save preset",
    startRender: "Start render",
    failed: "Render failed",
  },
} as const;

interface RenderPanelProps {
  videoId: string;
  translatedTrackId: string | null;
  durationSec: number | null;
  lang?: Lang;
}

export function RenderPanel({ videoId, translatedTrackId, durationSec, lang = "vi" }: RenderPanelProps) {
  const t = T[lang];
  const [open, setOpen] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [settings, setSettings] = useState<RenderSettings>(DEFAULT_RENDER_SETTINGS);
  const [regions, setRegions] = useState<CoverRegion[]>([DEFAULT_BAND]);
  // phụ đề dịch thật để chạy trong preview
  const [segments, setSegments] = useState<SubtitleSegment[]>([]);
  // user kéo phụ đề tới vị trí riêng → ưu tiên hơn vị trí tự động theo vùng che
  const [manualSubBox, setManualSubBox] = useState<CoverRegion | null>(null);
  // cài đặt đã lưu (localStorage)
  const [presetName, setPresetName] = useState("");
  // an toàn với SSR: panel đóng lúc hydrate nên select preset chưa render
  const [savedPresets, setSavedPresets] = useState<Record<string, RenderSettings>>(() =>
    typeof window === "undefined" ? {} : loadSavedPresets(),
  );
  const { job, jobId, running, error, resultKey, start } = useJobRunner();

  const patch = (p: Partial<RenderSettings>) =>
    setSettings((prev) => ({ ...prev, ...p }));

  useEffect(() => {
    if (open && !previewUrl) {
      fetch(`/api/videos/${videoId}/preview-url`)
        .then((res) => res.json())
        .then((data) => setPreviewUrl(data.url ?? null))
        .catch(() => {});
    }
  }, [open, previewUrl, videoId]);

  // nạp phụ đề dịch cho preview (một lần khi mở panel)
  useEffect(() => {
    if (!open || !translatedTrackId || segments.length > 0) return;
    fetch(`/api/tracks/${translatedTrackId}`)
      .then((res) => res.json())
      .then((track) => {
        if (Array.isArray(track.segments)) setSegments(track.segments);
      })
      .catch(() => {});
  }, [open, translatedTrackId, segments.length]);

  if (!translatedTrackId) return null;

  function savePreset() {
    const name = presetName.trim();
    if (!name) return;
    const next = { ...savedPresets, [name]: settings };
    setSavedPresets(next);
    storeSavedPresets(next);
    setPresetName("");
  }

  function pickCoverMode(mode: CoverMode) {
    patch({ coverMode: mode });
    // luôn có sẵn dải đáy để render được ngay, không bắt user khoanh tay
    if (mode !== "none" && regions.length === 0) setRegions([DEFAULT_BAND]);
  }

  const covering = settings.coverMode !== "none";
  // phụ đề Việt đè vào vùng che thấp nhất (thay chỗ chữ gốc) — tự động
  const replaceRegion =
    covering && settings.placeOver ? lowestRegion(regions) : null;
  const autoSubBox = replaceRegion
    ? { x: 0.05, y: replaceRegion.y, w: 0.9, h: replaceRegion.h }
    : null;
  // vị trí user kéo tay thắng vị trí tự động
  const effectiveSubBox = manualSubBox ?? autoSubBox;

  function startRender() {
    void start(
      `/api/videos/${videoId}/render`,
      {
        trackId: translatedTrackId,
        styleId: settings.styleId,
        aspect: settings.aspect,
        coverMode: settings.coverMode,
        ...(covering && regions.length > 0 ? { regions } : {}),
        ...(effectiveSubBox ? { subBox: effectiveSubBox } : {}),
        ...(settings.logoOn && settings.logoText.trim()
          ? {
              logo: {
                text: settings.logoText.trim(),
                position: settings.logoPosition,
                fontSize: settings.logoSize,
                color: settings.logoColor,
                opacity: settings.logoOpacity,
              },
            }
          : {}),
        ...(settings.customize
          ? {
              font: settings.font,
              fontSize: settings.fontSize,
              bold: settings.bold,
              primaryColor: settings.primaryColor,
              outlineColor: settings.outlineColor,
              boxed: settings.boxed,
              boxColor: settings.boxColor,
              boxOpacity: settings.boxOpacity,
              marginV: settings.marginV,
            }
          : {}),
      },
      t.startFail,
    );
  }

  return (
    <section className="rounded-lg border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900">
      <div className="flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-sm font-semibold">
          <Clapperboard className="h-4 w-4 text-primary-600 dark:text-primary-400" />
          {t.title}
        </h2>
        {!open && !running && (
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="rounded-md bg-primary-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-primary-700"
          >
            {t.setup}
          </button>
        )}
      </div>

      {running && (
        <JobProgress
          className="mt-3"
          label={t.rendering}
          progress={job?.progress ?? 0}
        />
      )}

      {job?.status === "done" && resultKey && jobId && (
        <JobDownloadLink jobId={jobId} label={t.download} />
      )}

      {open && !running && (
        <div className="mt-4 space-y-4">
          {/* Che chữ gốc */}
          <div>
            <p className="text-xs font-medium text-neutral-500 dark:text-neutral-400">
              {t.coverLabel}
            </p>
            <div className="mt-2 grid gap-2 sm:grid-cols-3">
              {t.coverOptions.map((o) => (
                <button
                  key={o.value}
                  type="button"
                  onClick={() => pickCoverMode(o.value)}
                  className={`p-2 ${optionCardClass(settings.coverMode === o.value)}`}
                >
                  <span className="block font-medium">{o.label}</span>
                  <span className="block text-xs text-neutral-500 dark:text-neutral-400">
                    {o.hint}
                  </span>
                </button>
              ))}
            </div>
            <p className="mt-1 text-xs text-neutral-400">
              {t.coverHint}
            </p>
          </div>

          {previewUrl && (
            <RenderPreview
              previewUrl={previewUrl}
              segments={segments}
              coverMode={settings.coverMode}
              regions={regions}
              onRegionsChange={setRegions}
              settings={settings}
              subBox={effectiveSubBox}
              onSubBoxChange={setManualSubBox}
              lang={lang}
            />
          )}

          <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
            {covering && (
              <label className="flex items-center gap-2 text-sm text-neutral-600 dark:text-neutral-300">
                <input
                  type="checkbox"
                  checked={settings.placeOver}
                  disabled={manualSubBox !== null}
                  onChange={(e) => patch({ placeOver: e.target.checked })}
                />
                {t.placeOver}
              </label>
            )}
            {manualSubBox && (
              <p className="flex items-center gap-2 text-sm text-primary-600 dark:text-primary-400">
                {t.manualPos}
                <button
                  type="button"
                  onClick={() => setManualSubBox(null)}
                  className="rounded border border-primary-300 px-2 py-0.5 text-xs hover:bg-primary-50 dark:border-primary-700 dark:hover:bg-primary-950/40"
                >
                  {t.resetAuto}
                </button>
              </p>
            )}
          </div>

          {/* Kiểu phụ đề */}
          <div className="flex flex-wrap items-center gap-4">
            <label className="text-sm">
              <span className="mr-2 text-neutral-500 dark:text-neutral-400">
                {t.styleLabel}
              </span>
              <select
                value={settings.styleId}
                onChange={(e) => patch(styleFieldsFromPreset(e.target.value))}
                className={selectClass}
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
                {t.aspectLabel}
              </span>
              <select
                value={settings.aspect}
                onChange={(e) => patch({ aspect: e.target.value })}
                className={selectClass}
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
                checked={settings.customize}
                onChange={(e) => {
                  patch({ customize: e.target.checked });
                  if (e.target.checked) patch(styleFieldsFromPreset(settings.styleId));
                }}
              />
              {t.customize}
            </label>
          </div>

          {settings.customize && (
            <SubtitleStyleFields
              settings={settings}
              onChange={patch}
              hideMarginV={effectiveSubBox !== null}
              lang={lang}
            />
          )}

          {/* Logo / watermark của kênh */}
          <LogoFields settings={settings} onChange={patch} lang={lang} />

          {/* Cài đặt đã lưu */}
          <div className="flex flex-wrap items-center gap-2">
            {Object.keys(savedPresets).length > 0 && (
              <select
                defaultValue=""
                onChange={(e) => {
                  const saved = savedPresets[e.target.value];
                  if (saved) setSettings(saved);
                  e.target.value = "";
                }}
                className={selectClass}
              >
                <option value="">{t.savedPresets}</option>
                {Object.keys(savedPresets).map((name) => (
                  <option key={name} value={name}>
                    {name}
                  </option>
                ))}
              </select>
            )}
            <input
              value={presetName}
              onChange={(e) => setPresetName(e.target.value)}
              placeholder={t.presetNamePh}
              className={`w-36 ${inputClass}`}
            />
            <button
              type="button"
              onClick={savePreset}
              disabled={!presetName.trim()}
              className="flex items-center gap-1 rounded-md border border-neutral-300 px-3 py-1.5 text-sm hover:bg-neutral-100 disabled:opacity-50 dark:border-neutral-700 dark:hover:bg-neutral-800"
            >
              <Save className="h-3.5 w-3.5" /> {t.savePreset}
            </button>
          </div>

          <button
            type="button"
            onClick={startRender}
            disabled={covering && regions.length === 0}
            className="rounded-md bg-primary-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {t.startRender}
            {durationSec
              ? ` — ${estimateJobCredits("render", { durationSec }).toLocaleString("vi-VN")} credits`
              : ""}
          </button>
        </div>
      )}

      <JobError className="mt-3" error={error} job={job} fallback={t.failed} />
    </section>
  );
}
