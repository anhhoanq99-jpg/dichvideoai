"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AudioLines, Download, Loader2, Mic2, Play, Trash2, Upload } from "lucide-react";
import { ELEVEN_VOICES } from "@dichvideo/shared";
import type { Lang } from "@/lib/i18n";
import { fieldLabelClass, inputClass, selectClass } from "@/components/ui/form-styles";
import { useToast } from "@/components/ui/toaster";
import { cn } from "@/lib/utils";

const T = {
  vi: {
    hint: "Chọn giọng có sẵn hoặc nhân bản giọng của chính bạn từ file mẫu, nhập văn bản — AI đọc thành file âm thanh tải về được.",
    myVoices: "Giọng của tôi",
    cloneTitle: "Nhân bản giọng mới",
    cloneNamePh: "Đặt tên giọng (vd: Giọng của tôi)…",
    clonePick: "Chọn file mẫu (MP3/WAV, 30–120 giây, tối đa 10MB)",
    cloneHint: "Mẫu càng rõ, ít tạp âm thì giọng nhân bản càng giống. Đọc tự nhiên ~1 phút là đẹp.",
    consent: "Tôi xác nhận đây là giọng của tôi hoặc tôi đã được người sở hữu giọng cho phép sử dụng.",
    cloneBtn: "Nhân bản giọng",
    cloning: "Đang nhân bản…",
    cloneDone: (name: string) => `Đã nhân bản giọng "${name}" — chọn ở danh sách để dùng`,
    deleteVoice: "Xóa giọng này",
    deleted: "Đã xóa giọng",
    speakTitle: "Đọc văn bản",
    voiceLabel: "Giọng đọc",
    groupMine: "— Giọng nhân bản của tôi —",
    groupPreset: "— Giọng có sẵn —",
    textPh: "Nhập văn bản cần đọc (tiếng Việt hoặc ngôn ngữ bất kỳ)…",
    generate: "Tạo giọng nói",
    generating: "Đang tạo…",
    download: "Tải MP3",
    fail: "Không tạo được — thử lại",
  },
  en: {
    hint: "Pick a preset voice or clone your own from a sample, type text — AI reads it into a downloadable audio file.",
    myVoices: "My voices",
    cloneTitle: "Clone a new voice",
    cloneNamePh: "Voice name (e.g. My voice)…",
    clonePick: "Choose a sample file (MP3/WAV, 30–120s, max 10MB)",
    cloneHint: "Clear, noise-free samples clone best. ~1 minute of natural speech is ideal.",
    consent: "I confirm this is my own voice or I have the owner's permission to use it.",
    cloneBtn: "Clone voice",
    cloning: "Cloning…",
    cloneDone: (name: string) => `Voice "${name}" cloned — pick it from the list`,
    deleteVoice: "Delete this voice",
    deleted: "Voice deleted",
    speakTitle: "Read text aloud",
    voiceLabel: "Voice",
    groupMine: "— My cloned voices —",
    groupPreset: "— Preset voices —",
    textPh: "Enter the text to read…",
    generate: "Generate speech",
    generating: "Generating…",
    download: "Download MP3",
    fail: "Generation failed — try again",
  },
} as const;

interface ClonedVoice {
  id: string;
  name: string;
  createdAt: string;
}

const MAX_TEXT = 2000;

