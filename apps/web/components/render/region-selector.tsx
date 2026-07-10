"use client";

import { useRef, useState } from "react";
import { X } from "lucide-react";
import { MAX_COVER_REGIONS, type CoverRegion } from "@dichvideo/shared";

/** Xem trước phụ đề ngay trên khung hình — chỉnh style là thấy liền, không tốn credits. */
export interface SubPreview {
  /** vị trí khung phụ đề (chuẩn hóa 0..1) — mép dưới khung là chân chữ */
  box: CoverRegion;
  text: string;
  /** cỡ chữ theo px của video gốc (sẽ tự scale theo khung preview) */
  fontSize: number;
  bold: boolean;
  color: string;
  boxed: boolean;
  boxColor: string;
  /** 0..100 */
  boxOpacity: number;
}

interface RegionSelectorProps {
  previewUrl: string;
  regions: CoverRegion[];
  onChange: (regions: CoverRegion[]) => void;
  subPreview?: SubPreview | null;
}

/** Drag rectangles over a paused video frame; emits normalized (0..1) coords. */
export function RegionSelector({
  previewUrl,
  regions,
  onChange,
  subPreview,
}: RegionSelectorProps) {
  const boxRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [drag, setDrag] = useState<{ x: number; y: number } | null>(null);
  const [draft, setDraft] = useState<CoverRegion | null>(null);

  // scale cỡ chữ ASS (theo video gốc) về px của khung preview
  const previewScale =
    boxRef.current && videoRef.current?.videoWidth
      ? boxRef.current.getBoundingClientRect().width / videoRef.current.videoWidth
      : 0.3;

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
        <video
          ref={videoRef}
          src={previewUrl}
          muted
          playsInline
          preload="metadata"
          className="w-full"
        />
        {/* phụ đề xem trước — căn giữa, bám mép dưới khung như bản render thật */}
        {subPreview && (
          <div
            className="pointer-events-none absolute flex items-end justify-center"
            style={{
              left: `${subPreview.box.x * 100}%`,
              top: `${subPreview.box.y * 100}%`,
              width: `${subPreview.box.w * 100}%`,
              height: `${subPreview.box.h * 100}%`,
            }}
          >
            <span
              className="max-w-full px-1 text-center leading-tight"
              style={{
                fontSize: Math.max(9, subPreview.fontSize * previewScale),
                fontWeight: subPreview.bold ? 700 : 400,
                color: subPreview.color,
                textShadow: subPreview.boxed ? "none" : "0 0 3px #000, 0 0 3px #000",
                backgroundColor: subPreview.boxed
                  ? `${subPreview.boxColor}${Math.round((subPreview.boxOpacity / 100) * 255)
                      .toString(16)
                      .padStart(2, "0")}`
                  : "transparent",
              }}
            >
              {subPreview.text}
            </span>
          </div>
        )}
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
