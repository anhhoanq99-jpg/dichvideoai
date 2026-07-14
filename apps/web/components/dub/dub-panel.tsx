"use client";

import { useState } from "react";
import { Mic } from "lucide-react";
import { estimateJobCredits } from "@dichvideo/shared";
import { useJobRunner } from "@/hooks/use-job-runner";
import { JobDownloadLink, JobError, JobProgress } from "@/components/jobs/job-ui";
import { fieldLabelClass } from "@/components/ui/form-styles";
import type { Lang } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import {
  DEFAULT_VOICE_SELECTION,
  VoicePicker,
  resolveVoice,
  type VoiceSelection,
} from "./voice-picker";

const T = {
  vi: {
    title: "Lồng tiếng Việt AI",
    setup: "Thiết lập lồng tiếng",
    running: "Đang lồng tiếng…",
    download: "Tải video đã lồng tiếng",
    speed: "Tốc độ đọc:",
    aiVol: "Âm lượng giọng AI:",
    bgVol: "Âm thanh gốc giữ lại (nhạc nền):",
    bgVolOff: " — tắt hẳn tiếng gốc",
    note: "Câu nào dài hơn khoảng trống trên video sẽ tự tăng tốc đọc để khớp thời gian. Hình ảnh giữ nguyên chất lượng (không render lại hình).",
    startFail: "Không bắt đầu được lồng tiếng",
    start: "Bắt đầu lồng tiếng",
    failed: "Lồng tiếng thất bại",
  },
  en: {
    title: "AI Dubbing",
    setup: "Set up dubbing",
    running: "Dubbing…",
    download: "Download dubbed video",
    speed: "Speaking speed:",
    aiVol: "AI voice volume:",
    bgVol: "Original audio kept (background music):",
    bgVolOff: " — original audio fully off",
    note: "Lines longer than the available gap are read faster automatically to stay in sync. Picture quality is untouched (no video re-render).",
    startFail: "Could not start dubbing",
    start: "Start dubbing",
    failed: "Dubbing failed",
  },
} as const;

interface DubPanelProps {
  videoId: string;
  translatedTrackId: string | null;
  durationSec: number | null;
  lang?: Lang;
}

/** Lồng tiếng AI: giọng thường (322, miễn phí) + giọng cao cấp Gemini, có nghe thử. */
export function DubPanel({ videoId, translatedTrackId, durationSec, lang = "vi" }: DubPanelProps) {
  const t = T[lang];
  const [open, setOpen] = useState(false);
  const [selection, setSelection] = useState<VoiceSelection>(DEFAULT_VOICE_SELECTION);
  const [speed, setSpeed] = useState(1);
  const [aiVolume, setAiVolume] = useState(100);
  const [bgVolume, setBgVolume] = useState(20);
  const { job, jobId, running, error, setError, resultKey, start } = useJobRunner();

  if (!translatedTrackId) return null;

  return (
    <section className="rounded-lg border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900">
      <div className="flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-sm font-semibold">
          <Mic className="h-4 w-4 text-success-600 dark:text-success-400" />
          {t.title}
        </h2>
        {!open && !running && (
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="rounded-md bg-success-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-success-700"
          >
            {t.setup}
          </button>
        )}
      </div>

      {running && (
        <JobProgress
          className="mt-3"
          label={t.running}
          progress={job?.progress ?? 0}
          accent="emerald"
        />
      )}

      {job?.status === "done" && resultKey && jobId && (
        <JobDownloadLink jobId={jobId} label={t.download} />
      )}

      {open && !running && (
        <div className="mt-4 space-y-4">
          <VoicePicker
            value={selection}
            onChange={(patch) => setSelection((prev) => ({ ...prev, ...patch }))}
            onError={setError}
            lang={lang}
          />

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="text-sm">
              <span className={cn(fieldLabelClass, "font-medium")}>
                {t.speed} {speed.toFixed(2)}x
              </span>
              <input
                type="range"
                min={0.8}
                max={1.3}
                step={0.05}
                value={speed}
                onChange={(e) => setSpeed(Number(e.target.value))}
                className="mt-2 w-full"
              />
            </label>
            <label className="text-sm">
              <span className={cn(fieldLabelClass, "font-medium")}>
                {t.aiVol} {aiVolume}%
              </span>
              <input
                type="range"
                min={50}
                max={200}
                value={aiVolume}
                onChange={(e) => setAiVolume(Number(e.target.value))}
                className="mt-2 w-full"
              />
            </label>
            <label className="text-sm">
              <span className={cn(fieldLabelClass, "font-medium")}>
                {t.bgVol} {bgVolume}%
                {bgVolume === 0 ? t.bgVolOff : ""}
              </span>
              <input
                type="range"
                min={0}
                max={100}
                value={bgVolume}
                onChange={(e) => setBgVolume(Number(e.target.value))}
                className="mt-2 w-full"
              />
            </label>
          </div>

          <p className="rounded-md bg-neutral-50 px-3 py-2 text-xs text-neutral-500 dark:bg-neutral-800/60 dark:text-neutral-400">
            {t.note}
          </p>

          <button
            type="button"
            onClick={() =>
              void start(
                `/api/videos/${videoId}/dub`,
                {
                  trackId: translatedTrackId,
                  voice: resolveVoice(selection),
                  speed,
                  aiVolume,
                  bgVolume,
                },
                t.startFail,
              )
            }
            className="rounded-md bg-success-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-success-700"
          >
            {t.start}
            {durationSec
              ? ` — ${estimateJobCredits("dub", {
                  durationSec,
                  premiumVoice: selection.provider === "gemini",
                }).toLocaleString("vi-VN")} xu`
              : ""}
          </button>
        </div>
      )}

      <JobError className="mt-3" error={error} job={job} fallback={t.failed} />
    </section>
  );
}
