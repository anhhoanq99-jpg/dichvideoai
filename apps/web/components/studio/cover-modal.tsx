"use client";

import { Droplets } from "lucide-react";
import type { CoverMode, CoverRegion } from "@dichvideo/shared";
import { Modal } from "@/components/ui/modal";
import { fieldLabelClass, optionCardClass } from "@/components/ui/form-styles";
import type { Lang } from "@/lib/i18n";
import {
  DEFAULT_BAND,
  type RenderSettings,
} from "@/components/render/render-settings";

/** dải đáy video — vị trí phụ đề gốc thường gặp */

const T = {
  vi: {
    coverOptions: [
      { value: "blur", label: "Làm mờ", hint: "Blur các vùng đã khoanh" },
      { value: "box", label: "Hộp tối", hint: "Che các vùng bằng nền tối" },
      { value: "none", label: "Không che", hint: "Video gốc không có chữ cứng" },
    ] as { value: CoverMode; label: string; hint: string }[],
    coverTitle: "Cấu hình Làm mờ",
    coverRegions: "vùng",
    blurLevel: "Mức làm mờ:",
    blurLight: "(nhẹ)",
    blurHeavy: "(đậm)",
    blurLightEnd: "Nhẹ",
    blurHeavyEnd: "Đậm",
    placeOver: "Chèn phụ đề lên vùng làm mờ (thay đúng chỗ chữ gốc)",
    manualPos: "Vị trí phụ đề: đang chỉnh tay",
    resetAuto: "Đặt lại tự động",
    coverHint:
      "Vùng che chỉnh trực tiếp trên khung video: kéo để di chuyển, kéo trên nền trống để khoanh vùng mới (tối đa 10), nút đỏ dưới video để xóa. Mức mờ xem trước ngay trên video.",
  },
  en: {
    coverOptions: [
      { value: "blur", label: "Blur", hint: "Blur the marked regions" },
      { value: "box", label: "Dark box", hint: "Cover regions with a dark box" },
      { value: "none", label: "No cover", hint: "Original video has no burned-in text" },
    ] as { value: CoverMode; label: string; hint: string }[],
    coverTitle: "Cover settings",
    coverRegions: "regions",
    blurLevel: "Blur strength:",
    blurLight: "(light)",
    blurHeavy: "(strong)",
    blurLightEnd: "Light",
    blurHeavyEnd: "Strong",
    placeOver: "Place subtitles over the covered area (right where the original text was)",
    manualPos: "Subtitle position: manually adjusted",
    resetAuto: "Reset to automatic",
    coverHint:
      "Adjust cover regions directly on the video frame: drag to move, drag on empty space to draw a new region (max 10), red buttons below the video to delete. Blur strength previews live on the video.",
  },
} as const;

interface CoverModalProps {
  settings: RenderSettings;
  onChange: (patch: Partial<RenderSettings>) => void;
  regions: CoverRegion[];
  onRegionsChange: (regions: CoverRegion[]) => void;
  /** khung phụ đề đang chỉnh tay (null = tự động theo vùng che) */
  manualSubBox: CoverRegion | null;
  onManualSubBoxChange: (box: CoverRegion | null) => void;
  onClose: () => void;
  lang?: Lang;
}

/** Modal cấu hình che chữ gốc trên video: chế độ che, mức mờ, vị trí phụ đề đè. */
export function CoverModal({
  settings,
  onChange,
  regions,
  onRegionsChange,
  manualSubBox,
  onManualSubBoxChange,
  onClose,
  lang = "vi",
}: CoverModalProps) {
  const t = T[lang];
  return (
    <Modal
      title={
        <>
          <Droplets className="h-4 w-4 text-primary-500" /> {t.coverTitle} ({regions.length}{" "}
          {t.coverRegions})
        </>
      }
      onClose={onClose}
      lang={lang}
    >
      <div className="space-y-4">
        <div className="grid gap-2 sm:grid-cols-3">
          {t.coverOptions.map((o) => (
            <button
              key={o.value}
              type="button"
              onClick={() => {
                onChange({ coverMode: o.value });
                if (o.value !== "none" && regions.length === 0)
                  onRegionsChange([DEFAULT_BAND]);
              }}
              className={`p-2 ${optionCardClass(settings.coverMode === o.value)}`}
            >
              <span className="block font-medium">{o.label}</span>
              <span className="block text-xs text-neutral-500 dark:text-neutral-400">
                {o.hint}
              </span>
            </button>
          ))}
        </div>

        {settings.coverMode === "blur" && (
          <label className="block text-sm">
            <span className={fieldLabelClass}>
              {t.blurLevel} {settings.blurStrength}/10{" "}
              {settings.blurStrength <= 3
                ? t.blurLight
                : settings.blurStrength >= 8
                  ? t.blurHeavy
                  : ""}
            </span>
            <div className="mt-2 flex items-center gap-2 text-xs text-neutral-400">
              {t.blurLightEnd}
              <input
                type="range"
                min={1}
                max={10}
                value={settings.blurStrength}
                onChange={(e) => onChange({ blurStrength: Number(e.target.value) })}
                className="w-full"
              />
              {t.blurHeavyEnd}
            </div>
          </label>
        )}

        {settings.coverMode !== "none" && (
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
            <label className="flex items-center gap-2 text-sm text-neutral-600 dark:text-neutral-300">
              <input
                type="checkbox"
                checked={settings.placeOver}
                disabled={manualSubBox !== null}
                onChange={(e) => onChange({ placeOver: e.target.checked })}
              />
              {t.placeOver}
            </label>
            {manualSubBox && (
              <p className="flex items-center gap-2 text-sm text-primary-600 dark:text-primary-400">
                {t.manualPos}
                <button
                  type="button"
                  onClick={() => onManualSubBoxChange(null)}
                  className="rounded border border-primary-300 px-2 py-0.5 text-xs hover:bg-primary-50 dark:border-primary-700 dark:hover:bg-primary-950/40"
                >
                  {t.resetAuto}
                </button>
              </p>
            )}
          </div>
        )}

        <p className="text-xs text-neutral-400">{t.coverHint}</p>
      </div>
    </Modal>
  );
}
