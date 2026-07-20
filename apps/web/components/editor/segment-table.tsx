"use client";

import { useEffect, useRef } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { SquareDashed, X } from "lucide-react";
import type { SubtitleSegment } from "@dichvideo/shared";
import type { Lang } from "@/lib/i18n";
import { cn } from "@/lib/utils";

const T = {
  vi: {
    cpsOk: "Tốc độ đọc ổn",
    cpsWarn: (limit: number) =>
      `Quá ${limit} ký tự/giây — người xem khó đọc kịp, nên rút gọn câu`,
    chars: "ký tự",
    deleteRow: "Xóa dòng này",
    coverOn: "Đang che chữ gốc ở dòng này — bấm để bỏ che",
    coverOff: "Che chữ gốc ở đúng lúc dòng này chạy (kéo ô trên video để chỉnh)",
  },
  en: {
    cpsOk: "Reading speed OK",
    cpsWarn: (limit: number) =>
      `Over ${limit} chars/second — viewers can't keep up, consider shortening`,
    chars: "chars",
    deleteRow: "Delete this line",
    coverOn: "Covering the original text on this line — click to remove",
    coverOff: "Cover the original text while this line plays (drag the box on the video)",
  },
} as const;

function formatTimestamp(ms: number) {
  const m = Math.floor(ms / 60_000);
  const s = Math.floor((ms % 60_000) / 1000);
  const milli = Math.floor((ms % 1000) / 100);
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}.${milli}`;
}

/** chars/second — tốc độ đọc; phụ đề Việt thường thoải mái tới ~20 C/S */
const CPS_WARN = 20;

function cps(seg: SubtitleSegment): number | null {
  const durS = (seg.endMs - seg.startMs) / 1000;
  if (durS <= 0) return null;
  return Math.round((seg.text.replace(/\s/g, "").length / durS) * 10) / 10;
}

interface SegmentTableProps {
  original: SubtitleSegment[];
  translated: SubtitleSegment[];
  activeIndex: number;
  autoScroll: boolean;
  onEdit: (i: number, text: string) => void;
  onRowClick: (startMs: number) => void;
  /** có truyền → hiện nút xóa từng dòng */
  onDelete?: (i: number) => void;
  /** có truyền → hiện nút bật/tắt che chữ gốc cho từng dòng */
  onToggleCover?: (i: number) => void;
  lang?: Lang;
}

export function SegmentTable({
  original,
  translated,
  activeIndex,
  autoScroll,
  onEdit,
  onRowClick,
  onDelete,
  onToggleCover,
  lang = "vi",
}: SegmentTableProps) {
  const t = T[lang];
  const parentRef = useRef<HTMLDivElement>(null);
  const originalByI = new Map(original.map((s) => [s.i, s.text]));

  const virtualizer = useVirtualizer({
    count: translated.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 108,
    overscan: 10,
  });

  useEffect(() => {
    if (autoScroll && activeIndex >= 0) {
      virtualizer.scrollToIndex(activeIndex, { align: "center" });
    }
  }, [activeIndex, autoScroll, virtualizer]);

  return (
    <div ref={parentRef} className="h-full overflow-y-auto p-2">
      <div
        style={{ height: virtualizer.getTotalSize(), position: "relative" }}
        className="w-full"
      >
        {virtualizer.getVirtualItems().map((row) => {
          const seg = translated[row.index];
          const isActive = row.index === activeIndex;
          return (
            <div
              key={seg.i}
              data-index={row.index}
              ref={virtualizer.measureElement}
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                width: "100%",
                transform: `translateY(${row.start}px)`,
              }}
              className="px-1 py-1"
            >
              <div
                className={cn(
                  "rounded-xl border px-3 py-2 transition-colors",
                  isActive
                    ? "border-primary-400 bg-primary-50/70 shadow-sm shadow-primary-500/10 dark:border-primary-700 dark:bg-primary-950/30"
                    : "border-neutral-200 bg-white hover:border-neutral-300 dark:border-neutral-800 dark:bg-neutral-900/60 dark:hover:border-neutral-700",
                )}
              >
              <div className="flex items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={() => onRowClick(seg.startMs)}
                  className="font-mono text-xs text-neutral-400 hover:text-primary-600 dark:hover:text-primary-400"
                >
                  #{row.index + 1} · {formatTimestamp(seg.startMs)} → {formatTimestamp(seg.endMs)} ·{" "}
                  {seg.endMs - seg.startMs}ms
                </button>
                {(() => {
                  const charsPerSec = cps(seg);
                  if (charsPerSec === null) return null;
                  const slow = charsPerSec <= CPS_WARN;
                  return (
                    <span
                      title={slow ? t.cpsOk : t.cpsWarn(CPS_WARN)}
                      className={cn(
                        "shrink-0 font-mono text-[10px]",
                        slow
                          ? "text-neutral-400"
                          : "font-semibold text-red-500",
                      )}
                    >
                      {seg.text.replace(/\s/g, "").length} {t.chars} · {charsPerSec} C/S
                    </span>
                  );
                })()}
                {onToggleCover && (
                  <button
                    type="button"
                    onClick={() => onToggleCover(seg.i)}
                    title={seg.box ? t.coverOn : t.coverOff}
                    aria-pressed={Boolean(seg.box)}
                    className={cn(
                      "shrink-0 rounded p-0.5",
                      seg.box
                        ? "bg-primary-100 text-primary-700 dark:bg-primary-950/60 dark:text-primary-300"
                        : "text-neutral-300 hover:bg-primary-50 hover:text-primary-600 dark:text-neutral-600 dark:hover:bg-primary-950/40",
                    )}
                  >
                    <SquareDashed className="h-3.5 w-3.5" />
                  </button>
                )}
                {onDelete && (
                  <button
                    type="button"
                    onClick={() => onDelete(seg.i)}
                    title={t.deleteRow}
                    className="shrink-0 rounded p-0.5 text-neutral-300 hover:bg-red-50 hover:text-red-600 dark:text-neutral-600 dark:hover:bg-red-950/40"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
              <p className="mt-0.5 text-xs text-neutral-400 dark:text-neutral-500">
                {originalByI.get(seg.i) ?? ""}
              </p>
              <textarea
                value={seg.text}
                onChange={(e) => onEdit(seg.i, e.target.value)}
                rows={Math.max(1, seg.text.split("\n").length)}
                className="mt-1 w-full resize-none rounded-lg border border-transparent bg-transparent px-1.5 py-0.5 text-sm leading-snug focus:border-primary-400 focus:bg-white focus:outline-none dark:focus:bg-neutral-900"
              />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
