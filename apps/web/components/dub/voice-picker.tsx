"use client";

import { useMemo, useRef, useState } from "react";
import { Loader2, Play } from "lucide-react";
import {
  DUB_VOICES,
  EDGE_VOICES,
  ELEVEN_VOICES,
  GCLOUD_VOICES,
  GEMINI_VOICES,
  type VoiceProvider,
} from "@dichvideo/shared";
import { fieldLabelClass, selectClass } from "@/components/ui/form-styles";
import type { Lang } from "@/lib/i18n";
import { cn } from "@/lib/utils";

/** Bộ lọc + giọng đang chọn — dùng chung cho panel lồng tiếng và studio. */
export interface VoiceSelection {
  provider: VoiceProvider;
  locale: string;
  gender: "all" | "F" | "M";
  voice: string;
}

const T = {
  vi: {
    providerOptions: [
      { value: "edge", label: "Giọng thường — miễn phí (322 giọng, mọi quốc gia)" },
      {
        value: "gcloud",
        label: `Google Cloud — ${GCLOUD_VOICES.length} giọng Việt (key riêng, free 1-4tr ký tự/tháng)`,
      },
      {
        value: "eleven",
        label: `ElevenLabs — Adam, Rachel... (${ELEVEN_VOICES.length} giọng, key riêng, free ~10 phút/tháng)`,
      },
      {
        value: "gemini",
        label: `Giọng cao cấp AI — tiếng Việt diễn cảm (${GEMINI_VOICES.length} giọng, tính phí API)`,
      },
    ] as { value: VoiceProvider; label: string }[],
    providerLabel: "Loại giọng",
    elevenHint:
      "Cần ELEVENLABS_API_KEY trong .env (đăng ký free tại elevenlabs.io). Giọng gốc tiếng Anh, đọc tiếng Việt qua model multilingual.",
    gcloudHint:
      "Cần GOOGLE_TTS_API_KEY trong .env (bật Text-to-Speech API trong Google Cloud Console — có hạn mức miễn phí hằng tháng).",
    localeLabel: "Quốc gia / ngôn ngữ",
    gender: "Giới tính",
    genderAll: "Tất cả",
    genderF: "Nữ",
    genderM: "Nam",
    voiceLabel: (n: number) => `Giọng đọc (${n} giọng)`,
    previewTitle: "Nghe thử giọng này",
    preview: "Nghe thử",
    previewError: "Không phát được mẫu giọng — thử lại",
  },
  en: {
    providerOptions: [
      { value: "edge", label: "Standard voices — free (322 voices, every country)" },
      {
        value: "gcloud",
        label: `Google Cloud — ${GCLOUD_VOICES.length} Vietnamese voices (own key, free 1-4M chars/month)`,
      },
      {
        value: "eleven",
        label: `ElevenLabs — Adam, Rachel... (${ELEVEN_VOICES.length} voices, own key, free ~10 min/month)`,
      },
      {
        value: "gemini",
        label: `Premium AI voices — expressive (${GEMINI_VOICES.length} voices, API charges apply)`,
      },
    ] as { value: VoiceProvider; label: string }[],
    providerLabel: "Voice type",
    elevenHint:
      "Requires ELEVENLABS_API_KEY in .env (free signup at elevenlabs.io). English-native voices, speak Vietnamese via the multilingual model.",
    gcloudHint:
      "Requires GOOGLE_TTS_API_KEY in .env (enable the Text-to-Speech API in Google Cloud Console — has a free monthly quota).",
    localeLabel: "Country / language",
    gender: "Gender",
    genderAll: "All",
    genderF: "Female",
    genderM: "Male",
    voiceLabel: (n: number) => `Voice (${n} voices)`,
    previewTitle: "Preview this voice",
    preview: "Preview",
    previewError: "Could not play voice sample — try again",
  },
} as const;

export const DEFAULT_VOICE_SELECTION: VoiceSelection = {
  provider: "edge",
  locale: "vi-VN",
  gender: "all",
  voice: DUB_VOICES[0].id,
};

/** Tên quốc gia tiếng Việt từ mã locale ("ja-JP" → "Nhật Bản"). */
function localeLabel(locale: string, lang: Lang): string {
  const region = locale.split("-").find((p) => /^[A-Z]{2}$/.test(p));
  try {
    const name = region
      ? new Intl.DisplayNames([lang], { type: "region" }).of(region)
      : null;
    return name ?? locale;
  } catch {
    return locale;
  }
}

const LOCALES_CACHE: Partial<Record<Lang, { id: string; label: string }[]>> = {};

function localesFor(lang: Lang) {
  return (LOCALES_CACHE[lang] ??= [...new Set(EDGE_VOICES.map((v) => v.locale))]
    .map((l) => ({ id: l, label: localeLabel(l, lang) }))
    .sort((a, b) =>
      a.id === "vi-VN" ? -1 : b.id === "vi-VN" ? 1 : a.label.localeCompare(b.label, lang),
    ));
}