/** Công cụ nhân bản giọng nói: clone giọng từ mẫu + đọc văn bản bằng giọng đã chọn. */
export function VoiceCloneClient({ lang = "vi" }: { lang?: Lang }) {
  const t = T[lang];
  const { toast } = useToast();
  const fileRef = useRef<HTMLInputElement>(null);

  const [myVoices, setMyVoices] = useState<ClonedVoice[]>([]);
  const [maxClones, setMaxClones] = useState(3);
  const [cloneName, setCloneName] = useState("");
  const [cloneFile, setCloneFile] = useState<File | null>(null);
  const [consent, setConsent] = useState(false);
  const [cloning, setCloning] = useState(false);
  const [cloneError, setCloneError] = useState<string | null>(null);

  const [voiceId, setVoiceId] = useState<string>(ELEVEN_VOICES[0].id);
  const [text, setText] = useState("");
  const [generating, setGenerating] = useState(false);
  const [speakError, setSpeakError] = useState<string | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);

  const loadVoices = useCallback(async () => {
    try {
      const res = await fetch("/api/voice-clone/voices");
      if (!res.ok) return;
      const data = await res.json();
      setMyVoices(data.voices);
      setMaxClones(data.max);
    } catch {
      /* thử lại ở thao tác sau */
    }
  }, []);

  useEffect(() => {
    loadVoices();
  }, [loadVoices]);

  // dọn URL audio cũ khi tạo bản mới / rời trang
  useEffect(() => {
    return () => {
      if (audioUrl) URL.revokeObjectURL(audioUrl);
    };
  }, [audioUrl]);

  async function clone() {
    if (!cloneName.trim() || !cloneFile || !consent || cloning) return;
    setCloning(true);
    setCloneError(null);
    try {
      const form = new FormData();
      form.append("name", cloneName.trim());
      form.append("consent", "true");
      form.append("file", cloneFile);
      const res = await fetch("/api/voice-clone/voices", { method: "POST", body: form });
      const data = await res.json();
      if (!res.ok) {
        setCloneError(data.error ?? t.fail);
        return;
      }
      toast(t.cloneDone(data.voice.name));
      setCloneName("");
      setCloneFile(null);
      setConsent(false);
      if (fileRef.current) fileRef.current.value = "";
      await loadVoices();
      setVoiceId(`mine:${data.voice.id}`);
    } catch {
      setCloneError(t.fail);
    } finally {
      setCloning(false);
    }
  }

  async function removeVoice(id: string) {
    const res = await fetch(`/api/voice-clone/voices/${id}`, { method: "DELETE" });
    if (res.ok) {
      toast(t.deleted, "info");
      if (voiceId === `mine:${id}`) setVoiceId(ELEVEN_VOICES[0].id);
      await loadVoices();
    }
  }

  async function generate() {
    if (!text.trim() || generating) return;
    setGenerating(true);
    setSpeakError(null);
    try {
      const res = await fetch("/api/voice-clone/speak", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ voiceId, text: text.trim() }),
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

      {/* nhân bản giọng mới + giọng của tôi */}
      <div className="rounded-2xl border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900">
        <p className="flex items-center gap-2 text-sm font-semibold">
          <Mic2 className="h-4 w-4 text-primary-500" /> {t.cloneTitle}
          <span className="ml-auto text-xs font-normal text-neutral-400">
            {myVoices.length}/{maxClones}
          </span>
        </p>

        {myVoices.length > 0 && (
          <ul className="mt-3 space-y-1.5">
            {myVoices.map((v) => (
              <li
                key={v.id}
                className="flex items-center justify-between rounded-xl bg-neutral-50 px-3 py-2 text-sm dark:bg-neutral-800/60"
              >
                <span className="flex items-center gap-2 font-medium">
                  <AudioLines className="h-4 w-4 text-primary-500" /> {v.name}
                </span>
                <button
                  type="button"
                  onClick={() => void removeVoice(v.id)}
                  title={t.deleteVoice}
                  className="rounded-lg p-1.5 text-neutral-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/40"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </li>
            ))}
          </ul>
        )}

        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          <input
            value={cloneName}
            onChange={(e) => setCloneName(e.target.value)}
            placeholder={t.cloneNamePh}
            maxLength={60}
            className={cn(inputClass, "w-full")}
          />
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className={cn(
              inputClass,
              "flex w-full items-center gap-2 text-left",
              cloneFile ? "" : "text-neutral-400",
            )}
          >
            <Upload className="h-4 w-4 shrink-0" />
            <span className="truncate">{cloneFile ? cloneFile.name : t.clonePick}</span>
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="audio/mpeg,audio/wav,audio/x-m4a,audio/mp4,audio/*"
            className="hidden"
            onChange={(e) => setCloneFile(e.target.files?.[0] ?? null)}
          />
        </div>
        <p className="mt-2 text-xs text-neutral-400">{t.cloneHint}</p>
        <label className="mt-2 flex items-start gap-2 text-xs text-neutral-600 dark:text-neutral-300">
          <input
            type="checkbox"
            checked={consent}
            onChange={(e) => setConsent(e.target.checked)}
            className="mt-0.5"
          />
          {t.consent}
        </label>
        {cloneError && <p className="mt-2 text-xs text-red-600 dark:text-red-400">{cloneError}</p>}
        <button
          type="button"
          disabled={cloning || !cloneName.trim() || !cloneFile || !consent}
          onClick={() => void clone()}
          className="mt-3 inline-flex items-center gap-2 rounded-full bg-primary-600 px-5 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-primary-700 disabled:opacity-50"
        >
          {cloning ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mic2 className="h-4 w-4" />}
          {cloning ? t.cloning : t.cloneBtn}
        </button>
      </div>

      {/* đọc văn bản */}
      <div className="rounded-2xl border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900">
        <p className="flex items-center gap-2 text-sm font-semibold">
          <Play className="h-4 w-4 text-primary-500" /> {t.speakTitle}
        </p>

        <label className="mt-3 block text-sm">
          <span className={fieldLabelClass}>{t.voiceLabel}</span>
          <select
            value={voiceId}
            onChange={(e) => setVoiceId(e.target.value)}
            className={cn(selectClass, "mt-1 w-full sm:w-80")}
          >
            {myVoices.length > 0 && (
              <optgroup label={t.groupMine}>
                {myVoices.map((v) => (
                  <option key={v.id} value={`mine:${v.id}`}>
                    🎙 {v.name}
                  </option>
                ))}
              </optgroup>
            )}
            <optgroup label={t.groupPreset}>
              {ELEVEN_VOICES.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.name}
                </option>
              ))}
            </optgroup>
          </select>
        </label>

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
          <button
            type="button"
            disabled={generating || !text.trim()}
            onClick={() => void generate()}
            className="inline-flex items-center gap-2 rounded-full bg-primary-600 px-5 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-primary-700 disabled:opacity-50"
          >
            {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : <AudioLines className="h-4 w-4" />}
            {generating ? t.generating : t.generate}
          </button>

          {audioUrl && (
            <>
              {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
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
