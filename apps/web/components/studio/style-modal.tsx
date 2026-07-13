"use client";

import { Type } from "lucide-react";
import { ASPECT_PRESETS, STYLE_PRESETS } from "@dichvideo/shared";
import { Modal } from "@/components/ui/modal";
import { fieldLabelClass, selectClass } from "@/components/ui/form-styles";
import type { Lang } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import {
  styleFieldsFromPreset,
  type RenderSettings,
} from "@/components/render/render-settings";
import { SubtitleStyleFields } from "@/components/render/subtitle-style-fields";

const T = {
  vi: {
    styleTitle: "Kiểu phụ đề",
    stylePreset: "Mẫu có sẵn",
    aspect: "Khung hình",
    styleHint:
      "Mọi thay đổi hiện ngay trên khung xem trước. Kéo phụ đề trên video để đổi vị trí; vị trí đè vùng che chỉnh trong nút “Làm mờ”.",
  },
  en: {
    styleTitle: "Subtitle style",
    stylePreset: "Presets",
    aspect: "Aspect ratio",
    styleHint:
      "Every change shows instantly in the preview. Drag the subtitles on the video to reposition; overlay-on-cover position is set in the “Blur” button.",
  },
} as const;

interface StyleModalProps {
  settings: RenderSettings;
  onChange: (patch: Partial<RenderSettings>) => void;
  /** ẩn thanh chỉnh lề dưới khi phụ đề đang neo theo vùng che */
  hideMarginV: boolean;
  onClose: () => void;
  lang?: Lang;
}

/** Modal chỉnh kiểu phụ đề: mẫu có sẵn, khung hình và các trường chi tiết. */
export function StyleModal({
  settings,
  onChange,
  hideMarginV,
  onClose,
  lang = "vi",
}: StyleModalProps) {
  const t = T[lang];
  return (
    <Modal
      title={
        <>
          <Type className="h-4 w-4 text-primary-500" /> {t.styleTitle}
        </>
      }
      onClose={onClose}
      wide
      lang={lang}
    >
      <div className="space-y-4">
        <div className="flex flex-wrap items-center gap-4">
          <label className="text-sm">
            <span className={fieldLabelClass}>{t.stylePreset}</span>
            <select
              value={settings.styleId}
              onChange={(e) => onChange(styleFieldsFromPreset(e.target.value))}
              className={cn(selectClass, "mt-1")}
            >
              {STYLE_PRESETS.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm">
            <span className={fieldLabelClass}>{t.aspect}</span>
            <select
              value={settings.aspect}
              onChange={(e) => onChange({ aspect: e.target.value })}
              className={cn(selectClass, "mt-1")}
            >
              {ASPECT_PRESETS.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </select>
          </label>
        </div>

        <SubtitleStyleFields
          settings={settings}
          onChange={onChange}
          hideMarginV={hideMarginV}
          lang={lang}
        />

        <p className="text-xs text-neutral-400">{t.styleHint}</p>
      </div>
    </Modal>
  );
}
