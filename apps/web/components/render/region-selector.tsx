"use client";

import { useRef, useState } from "react";
import { X } from "lucide-react";
import { MAX_COVER_REGIONS, type CoverRegion } from "@dichvideo/shared";

interface RegionSelectorProps {
  previewUrl: string;
  regions: CoverRegion[];
  onChange: (regions: CoverRegion[]) => void;
}

/** Drag rectangles over a paused video frame; emits normalized (0..1) coords. */
export function RegionSelector({ previewUrl, regions, onChange }: RegionSelectorProps) {
  const boxRef = useRef<HTMLDivElement>(null);
  const [drag, setDrag] = useState<{ x: number; y: number } | null>(null);
  const [draft, setDraft] = useState<CoverRegion | null>(null);

  function toNorm(e: React.PointerEvent) {
    const rect = boxRef.current!.getBoundingClientRect();
    return {
      x: Math.min(Math.max((e.clientX - rect.left) / rect.width, 0), 1),
      y: Math.min(Math.max((e.clientY - rect.top) / rect.height, 0), 1),
    };
  }

  return (
    <div>
      <div
        ref={boxRef}
        className="relative cursor-crosshair select-none overflow-hidden rounded-lg"
        onPointerDown={(e) => {
          if (regions.length >= MAX_COVER_REGIONS) return;
          e.currentTarget.setPointerCapture(e.pointerId);
          setDrag(toNorm(e));
        }}
        onPointerMove={(e) => {
          if (!drag) return;
          const p = toNorm(e);
          setDraft({
            x: Math.min(drag.x, p.x),
            y: Math.min(drag.y, p.y),
            w: Math.abs(p.x - drag.x),
            h: Math.abs(p.y - drag.y),
          });
        }}
        onPointerUp={() => {
          if (draft && draft.w > 0.02 && draft.h > 0.02) {
            onChange([...regions, draft]);
          }
          setDrag(null);
          setDraft(null);
        }}
      >
        <video src={previewUrl} muted playsInline preload="metadata" className="w-full" />
        {[...regions, ...(draft ? [draft] : [])].map((r, idx) => (
          <div
            key={idx}
            className="pointer-events-none absolute border-2 border-red-500 bg-red-500/20"
            style={{
              left: `${r.x * 100}%`,
              top: `${r.y * 100}%`,
              width: `${r.w * 100}%`,
              height: `${r.h * 100}%`,
            }}
          >
            <span className="absolute left-0 top-0 bg-red-500 px-1 text-[10px] font-bold text-white">
              {idx + 1}
            </span>
          </div>
        ))}
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-2">
        <p className="text-xs text-neutral-400">
          Kéo chuột để khoanh vùng cần che — được nhiều vùng (tối đa {MAX_COVER_REGIONS}).
        </p>
        {regions.map((_, idx) => (
          <button
            key={idx}
            type="button"
            onClick={() => onChange(regions.filter((_, k) => k !== idx))}
            className="inline-flex items-center gap-1 rounded-full bg-red-50 px-2 py-0.5 text-xs text-red-700 hover:bg-red-100 dark:bg-red-950/40 dark:text-red-300"
          >
            Vùng {idx + 1} <X className="h-3 w-3" />
          </button>
        ))}
        {regions.length > 1 && (
          <button
            type="button"
            onClick={() => onChange([])}
            className="text-xs text-neutral-500 underline hover:text-neutral-700 dark:hover:text-neutral-300"
          >
            Xóa hết
          </button>
        )}
      </div>
    </div>
  );
}
