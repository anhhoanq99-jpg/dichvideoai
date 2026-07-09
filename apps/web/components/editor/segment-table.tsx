"use client";

import { useEffect, useRef } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import type { SubtitleSegment } from "@dichvideo/shared";
import { cn } from "@/lib/utils";

function fmt(ms: number) {
  const m = Math.floor(ms / 60_000);
  const s = Math.floor((ms % 60_000) / 1000);
  const milli = Math.floor((ms % 1000) / 100);
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}.${milli}`;
}

interface SegmentTableProps {
  original: SubtitleSegment[];
  translated: SubtitleSegment[];
  activeIndex: number;
  autoScroll: boolean;
  onEdit: (i: number, text: string) => void;
  onRowClick: (startMs: number) => void;
}

export function SegmentTable({
  original,
  translated,
  activeIndex,
  autoScroll,
  onEdit,
  onRowClick,
}: SegmentTableProps) {
  const parentRef = useRef<HTMLDivElement>(null);
  const originalByI = new Map(original.map((s) => [s.i, s.text]));

  const virtualizer = useVirtualizer({
    count: translated.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 88,
    overscan: 10,
  });

  useEffect(() => {
    if (autoScroll && activeIndex >= 0) {
      virtualizer.scrollToIndex(activeIndex, { align: "center" });
    }
  }, [activeIndex, autoScroll, virtualizer]);

  return (
    <div ref={parentRef} className="h-full overflow-y-auto">
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
              className={cn(
                "border-b border-neutral-100 px-3 py-2 dark:border-neutral-800",
                isActive && "bg-indigo-50/70 dark:bg-indigo-950/30",
              )}
            >
              <button
                type="button"
                onClick={() => onRowClick(seg.startMs)}
                className="font-mono text-xs text-neutral-400 hover:text-indigo-600 dark:hover:text-indigo-400"
              >
                {fmt(seg.startMs)} → {fmt(seg.endMs)}
              </button>
              <p className="mt-0.5 text-xs text-neutral-400 dark:text-neutral-500">
                {originalByI.get(seg.i) ?? ""}
              </p>
              <textarea
                value={seg.text}
                onChange={(e) => onEdit(seg.i, e.target.value)}
                rows={Math.max(1, seg.text.split("\n").length)}
                className="mt-1 w-full resize-none rounded border border-transparent bg-transparent text-sm leading-snug focus:border-indigo-400 focus:bg-white focus:outline-none dark:focus:bg-neutral-900"
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}
