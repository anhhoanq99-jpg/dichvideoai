"use client";

import { useEffect, useState } from "react";
import { AudioLines, Download, Loader2, Play } from "lucide-react";
import type { Lang } from "@/lib/i18n";
import { inputClass } from "@/components/ui/form-styles";
import {
  DEFAULT_VOICE_SELECTION,
  VoicePicker,
  resolveVoice,
  type VoiceSelection,
} from "@/components/dub/voice-picker";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

const T = {
  vi: {
    hint: "Nhập văn bản, chọn 1 trong hàng trăm giọng có sẵn (322 giọng thường + 40 giọng Google + Adam… miễn phí) — AI đọc thành file âm thanh tải về được.",
    speakTitle: "Đọc văn bản",
    textPh: "Nhập văn bản cần đọc (tiếng Việt hoặc ngôn ngữ bất kỳ)…",
    generate: "Tạo giọng nói",
    generating: "Đang tạo…",
    download: "Tải MP3",
    fail: "Không tạo được — thử lại",
  },
  en: {
    hint: "Type text, pick from hundreds of ready voices (322 standard + 40 Google + Adam… free) — AI reads it into a downloadable audio file.",
    speakTitle: "Read text aloud",
    textPh: "Enter the text to read…",
    generate: "Generate speech",
    generating: "Generating…",
    download: "Download MP3",
    fail: "Generation failed — try again",
  },
} as const;

const MAX_TEXT = 2000;

/**
 * Công cụ đọc văn bản thành giọng nói bằng giọng trong catalog.
 *
 * Phần NHÂN BẢN GIỌNG đã gỡ bỏ (30/07/2026): nhân bản là thao tác tạo giọng mới
 * từ file mẫu, không nguồn miễn phí nào làm được (Edge/Gemini chỉ đọc theo danh
 * sách cố định, Google Cloud tính là sản phẩm doanh nghiệp trả phí riêng), còn
 * gói ElevenLabs miễn phí thì thiếu quyền `create_instant_voice_clone`.
 */
export function VoiceCloneClient({ lang = "vi" }: { lang?: Lang }) {
  const t = T[lang];

  const [selection, setSelection] = useState<VoiceSelection>(DEFAULT_VOICE_SELECTION);
  const [text, setText] = useState("");
  const [generating, setGenerating] = useState(false);
  const [speakError, setSpeakError] = useState<string | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);

  // dọn URL audio cũ khi tạo bản mới / rời trang
  useEffect(() => {
    return () => {
      if (audioUrl) URL.revokeObjectURL(audioUrl);
    };
  }, [audioUrl]);

  async function generate() {
    if (!text.trim() || generating) return;
    setGenerating(true);
    setSpeakError(null);
    try {
      const res = await fetch("/api/voice-clone/speak", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ voiceId: resolveVoice(selection), text: text.trim() }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        setSpeakError(data?.error ?? t.fail);
        return;
      }
      const blob = await res.blob();
      if (audioUrl) URL.revokeObjectURL(audioUrl);
      setAudioUrl(URL.createObjectURL(blob));
    } catch {
      setSpeakError(t.fail);
    } finally {
      setGenerating(false);
    }
  }

  return (
    <div className="space-y-4 pb-8">
      <p className="text-xs text-neutral-400">{t.hint}</p>

      <div className="rounded-2xl border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900">
        <p className="flex items-center gap-2 text-sm font-semibold">
          <Play className="h-4 w-4 text-primary-500" /> {t.speakTitle}
        </p>

        {/* catalog đầy đủ: 322 giọng thường + 40 giọng Google + Adam… + cao cấp */}
        <div className="mt-3">
          <VoicePicker
            value={selection}
            onChange={(patch) => setSelection((s) => ({ ...s, ...patch }))}
            onError={setSpeakError}
            lang={lang}
          />
        </div>

        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={t.textPh}
          maxLength={MAX_TEXT}
          rows={5}
          className={cn(inputClass, "mt-3 w-full resize-y")}
        />
        <p className="mt-1 text-right text-xs text-neutral-400">
          {text.length}/{MAX_TEXT}
        </p>

        {speakError && <p className="mt-1 text-xs text-red-600 dark:text-red-400">{speakError}</p>}

        <div className="mt-2 flex flex-wrap items-center gap-3">
          <Button pill disabled={generating || !text.trim()} onClick={() => void generate()}>
            {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : <AudioLines className="h-4 w-4" />}
            {generating ? t.generating : t.generate}
          </Button>

          {audioUrl && (
            <>
              <audio controls src={audioUrl} className="h-10 max-w-full" />
              <a
                href={audioUrl}
                download="giong-noi.mp3"
                className="inline-flex items-center gap-1.5 rounded-full border border-neutral-200 px-4 py-2 text-sm font-semibold hover:bg-neutral-100 dark:border-neutral-700 dark:hover:bg-neutral-800"
              >
                <Download className="h-4 w-4" /> {t.download}
              </a>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