export function voiceOptionsFor(sel: VoiceSelection) {
  const byGender = <T extends { gender: string }>(voices: readonly T[]) =>
    voices.filter((v) => sel.gender === "all" || v.gender === sel.gender);
  if (sel.provider === "gemini") return byGender(GEMINI_VOICES);
  if (sel.provider === "eleven") return byGender(ELEVEN_VOICES);
  if (sel.provider === "gcloud") return byGender(GCLOUD_VOICES);
  return EDGE_VOICES.filter(
    (v) => v.locale === sel.locale && (sel.gender === "all" || v.gender === sel.gender),
  );
}

/** Giọng hiệu lực: nếu giọng đã chọn không còn khớp bộ lọc → rơi về giọng đầu. */
export function resolveVoice(sel: VoiceSelection): string {
  const options = voiceOptionsFor(sel);
  return options.some((v) => v.id === sel.voice)
    ? sel.voice
    : (options[0]?.id ?? sel.voice);
}

interface VoicePickerProps {
  value: VoiceSelection;
  onChange: (patch: Partial<VoiceSelection>) => void;
  onError?: (message: string | null) => void;
  lang?: Lang;
}

/** Chọn loại giọng / quốc gia / giới tính / giọng đọc, kèm nút nghe thử. */
export function VoicePicker({ value, onChange, onError, lang = "vi" }: VoicePickerProps) {
  const t = T[lang];
  const [previewing, setPreviewing] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const options = useMemo(() => voiceOptionsFor(value), [value]);
  const activeVoice = resolveVoice(value);
  const locales = localesFor(lang);

  async function playPreview() {
    if (previewing) return;
    setPreviewing(true);
    onError?.(null);
    try {
      audioRef.current?.pause();
      const audio = new Audio(`/api/tts-preview?voice=${encodeURIComponent(activeVoice)}`);
      audioRef.current = audio;
      audio.onended = () => setPreviewing(false);
      audio.onerror = () => {
        setPreviewing(false);
        onError?.(t.previewError);
      };
      await audio.play();
    } catch {
      setPreviewing(false);
      onError?.(t.previewError);
    }
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <label className="text-sm sm:col-span-2">
        <span className={cn(fieldLabelClass, "font-medium")}>{t.providerLabel}</span>
        <select
          value={value.provider}
          onChange={(e) => onChange({ provider: e.target.value as VoiceProvider })}
          className={cn(selectClass, "mt-1 w-full py-2")}
        >
          {t.providerOptions.map((p) => (
            <option key={p.value} value={p.value}>
              {p.label}
            </option>
          ))}
        </select>
        {value.provider === "eleven" && (
          <span className="mt-1 block text-xs text-amber-600 dark:text-amber-400">
            {t.elevenHint}
          </span>
        )}
        {value.provider === "gcloud" && (
          <span className="mt-1 block text-xs text-amber-600 dark:text-amber-400">
            {t.gcloudHint}
          </span>
        )}
      </label>
      {value.provider === "edge" && (
        <label className="text-sm">
          <span className={cn(fieldLabelClass, "font-medium")}>
            {t.localeLabel} ({locales.length})
          </span>
          <select
            value={value.locale}
            onChange={(e) => onChange({ locale: e.target.value })}
            className={cn(selectClass, "mt-1 w-full py-2")}
          >
            {locales.map((l) => (
              <option key={l.id} value={l.id}>
                {l.label} ({l.id})
              </option>
            ))}
          </select>
        </label>
      )}
      <label className="text-sm">
        <span className={cn(fieldLabelClass, "font-medium")}>{t.gender}</span>
        <select
          value={value.gender}
          onChange={(e) => onChange({ gender: e.target.value as "all" | "F" | "M" })}
          className={cn(selectClass, "mt-1 w-full py-2")}
        >
          <option value="all">{t.genderAll}</option>
          <option value="F">{t.genderF}</option>
          <option value="M">{t.genderM}</option>
        </select>
      </label>
      <label className="text-sm sm:col-span-2">
        <span className={cn(fieldLabelClass, "font-medium")}>
          {t.voiceLabel(options.length)}
        </span>
        <span className="mt-1 flex gap-2">
          <select
            value={activeVoice}
            onChange={(e) => onChange({ voice: e.target.value })}
            className={cn(selectClass, "w-full py-2")}
          >
            {options.map((v) => (
              <option key={v.id} value={v.id}>
                {v.name}
                {value.provider === "edge"
                  ? ` — ${v.gender === "F" ? t.genderF : t.genderM}`
                  : ""}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={() => void playPreview()}
            disabled={previewing}
            title={t.previewTitle}
            className="inline-flex shrink-0 items-center gap-1.5 rounded-md border border-success-300 px-3 py-2 text-sm font-medium text-success-700 hover:bg-success-50 disabled:opacity-50 dark:border-success-800 dark:text-success-300 dark:hover:bg-success-950/40"
          >
            {previewing ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Play className="h-4 w-4" />
            )}
            {t.preview}
          </button>
        </span>
      </label>
    </div>
  );
}
