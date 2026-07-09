"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Download, Loader2, Mic } from "lucide-react";
import { DUB_VOICES, EDGE_VOICES } from "@dichvideo/shared";
import { useJobStream } from "@/hooks/use-job-stream";

interface DubPanelProps {
  videoId: string;
  translatedTrackId: string | null;
}

/** Tên quốc gia tiếng Việt từ mã locale ("ja-JP" → "Nhật Bản"). */
function localeLabel(locale: string): string {
  const region = locale.split("-").find((p) => /^[A-Z]{2}$/.test(p));
  try {
    const name = region
      ? new Intl.DisplayNames(["vi"], { type: "region" }).of(region)
      : null;
    return name ?? locale;
  } catch {
    return locale;
  }
}

const LOCALES = [...new Set(EDGE_VOICES.map((v) => v.locale))]
  .map((l) => ({ id: l, label: localeLabel(l) }))
  .sort((a, b) =>
    a.id === "vi-VN" ? -1 : b.id === "vi-VN" ? 1 : a.label.localeCompare(b.label, "vi"),
  );

/** Lồng tiếng AI: 322 giọng đủ mọi quốc gia, lọc theo nước + giới tính. */
export function DubPanel({ videoId, translatedTrackId }: DubPanelProps) {
  const [open, setOpen] = useState(false);
  const [locale, setLocale] = useState("vi-VN");
  const [gender, setGender] = useState<"all" | "F" | "M">("all");
  const [voice, setVoice] = useState<string>(DUB_VOICES[0].id);
  const [speed, setSpeed] = useState(1);
  const [aiVolume, setAiVolume] = useState(100);
  const [bgVolume, setBgVolume] = useState(20);
  const [jobId, setJobId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const job = useJobStream(jobId);
  const router = useRouter();

  useEffect(() => {
    if (job?.status === "done") router.refresh();
  }, [job?.status, router]);

  const voiceOptions = useMemo(
    () =>
      EDGE_VOICES.filter(
        (v) => v.locale === locale && (gender === "all" || v.gender === gender),
      ),
    [locale, gender],
  );

  // đổi bộ lọc → tự chọn giọng đầu tiên còn khớp
  useEffect(() => {
    if (voiceOptions.length > 0 && !voiceOptions.some((v) => v.id === voice)) {
      setVoice(voiceOptions[0].id);
    }
  }, [voiceOptions, voice]);

  if (!translatedTrackId) return null;

  const running = job !== null && (job.status === "queued" || job.status === "active");
  const doneKey = (job?.result as { r2Key?: string } | null)?.r2Key;

  async function start() {
    setError(null);
    const res = await fetch(`/api/videos/${videoId}/dub`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        trackId: translatedTrackId,
        voice,
        speed,
        aiVolume,
        bgVolume,
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error ?? "Không bắt đầu được lồng tiếng");
      return;
    }
    setJobId(data.jobId);
  }

  return (
    <section className="rounded-lg border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900">
      <div className="flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-sm font-semibold">
          <Mic className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
          Lồng tiếng Việt AI
        </h2>
        {!open && !running && (
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="rounded-md bg-emerald-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-emerald-700"
          >
            Thiết lập lồng tiếng
          </button>
        )}
      </div>

      {running && (
        <div className="mt-3">
          <p className="flex items-center gap-2 text-sm">
            <Loader2 className="h-4 w-4 animate-spin" />
            Đang lồng tiếng… {job?.progress ?? 0}%
          </p>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-neutral-100 dark:bg-neutral-800">
            <div
              className="h-full rounded-full bg-emerald-600 transition-all dark:bg-emerald-500"
              style={{ width: `${job?.progress ?? 0}%` }}
            />
          </div>
        </div>
      )}

      {job?.status === "done" && doneKey && (
        <a
          href={`/api/jobs/${jobId}/download`}
          className="mt-3 inline-flex items-center gap-2 rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700"
        >
          <Download className="h-4 w-4" /> Tải video đã lồng tiếng
        </a>
      )}

      {open && !running && (
        <div className="mt-4 space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="text-sm">
              <span className="block text-xs font-medium text-neutral-500 dark:text-neutral-400">
                Quốc gia / ngôn ngữ ({LOCALES.length})
              </span>
              <select
                value={locale}
                onChange={(e) => setLocale(e.target.value)}
                className="mt-1 w-full rounded-md border border-neutral-300 bg-white px-2 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-800"
              >
                {LOCALES.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.label} ({l.id})
                  </option>
                ))}
              </select>
            </label>
            <label className="text-sm">
              <span className="block text-xs font-medium text-neutral-500 dark:text-neutral-400">
                Giới tính
              </span>
              <select
                value={gender}
                onChange={(e) => setGender(e.target.value as typeof gender)}
                className="mt-1 w-full rounded-md border border-neutral-300 bg-white px-2 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-800"
              >
                <option value="all">Tất cả</option>
                <option value="F">Nữ</option>
                <option value="M">Nam</option>
              </select>
            </label>
            <label className="text-sm">
              <span className="block text-xs font-medium text-neutral-500 dark:text-neutral-400">
                Giọng đọc ({voiceOptions.length} giọng)
              </span>
              <select
                value={voice}
                onChange={(e) => setVoice(e.target.value)}
                className="mt-1 w-full rounded-md border border-neutral-300 bg-white px-2 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-800"
              >
                {voiceOptions.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.name} — {v.gender === "F" ? "Nữ" : "Nam"}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-sm">
              <span className="block text-xs font-medium text-neutral-500 dark:text-neutral-400">
                Tốc độ đọc: {speed.toFixed(2)}x
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
              <span className="block text-xs font-medium text-neutral-500 dark:text-neutral-400">
                Âm lượng giọng AI: {aiVolume}%
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
              <span className="block text-xs font-medium text-neutral-500 dark:text-neutral-400">
                Âm thanh gốc giữ lại (nhạc nền): {bgVolume}%
                {bgVolume === 0 ? " — tắt hẳn tiếng gốc" : ""}
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
            Câu nào dài hơn khoảng trống trên video sẽ tự tăng tốc đọc để khớp thời gian.
            Hình ảnh giữ nguyên chất lượng (không render lại hình).
          </p>

          <button
            type="button"
            onClick={() => void start()}
            className="rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-emerald-700"
          >
            Bắt đầu lồng tiếng
          </button>
        </div>
      )}

      {(error || job?.status === "failed") && (
        <p className="mt-3 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-300">
          {error ?? job?.error ?? "Lồng tiếng thất bại"}
        </p>
      )}
    </section>
  );
}
