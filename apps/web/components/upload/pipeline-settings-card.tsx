"use client";

import { BookOpen } from "lucide-react";
import {
  TARGET_LANGS,
  TRANSLATION_STYLES,
  type TargetLangId,
  type TranslationStyleId,
} from "@dichvideo/shared";
import { fieldLabelClass, optionCardClass, selectClass } from "@/components/ui/form-styles";
import type { PipelineSettings } from "@/hooks/use-multipart-upload";
import type { Lang } from "@/lib/i18n";
import { cn } from "@/lib/utils";

const T = {
  vi: {
    sourceOptions: [
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
    ],
    langOptions: [
      { value: "", label: "Tự nhận diện" },
      { value: "zh", label: "中文 (Trung)" },
      { value: "en", label: "English (Anh)" },
      { value: "ja", label: "日本語 (Nhật)" },
      { value: "ko", label: "한국어 (Hàn)" },
      { value: "th", label: "ไทย (Thái)" },
    ],
    sourceLang: "Ngôn ngữ gốc",
    targetLang: "Dịch sang",
    style: "Phong cách dịch",
    previewNote:
      "Dịch xong sẽ mở trình chỉnh sửa: xem trước video với phụ đề, chỉnh vùng che / kiểu chữ / lồng tiếng theo ý rồi mới xuất — credits chỉ trừ khi xuất.",
    glossarySummary: "Từ điển & nhân vật (tùy chọn)",
    glossaryPh:
      "Mỗi dòng một quy tắc, ví dụ:\n咪 = Mi (tên mèo, xưng hô: hoàng thượng)\n主人 = con sen",
  },
  en: {
    sourceOptions: [
      {
        value: "ocr" as const,
        label: "OCR — video has on-screen text",
        hint: "AI reads hardcoded subtitles from the frames",
      },
      {
        value: "stt" as const,
        label: "Audio — speech only",
        hint: "AI listens to the speech and generates subtitles",
      },
    ],
    langOptions: [
      { value: "", label: "Auto-detect" },
      { value: "zh", label: "中文 (Chinese)" },
      { value: "en", label: "English" },
      { value: "ja", label: "日本語 (Japanese)" },
      { value: "ko", label: "한국어 (Korean)" },
      { value: "th", label: "ไทย (Thai)" },
    ],
    sourceLang: "Source language",
    targetLang: "Translate to",
    style: "Translation style",
    previewNote:
      "When translation finishes, the editor opens: preview the video with subtitles, tweak masking / typography / dubbing, then export — credits are only charged on export.",
    glossarySummary: "Glossary & characters (optional)",
    glossaryPh:
      "One rule per line, e.g.:\n咪 = Mi (cat's name, addressed as: your majesty)\n主人 = servant",
  },
} as const;

const STYLE_OPTIONS = TRANSLATION_STYLES.filter((s) => s.id !== "custom");

/** Thiết lập pipeline người dùng chọn ở trang upload (áp cho cả loạt video). */
export interface UploadPipelineValues {
  method: "ocr" | "stt";
  sourceLang: string;
  targetLang: TargetLangId;
  style: TranslationStyleId;
  glossary: string;
}

export const DEFAULT_PIPELINE_VALUES: UploadPipelineValues = {
  method: "ocr",
  sourceLang: "",
  targetLang: "vi",
  style: "natural",
  glossary: "",
};

/** Chuyển giá trị form → payload pipeline gửi API (upload tay + nhập link dùng chung). */
export function toPipelineSettings(v: UploadPipelineValues): PipelineSettings {
  return {
    method: v.method,
    ...(v.sourceLang ? { sourceLang: v.sourceLang } : {}),
    targetLang: v.targetLang,
    style: v.style,
    ...(v.glossary.trim() ? { glossary: v.glossary.trim() } : {}),
  };
}

interface PipelineSettingsCardProps {
  values: UploadPipelineValues;
  onChange: (patch: Partial<UploadPipelineValues>) => void;
  disabled: boolean;
  lang?: Lang;
}

/** Card thiết lập chung: nguồn phụ đề, ngôn ngữ, phong cách, hoàn thiện tự động. */
export function PipelineSettingsCard({
  values,
  onChange,
  disabled,
  lang = "vi",
}: PipelineSettingsCardProps) {
  const t = T[lang];
  return (
    <div className="space-y-4 rounded-xl border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900">
      <div className="grid gap-3 sm:grid-cols-2">
        {t.sourceOptions.map((o) => (
          <button
            key={o.value}
            type="button"
            disabled={disabled}
            onClick={() => onChange({ method: o.value })}
            className={optionCardClass(values.method === o.value)}
          >
            <span className="block font-medium">{o.label}</span>
            <span className="block text-xs text-neutral-500 dark:text-neutral-400">
              {o.hint}
            </span>
          </button>
        ))}
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <label className="text-sm">
          <span className={cn(fieldLabelClass, "font-medium")}>{t.sourceLang}</span>
          <select
            value={values.sourceLang}
            disabled={disabled}
            onChange={(e) => onChange({ sourceLang: e.target.value })}
            className={cn(selectClass, "mt-1 w-full py-2")}
          >
            {t.langOptions.map((l) => (
              <option key={l.value} value={l.value}>
                {l.label}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm">
          <span className={cn(fieldLabelClass, "font-medium")}>{t.targetLang}</span>
          <select
            value={values.targetLang}
            disabled={disabled}
            onChange={(e) => onChange({ targetLang: e.target.value as TargetLangId })}
            className={cn(selectClass, "mt-1 w-full py-2")}
          >
            {TARGET_LANGS.map((l) => (
              <option key={l.id} value={l.id}>
                {l.name}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm">
          <span className={cn(fieldLabelClass, "font-medium")}>{t.style}</span>
          <select
            value={values.style}
            disabled={disabled}
            onChange={(e) => onChange({ style: e.target.value as TranslationStyleId })}
            className={cn(selectClass, "mt-1 w-full py-2")}
          >
            {STYLE_OPTIONS.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </label>
      </div>

      <p className="rounded-lg bg-primary-50/60 px-3 py-2 text-xs text-primary-700 dark:bg-primary-950/30 dark:text-primary-300">
        {t.previewNote}
      </p>

      <details>
        <summary className="flex cursor-pointer items-center gap-2 text-sm text-neutral-600 dark:text-neutral-300">
          <BookOpen className="h-4 w-4" /> {t.glossarySummary}
        </summary>
        <textarea
          value={values.glossary}
          disabled={disabled}
          onChange={(e) => onChange({ glossary: e.target.value })}
          placeholder={t.glossaryPh}
          rows={4}
          className="mt-2 w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-800"
        />
      </details>
    </div>
  );
}
