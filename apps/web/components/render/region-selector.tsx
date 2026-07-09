"use client";

import { useRef, useState } from "react";
import type { CoverRegion } from "@dichvideo/shared";

interface RegionSelectorProps {
  previewUrl: string;
  region: CoverRegion | null;
  onChange: (region: CoverRegion) => void;
}

/** Drag a rectangle over a paused video frame; emits normalized (0..1) coords. */
export function RegionSelector({ previewUrl, region, onChange }: RegionSelectorProps) {
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

  const shown = draft ?? region;

  return (
    <div>
      <div
        ref={boxRef}
        className="relative cursor-crosshair select-none overflow-hidden rounded-lg"
        onPointerDown={(e) => {
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
          if (draft && draft.w > 0.02 && draft.h > 0.02) onChange(draft);
          setDrag(null);
          setDraft(null);
        }}
      >
        <video src={previewUrl} muted playsInline preload="metadata" className="w-full" />
        {shown && (
          <div
            className="pointer-events-none absolute border-2 border-red-500 bg-red-500/20"
            style={{
              left: `${shown.x * 100}%`,
              top: `${shown.y * 100}%`,
              width: `${shown.w * 100}%`,
              height: `${shown.h * 100}%`,
            }}
          />
        )}
      </div>
      <p className="mt-1 text-xs text-neutral-400">
        Kéo chuột trên hình để khoanh vùng phụ đề gốc cần che (thường là dải ngang phía dưới).
      </p>
    </div>
  );
}
