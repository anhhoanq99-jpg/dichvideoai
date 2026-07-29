"use client";

import { Mic, MicOff, Pause, Play, Volume2, VolumeX, X } from "lucide-react";
import { MAX_COVER_REGIONS, type CoverRegion } from "@dichvideo/shared";
import { cn } from "@/lib/utils";

/**
 * Thanh điều khiển dưới khung preview: phát/dừng, tua, loa, bật nghe thử lồng
 * tiếng, và danh sách vùng che để xoá.
 *
 * Tự dựng thay vì dùng `controls` mặc định của <video>: lớp kéo-thả vùng che nằm
 * đè lên mặt video nên nút gốc của trình duyệt bấm không tới.
 *
 * Tách khỏi `render-preview.tsx` vì đây là phần THUẦN HIỂN THỊ — nhận trạng thái
 * và callback rồi vẽ, không giữ state nào, không đụng toạ độ hay video element.
 */
export interface PreviewControlsLabels {
  play: string;
  pause: string;
  muteOrig: string;
  unmuteOrig: string;
  dubBtn: string;
  dubOn: string;
  dubOff: string;
  dubUnsupported: string;
  hintBase: string;
  hintCover: (max: number) => string;
  region: string;
  clearAll: string;
}

export function PreviewControls({
  t,
  playing,
  currentMs,
  durationMs,
  onTogglePlay,
  onSeek,
  soundOn,
  onToggleSound,
  dubVoice,
  dubSupported,
  dubActive,
  onToggleDub,
  covering,
  regions,
  onRegionsChange,
}: {
  t: PreviewControlsLabels;
  playing: boolean;
  currentMs: number;
  durationMs: number;
  onTogglePlay: () => void;
  onSeek: (ms: number) => void;
  soundOn: boolean;
  onToggleSound: () => void;
  /** null = chưa chọn giọng → ẩn hẳn nút nghe thử lồng tiếng */
  dubVoice: string | null;
  dubSupported: boolean;
  dubActive: boolean;
  onToggleDub: () => void;
  covering: boolean;
  regions: CoverRegion[];
  onRegionsChange: (regions: CoverRegion[]) => void;
}) {
  return (
    <>
      <div className="mt-2 flex items-center gap-3">
        <button
          type="button"
          onClick={onTogglePlay}
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary-600 text-white hover:bg-primary-700"
          aria-label={playing ? t.pause : t.play}
        >
          {playing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
        </button>
        <input
          type="range"
          min={0}
          max={durationMs || 1}
          value={currentMs}
          onChange={(e) => onSeek(Number(e.target.value))}
          className="w-full"
        />
        <span className="shrink-0 font-mono text-xs text-neutral-400">
          {Math.floor(currentMs / 60000)}:
          {String(Math.floor((currentMs % 60000) / 1000)).padStart(2, "0")}
        </span>
        <button
          type="button"
          onClick={onToggleSound}
          title={soundOn ? t.muteOrig : t.unmuteOrig}
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-neutral-300 text-neutral-600 hover:bg-neutral-100 dark:border-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-800"
        >
          {soundOn ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
        </button>
        {dubVoice && (
          <button
            type="button"
            onClick={onToggleDub}
            disabled={!dubSupported}
            title={!dubSupported ? t.dubUnsupported : dubActive ? t.dubOff : t.dubOn}
            className={cn(
              "flex h-8 shrink-0 items-center gap-1 rounded-full border px-2.5 text-xs font-medium disabled:opacity-40",
              dubActive
                ? "border-success-400 bg-success-50 text-success-700 dark:border-success-700 dark:bg-success-950/40 dark:text-success-300"
                : "border-neutral-300 text-neutral-600 hover:bg-neutral-100 dark:border-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-800",
            )}
          >
            {dubActive ? <Mic className="h-3.5 w-3.5" /> : <MicOff className="h-3.5 w-3.5" />}
            {t.dubBtn}
          </button>
        )}
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-2">
        <p className="text-xs text-neutral-400">
          {t.hintBase}
          {covering ? t.hintCover(MAX_COVER_REGIONS) : "."}
        </p>
        {covering &&
          regions.map((_, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => onRegionsChange(regions.filter((_, k) => k !== idx))}
              className="inline-flex items-center gap-1 rounded-full bg-red-50 px-2 py-0.5 text-xs text-red-700 hover:bg-red-100 dark:bg-red-950/40 dark:text-red-300"
            >
              {t.region} {idx + 1} <X className="h-3 w-3" />
            </button>
          ))}
        {covering && regions.length > 1 && (
          <button
            type="button"
            onClick={() => onRegionsChange([])}
            className="text-xs text-neutral-500 underline hover:text-neutral-700 dark:hover:text-neutral-300"
          >
            {t.clearAll}
          </button>
        )}
      </div>
    </>
  );
}
