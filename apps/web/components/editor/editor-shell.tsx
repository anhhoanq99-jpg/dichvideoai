"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  Check,
  ChevronDown,
  Download,
  Loader2,
  Replace,
  Sparkles,
  TriangleAlert,
} from "lucide-react";
import type { SubtitleSegment } from "@dichvideo/shared";
import { useEditorState } from "@/hooks/use-editor-state";
import { RetranslateModal } from "./retranslate-modal";
import { SegmentTable } from "./segment-table";

const SAVE_LABELS = {
  saved: { icon: Check, text: "Đã lưu" },
  dirty: { icon: Loader2, text: "Chờ lưu…" },
  saving: { icon: Loader2, text: "Đang lưu…" },
  conflict: { icon: TriangleAlert, text: "Xung đột — tải lại trang" },
  error: { icon: TriangleAlert, text: "Lỗi lưu — thử lại" },
} as const;

interface EditorShellProps {
  videoId: string;
  trackId: string;
  originalTrackId: string | null;
  trackVersion: number;
  original: SubtitleSegment[];
  translated: SubtitleSegment[];
}

export function EditorShell({
  videoId,
  trackId,
  originalTrackId,
  trackVersion,
  original,
  translated,
}: EditorShellProps) {
  const { segments, saveState, updateSegmentText, replaceAll, saveNow } =
    useEditorState(trackId, translated, trackVersion);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [currentMs, setCurrentMs] = useState(0);
  const [autoScroll, setAutoScroll] = useState(true);
  const [find, setFind] = useState("");
  const [replace, setReplace] = useState("");
  const [replaceMsg, setReplaceMsg] = useState<string | null>(null);
  const [showRetranslate, setShowRetranslate] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const [overlay, setOverlay] = useState(true);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    fetch(`/api/videos/${videoId}/preview-url`)
      .then((r) => r.json())
      .then((d) => setPreviewUrl(d.url ?? null))
      .catch(() => setPreviewUrl(null));
  }, [videoId]);

  // binary search active segment by current playback time
  const activeIndex = useMemo(() => {
    let lo = 0,
      hi = segments.length - 1,
      ans = -1;
    while (lo <= hi) {
      const mid = (lo + hi) >> 1;
      if (segments[mid].startMs <= currentMs) {
        if (currentMs < segments[mid].endMs) return mid;
        ans = mid;
        lo = mid + 1;
      } else hi = mid - 1;
    }
    return ans;
  }, [segments, currentMs]);

  const SaveIcon = SAVE_LABELS[saveState].icon;

  return (
    <div className="flex h-[calc(100dvh-8.5rem)] gap-4">
      {/* Left: video + tools */}
      <div className="flex w-2/5 min-w-72 flex-col gap-3">
        {previewUrl ? (
          <div className="relative overflow-hidden rounded-lg">
            <video
              ref={videoRef}
              src={previewUrl}
              controls
              className="w-full bg-black"
              onTimeUpdate={(e) =>
                setCurrentMs(Math.round(e.currentTarget.currentTime * 1000))
              }
            />
            {overlay && activeIndex >= 0 && segments[activeIndex]?.text && (
              <div className="pointer-events-none absolute inset-x-4 bottom-12 text-center">
                <span className="inline-block max-w-full rounded bg-black/70 px-2 py-0.5 text-sm font-medium leading-snug text-white">
                  {segments[activeIndex].text}
                </span>
              </div>
            )}
          </div>
        ) : (
          <div className="flex aspect-video items-center justify-center rounded-lg bg-neutral-100 text-sm text-neutral-400 dark:bg-neutral-900">
            Đang tải video…
          </div>
        )}

        <div className="rounded-lg border border-neutral-200 bg-white p-3 dark:border-neutral-800 dark:bg-neutral-900">
          <p className="flex items-center gap-2 text-xs font-medium text-neutral-500 dark:text-neutral-400">
            <Replace className="h-3.5 w-3.5" /> Tìm &amp; thay thế (cột tiếng Việt)
          </p>
          <div className="mt-2 flex gap-2">
            <input
              value={find}
              onChange={(e) => setFind(e.target.value)}
              placeholder="Tìm…"
              className="w-full rounded border border-neutral-300 px-2 py-1 text-sm dark:border-neutral-700 dark:bg-neutral-800"
            />
            <input
              value={replace}
              onChange={(e) => setReplace(e.target.value)}
              placeholder="Thay bằng…"
              className="w-full rounded border border-neutral-300 px-2 py-1 text-sm dark:border-neutral-700 dark:bg-neutral-800"
            />
            <button
              type="button"
              onClick={() => {
                const n = replaceAll(find, replace);
                setReplaceMsg(`Đã thay ${n} chỗ`);
                setTimeout(() => setReplaceMsg(null), 2500);
              }}
              className="shrink-0 rounded bg-indigo-600 px-3 py-1 text-sm text-white hover:bg-indigo-700"
            >
              Thay
            </button>
          </div>
          {replaceMsg && (
            <p className="mt-1 text-xs text-emerald-600 dark:text-emerald-400">
              {replaceMsg}
            </p>
          )}
        </div>

        <div className="flex flex-wrap gap-4">
          <label className="flex items-center gap-2 text-sm text-neutral-600 dark:text-neutral-300">
            <input
              type="checkbox"
              checked={autoScroll}
              onChange={(e) => setAutoScroll(e.target.checked)}
            />
            Tự cuộn theo video
          </label>
          <label className="flex items-center gap-2 text-sm text-neutral-600 dark:text-neutral-300">
            <input
              type="checkbox"
              checked={overlay}
              onChange={(e) => setOverlay(e.target.checked)}
            />
            Hiện phụ đề trên video
          </label>
        </div>
      </div>

      {/* Right: table + toolbar */}
      <div className="flex min-w-0 flex-1 flex-col rounded-lg border border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900">
        <div className="flex items-center justify-between border-b border-neutral-200 px-3 py-2 dark:border-neutral-800">
          <p className="text-sm font-semibold">
            Phụ đề tiếng Việt — {segments.length} dòng
          </p>
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1 text-xs text-neutral-500 dark:text-neutral-400">
              <SaveIcon
                className={`h-3.5 w-3.5 ${saveState === "saving" || saveState === "dirty" ? "animate-spin" : ""}`}
              />
              {SAVE_LABELS[saveState].text}
            </span>
            <button
              type="button"
              onClick={saveNow}
              className="rounded border border-neutral-300 px-2 py-1 text-xs hover:bg-neutral-100 dark:border-neutral-700 dark:hover:bg-neutral-800"
            >
              Lưu ngay
            </button>
            <button
              type="button"
              onClick={() => setShowRetranslate(true)}
              className="flex items-center gap-1 rounded bg-violet-600 px-2.5 py-1 text-xs font-medium text-white hover:bg-violet-700"
            >
              <Sparkles className="h-3 w-3" /> Dịch lại AI
            </button>
            <div className="relative">
              <button
                type="button"
                onClick={() => setExportOpen((v) => !v)}
                className="flex items-center gap-1 rounded border border-neutral-300 px-2 py-1 text-xs hover:bg-neutral-100 dark:border-neutral-700 dark:hover:bg-neutral-800"
              >
                <Download className="h-3 w-3" /> Xuất file{" "}
                <ChevronDown className="h-3 w-3" />
              </button>
              {exportOpen && (
                <div
                  className="absolute right-0 z-20 mt-1 w-44 rounded-md border border-neutral-200 bg-white py-1 text-xs shadow-lg dark:border-neutral-700 dark:bg-neutral-800"
                  onClick={() => setExportOpen(false)}
                >
                  {[
                    { href: `/api/tracks/${trackId}/export?format=srt`, label: "Phụ đề dịch (.SRT)" },
                    { href: `/api/tracks/${trackId}/export?format=vtt`, label: "Phụ đề dịch (.VTT)" },
                    { href: `/api/tracks/${trackId}/export?format=txt`, label: "Văn bản dịch (.TXT)" },
                    ...(originalTrackId
                      ? [
                          {
                            href: `/api/tracks/${originalTrackId}/export?format=srt`,
                            label: "Phụ đề gốc (.SRT)",
                          },
                          {
                            href: `/api/tracks/${originalTrackId}/export?format=txt`,
                            label: "Văn bản gốc (.TXT)",
                          },
                        ]
                      : []),
                  ].map((item) => (
                    <a
                      key={item.href + item.label}
                      href={item.href}
                      className="block px-3 py-1.5 hover:bg-neutral-100 dark:hover:bg-neutral-700"
                    >
                      {item.label}
                    </a>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
        {showRetranslate && (
          <RetranslateModal
            videoId={videoId}
            lineCount={segments.length}
            onClose={() => setShowRetranslate(false)}
          />
        )}
        <div className="min-h-0 flex-1">
          <SegmentTable
            original={original}
            translated={segments}
            activeIndex={activeIndex}
            autoScroll={autoScroll}
            onEdit={updateSegmentText}
            onRowClick={(startMs) => {
              if (videoRef.current) videoRef.current.currentTime = startMs / 1000;
            }}
          />
        </div>
      </div>
    </div>
  );
}
