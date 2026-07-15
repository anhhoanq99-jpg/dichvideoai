"use client";

import { RENDER_FONTS, SUB_EFFECT_IDS, type SubEffect } from "@dichvideo/shared";
import {
  colorInputClass,
  fieldLabelClass,
  selectClass,
} from "@/components/ui/form-styles";
import type { Lang } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import type { RenderSettings } from "./render-settings";

const T = {
  vi: {
    font: "Font chữ",
    fontSize: "Cỡ chữ",
    bold: "Chữ đậm",
    textColor: "Màu chữ",
    outlineColor: "Màu viền",
    boxed: "Ô nền sau chữ",
    boxColor: "Màu ô nền",
    boxOpacity: "Độ phủ ô nền",
    boxOpacityFull: "(che kín chữ gốc)",
    marginV: "Vị trí (cách đáy)",
    effect: "Hiệu ứng chữ",
    effectNames: {
      none: "Không",
      fade: "Hiện dần",
      pop: "Phóng nhẹ khi vào",
      karaoke: "Karaoke — màu chạy theo giọng đọc",
    } as Record<SubEffect, string>,
  },
  en: {
    font: "Font",
    fontSize: "Font size",
    bold: "Bold",
    textColor: "Text color",
    outlineColor: "Outline color",
    boxed: "Background box",
    boxOpacity: "Box opacity",
    boxColor: "Box color",
    boxOpacityFull: "(fully covers original text)",
    marginV: "Position (from bottom)",
    effect: "Text effect",
    effectNames: {
      none: "None",
      fade: "Fade in",
      pop: "Pop in",
      karaoke: "Karaoke — color follows the voice",
    } as Record<SubEffect, string>,
  },
} as const;

interface SubtitleStyleFieldsProps {
  settings: RenderSettings;
  onChange: (patch: Partial<RenderSettings>) => void;
  /** phụ đề đang đè vào vùng che → ẩn thanh chỉnh vị trí đáy */
  hideMarginV: boolean;
  lang?: Lang;
}

/** Lưới tùy chỉnh chi tiết kiểu phụ đề (font, cỡ, màu, ô nền, vị trí). */
export function SubtitleStyleFields({
  settings,
  onChange,
  hideMarginV,
  lang = "vi",
}: SubtitleStyleFieldsProps) {
  const t = T[lang];
  return (
    <div className="grid gap-4 rounded-lg border border-neutral-200 p-3 sm:grid-cols-2 lg:grid-cols-3 dark:border-neutral-700">
      <label className="text-sm">
        <span className={fieldLabelClass}>{t.font}</span>
        <select
          value={settings.font}
          onChange={(e) => onChange({ font: e.target.value })}
          className={cn(selectClass, "mt-1 w-full")}
        >
          {RENDER_FONTS.map((font) => (
            <option key={font} value={font}>
              {font}
            </option>
          ))}
        </select>
      </label>
      <label className="text-sm">
        <span className={fieldLabelClass}>{t.fontSize}: {settings.fontSize}</span>
        <input
          type="range"
          min={20}
          max={120}
          value={settings.fontSize}
          onChange={(e) => onChange({ fontSize: Number(e.target.value) })}
          className="mt-2 w-full"
        />
      </label>
      <label className="text-sm">
        <span className={fieldLabelClass}>{t.effect}</span>
        <select
          value={settings.effect}
          onChange={(e) => onChange({ effect: e.target.value as SubEffect })}
          className={cn(selectClass, "mt-1 w-full")}
        >
          {SUB_EFFECT_IDS.map((id) => (
            <option key={id} value={id}>
              {t.effectNames[id]}
            </option>
          ))}
        </select>
      </label>
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={settings.bold}
          onChange={(e) => onChange({ bold: e.target.checked })}
        />
        {t.bold}
      </label>
      <label className="flex items-center gap-2 text-sm">
        <span className={fieldLabelClass}>{t.textColor}</span>
        <input
          type="color"
          value={settings.primaryColor}
          onChange={(e) => onChange({ primaryColor: e.target.value.toUpperCase() })}
          className={colorInputClass}
        />
      </label>
      <label className="flex items-center gap-2 text-sm">
        <span className={fieldLabelClass}>{t.outlineColor}</span>
        <input
          type="color"
          value={settings.outlineColor}
          onChange={(e) => onChange({ outlineColor: e.target.value.toUpperCase() })}
          className={colorInputClass}
        />
      </label>
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={settings.boxed}
          onChange={(e) => onChange({ boxed: e.target.checked })}
        />
        {t.boxed}
      </label>
      {settings.boxed && (
        <>
          <label className="flex items-center gap-2 text-sm">
            <span className={fieldLabelClass}>{t.boxColor}</span>
            <input
              type="color"
              value={settings.boxColor}
              onChange={(e) => onChange({ boxColor: e.target.value.toUpperCase() })}
              className={colorInputClass}
            />
          </label>
          <label className="text-sm">
            <span className={fieldLabelClass}>
              {t.boxOpacity}: {settings.boxOpacity}%{" "}
              {settings.boxOpacity === 100 ? t.boxOpacityFull : ""}
            </span>
            <input
              type="range"
              min={20}
              max={100}
              value={settings.boxOpacity}
              onChange={(e) => onChange({ boxOpacity: Number(e.target.value) })}
              className="mt-2 w-full"
            />
          </label>
        </>
      )}
      {!hideMarginV && (
        <label className="text-sm">
          <span className={fieldLabelClass}>
            {t.marginV}: {settings.marginV}px
          </span>
          <input
            type="range"
            min={0}
            max={400}
            value={settings.marginV}
            onChange={(e) => onChange({ marginV: Number(e.target.value) })}
            className="mt-2 w-full"
          />
        </label>
      )}
    </div>
  );
}
