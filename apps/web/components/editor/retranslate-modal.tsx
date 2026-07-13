"use client";

import { useState } from "react";
import { Loader2, Sparkles, X } from "lucide-react";
import {
  TARGET_LANGS,
  TRANSLATION_STYLES,
  type TargetLangId,
  type TranslationStyleId,
} from "@dichvideo/shared";
import { useJobRunner } from "@/hooks/use-job-runner";
import { JobError } from "@/components/jobs/job-ui";
import type { Lang } from "@/lib/i18n";
import { fieldLabelClass, selectClass } from "@/components/ui/form-styles";
import { cn } from "@/lib/utils";

const T = {
  vi: {
    title: "Dịch lại bằng AI",
    describeStyle: "Hãy mô tả phong cách dịch bạn muốn",
    startFail: "Không bắt đầu được",
    translating: (n: number) => `Đang dịch lại ${n} dòng…`,
    autoReload: "Xong sẽ tự tải lại trang với bản dịch mới.",
    targetLang: "Dịch sang",
    style: "Phong cách dịch",
    customPh:
      "Mô tả phong cách bạn muốn, vd: dịch kiểu giọng miền Nam thân mật, xưng tui - bà...",
    overwriteWarn:
      "Bản dịch hiện tại (kể cả chỗ bạn đã sửa tay) sẽ bị thay bằng bản dịch mới.",
    failed: "Dịch thất bại",
    cancel: "Hủy",
    retranslateAll: "Dịch lại toàn bộ",
  },
  en: {
    title: "Retranslate with AI",
    describeStyle: "Please describe the translation style you want",
    startFail: "Could not start",
    translating: (n: number) => `Retranslating ${n} lines…`,
    autoReload: "The page will reload automatically with the new translation.",
    targetLang: "Translate to",
    style: "Translation style",
    customPh:
      "Describe the style you want, e.g.: casual friendly tone, keep slang natural...",
    overwriteWarn:
      "The current translation (including your manual edits) will be replaced by the new one.",
    failed: "Translation failed",
    cancel: "Cancel",
    retranslateAll: "Retranslate all",
  },
} as const;

interface RetranslateModalProps {
  videoId: string;
  lineCount: number;
  onClose: () => void;
  lang?: Lang;
}

/** Dịch lại toàn bộ bằng AI với phong cách chọn được (ghi đè bản dịch hiện tại). */
export function RetranslateModal({ videoId, lineCount, onClose, lang = "vi" }: RetranslateModalProps) {
  const t = T[lang];
  const [style, setStyle] = useState<TranslationStyleId>("natural");
  const [targetLang, setTargetLang] = useState<TargetLangId>("vi");
  const [customPrompt, setCustomPrompt] = useState("");
  // bản dịch mới đã lưu server-side — nạp lại trang để đồng bộ editor
  const { job, running, error, setError, start } = useJobRunner({ onDone: "reload" });

  async function startRetranslate() {
    if (style === "custom" && !customPrompt.trim()) {
      setError(t.describeStyle);
      return;
    }
    await start(
      `/api/videos/${videoId}/translate`,
      {
        style,
        targetLang,
        ...(style === "custom" ? { customPrompt: customPrompt.trim() } : {}),
      },
      t.startFail,
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-xl border border-neutral-200 bg-white p-5 shadow-xl dark:border-neutral-800 dark:bg-neutral-900">
        <div className="flex items-center justify-between">
          <h3 className="flex items-center gap-2 text-sm font-semibold">
            <Sparkles className="h-4 w-4 text-accent-500" /> {t.title}
          </h3>
          <button
            type="button"
            onClick={onClose}
            disabled={running}
            className="rounded p-1 text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {running ? (
          <div className="mt-5 space-y-3 text-center">
            <p className="flex items-center justify-center gap-2 text-sm">
              <Loader2 className="h-4 w-4 animate-spin" />
              {t.translating(lineCount)} {job?.progress ?? 0}%
            </p>
            <div className="h-2 overflow-hidden rounded-full bg-neutral-100 dark:bg-neutral-800">
              <div
                className="h-full rounded-full bg-accent-600 transition-all"
                style={{ width: `${job?.progress ?? 0}%` }}
              />
            </div>
            <p className="text-xs text-neutral-400">
              {t.autoReload}
            </p>
          </div>
        ) : (
          <div className="mt-4 space-y-3">
            <label className="block text-sm">
              <span className={cn(fieldLabelClass, "font-medium")}>
                {t.targetLang}
              </span>
              <select
                value={targetLang}
                onChange={(e) => setTargetLang(e.target.value as TargetLangId)}
                className={cn(selectClass, "mt-1 w-full")}
              >
                {TARGET_LANGS.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-sm">
              <span className={cn(fieldLabelClass, "font-medium")}>
                {t.style}
              </span>
              <select
                value={style}
                onChange={(e) => setStyle(e.target.value as TranslationStyleId)}
                className={cn(selectClass, "mt-1 w-full")}
              >
                {TRANSLATION_STYLES.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
              <span className="mt-1 block text-xs text-neutral-400">
                {TRANSLATION_STYLES.find((s) => s.id === style)?.hint}
              </span>
            </label>

            {style === "custom" && (
              <textarea
                value={customPrompt}
                onChange={(e) => setCustomPrompt(e.target.value)}
                rows={3}
                placeholder={t.customPh}
                className="w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-800"
              />
            )}

            <p className="rounded-md bg-amber-50 px-3 py-2 text-xs text-amber-700 dark:bg-amber-950/40 dark:text-amber-300">
              {t.overwriteWarn}
            </p>

            <JobError error={error} job={job} fallback={t.failed} />

            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={onClose}
                className="rounded-md border border-neutral-300 px-4 py-2 text-sm dark:border-neutral-700"
              >
                {t.cancel}
              </button>
              <button
                type="button"
                onClick={() => void startRetranslate()}
                className="rounded-md bg-accent-600 px-4 py-2 text-sm font-medium text-white hover:bg-accent-700"
              >
                {t.retranslateAll}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
