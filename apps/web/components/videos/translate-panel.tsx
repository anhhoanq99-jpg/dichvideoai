"use client";

import { useState } from "react";
import { Languages, PencilLine } from "lucide-react";
import Link from "next/link";
import { useJobRunner } from "@/hooks/use-job-runner";
import { JobError, JobProgress } from "@/components/jobs/job-ui";
import { selectClass } from "@/components/ui/form-styles";
import type { Lang } from "@/lib/i18n";

const T = {
  vi: {
    styles: [
      { value: "natural", label: "Tự nhiên (khuyên dùng)" },
      { value: "formal", label: "Trang trọng" },
      { value: "literal", label: "Sát nghĩa" },
    ],
    title: "Dịch sang tiếng Việt",
    openEditor: "Mở trình chỉnh sửa",
    translating: "Đang dịch…",
    styleLabel: "Phong cách:",
    hideGlossary: "Ẩn thuật ngữ",
    showGlossary: "+ Thuật ngữ / tên nhân vật",
    glossaryPh:
      "Mỗi dòng một cặp: thuật ngữ=bản dịch\nVí dụ:\n叶凡=Diệp Phàm\nsenpai=tiền bối",
    glossaryHint: "AI sẽ tuân theo bảng này để đồng nhất tên nhân vật và thuật ngữ.",
    errStart: "Không bắt đầu được dịch",
    retranslate: "Dịch lại",
    translate: "Dịch sang tiếng Việt",
    overwriteWarning:
      "Lưu ý: dịch lại sẽ ghi đè bản dịch hiện tại (kể cả các chỉnh sửa tay).",
    errFallback: "Dịch thất bại",
  },
  en: {
    styles: [
      { value: "natural", label: "Natural (recommended)" },
      { value: "formal", label: "Formal" },
      { value: "literal", label: "Literal" },
    ],
    title: "Translate to Vietnamese",
    openEditor: "Open editor",
    translating: "Translating…",
    styleLabel: "Style:",
    hideGlossary: "Hide glossary",
    showGlossary: "+ Glossary / character names",
    glossaryPh:
      "One pair per line: term=translation\nExample:\n叶凡=Diep Pham\nsenpai=senior",
    glossaryHint: "The AI follows this table to keep names and terms consistent.",
    errStart: "Could not start translation",
    retranslate: "Retranslate",
    translate: "Translate to Vietnamese",
    overwriteWarning:
      "Note: retranslating overwrites the current translation (including manual edits).",
    errFallback: "Translation failed",
  },
} as const;

interface TranslatePanelProps {
  videoId: string;
  hasOriginalTrack: boolean;
  hasTranslatedTrack: boolean;
  initialGlossary: string | null;
  lang?: Lang;
}

export function TranslatePanel({
  videoId,
  hasOriginalTrack,
  hasTranslatedTrack,
  initialGlossary,
  lang = "vi",
}: TranslatePanelProps) {
  const t = T[lang];
  const [style, setStyle] = useState<string>("natural");
  const [glossary, setGlossary] = useState(initialGlossary ?? "");
  const [showGlossary, setShowGlossary] = useState(false);
  const { job, running, error, start } = useJobRunner();

  if (!hasOriginalTrack) return null;

  return (
    <section className="rounded-lg border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900">
      <div className="flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-sm font-semibold">
          <Languages className="h-4 w-4 text-primary-600 dark:text-primary-400" />
          {t.title}
        </h2>
        {hasTranslatedTrack && !running && (
          <Link
            href={`/videos/${videoId}/editor`}
            className="inline-flex items-center gap-1.5 rounded-md bg-primary-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-primary-700"
          >
            <PencilLine className="h-4 w-4" /> {t.openEditor}
          </Link>
        )}
      </div>

      {running ? (
        <JobProgress className="mt-3" label={t.translating} progress={job?.progress ?? 0} />
      ) : (
        <div className="mt-3 space-y-3">
          <div className="flex flex-wrap items-center gap-3">
            <label className="text-sm text-neutral-600 dark:text-neutral-300">
              {t.styleLabel}
            </label>
            <select
              value={style}
              onChange={(e) => setStyle(e.target.value)}
              className={selectClass}
            >
              {t.styles.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={() => setShowGlossary((v) => !v)}
              className="text-sm text-primary-600 hover:underline dark:text-primary-400"
            >
              {showGlossary ? t.hideGlossary : t.showGlossary}
            </button>
          </div>

          {showGlossary && (
            <div>
              <textarea
                value={glossary}
                onChange={(e) => setGlossary(e.target.value)}
                rows={4}
                placeholder={t.glossaryPh}
                className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-800"
              />
              <p className="mt-1 text-xs text-neutral-400">
                {t.glossaryHint}
              </p>
            </div>
          )}

          <button
            type="button"
            onClick={() =>
              void start(
                `/api/videos/${videoId}/translate`,
                { style, ...(glossary.trim() ? { glossary } : {}) },
                t.errStart,
              )
            }
            className="rounded-md bg-primary-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-primary-700"
          >
            {hasTranslatedTrack ? t.retranslate : t.translate}
          </button>
          {hasTranslatedTrack && (
            <p className="text-xs text-amber-600 dark:text-amber-400">
              {t.overwriteWarning}
            </p>
          )}
        </div>
      )}

      <JobError className="mt-3" error={error} job={job} fallback={t.errFallback} />
    </section>
  );
}
