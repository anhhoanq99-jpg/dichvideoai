"use client";

import { useRef, useState } from "react";
import type { CoverRegion } from "@dichvideo/shared";

interface SubtitlePositionBoxProps {
  previewUrl: string;
  box: CoverRegion;
  onChange: (box: CoverRegion) => void;
  /** live preview of text scale/color */
  fontSize: number;
  bold: boolean;
  primaryColor: string;
  boxed: boolean;
  boxColor: string;
  boxOpacity: number;
}

const MIN_W = 0.15;
const MIN_H = 0.05;

/**
 * Draggable + resizable overlay marking where subtitles render.
 * Drag body = move; drag corner handle = resize. Coords normalized 0..1.
 */
export function SubtitlePositionBox({
  previewUrl,
  box,
  onChange,
  fontSize,
  bold,
  primaryColor,
  boxed,
  boxColor,
  boxOpacity,
}: SubtitlePositionBoxProps) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [mode, setMode] = useState<"move" | "resize" | null>(null);
  const grabRef = useRef({ dx: 0, dy: 0 });

  function toNorm(e: React.PointerEvent) {
    const rect = wrapRef.current!.getBoundingClientRect();
    return {
      x: (e.clientX - rect.left) / rect.width,
      y: (e.clientY - rect.top) / rect.height,
    };
  }

  function onPointerMove(e: React.PointerEvent) {
    if (!mode) return;
    const p = toNorm(e);
    if (mode === "move") {
      const x = Math.min(Math.max(p.x - grabRef.current.dx, 0), 1 - box.w);
      const y = Math.min(Math.max(p.y - grabRef.current.dy, 0), 1 - box.h);
      onChange({ ...box, x, y });
    } else {
      const w = Math.min(Math.max(p.x - box.x, MIN_W), 1 - box.x);
      const h = Math.min(Math.max(p.y - box.y, MIN_H), 1 - box.y);
      onChange({ ...box, w, h });
    }
  }

  // css font size ≈ ASS size scaled from source resolution to preview width
  const previewScale =
    wrapRef.current && videoRef.current?.videoWidth
      ? wrapRef.current.getBoundingClientRect().width / videoRef.current.videoWidth
      : 0.35;
  const cssFont = Math.max(8, fontSize * previewScale);
  const alpha = Math.round((boxOpacity / 100) * 255)
    .toString(16)
    .padStart(2, "0");

  return (
    <div>
      <div
        ref={wrapRef}
        className="relative select-none overflow-hidden rounded-lg"
        onPointerMove={onPointerMove}
        onPointerUp={() => setMode(null)}
        onPointerLeave={() => setMode(null)}
      >
        <video
          ref={videoRef}
          src={previewUrl}
          muted
          playsInline
          preload="metadata"
          className="w-full"
        />
        <div
          className="absolute flex cursor-move items-end justify-center border-2 border-dashed border-indigo-400 bg-indigo-500/10"
          style={{
            left: `${box.x * 100}%`,
            top: `${box.y * 100}%`,
            width: `${box.w * 100}%`,
            height: `${box.h * 100}%`,
          }}
          onPointerDown={(e) => {
            e.currentTarget.setPointerCapture(e.pointerId);
            const p = toNorm(e);
            grabRef.current = { dx: p.x - box.x, dy: p.y - box.y };
            setMode("move");
          }}
        >
          <span
            className="mb-0.5 max-w-full truncate px-1 text-center leading-tight"
            style={{
              fontSize: cssFont,
              fontWeight: bold ? 700 : 400,
              color: primaryColor,
              textShadow: boxed ? "none" : "0 0 3px #000, 0 0 3px #000",
              backgroundColor: boxed ? `${boxColor}${alpha}` : "transparent",
            }}
          >
            Phụ đề xem trước
          </span>
          {/* resize handle */}
          <div
            className="absolute -bottom-1.5 -right-1.5 h-4 w-4 cursor-nwse-resize rounded-sm border border-white bg-indigo-500"
            onPointerDown={(e) => {
              e.stopPropagation();
              e.currentTarget.setPointerCapture(e.pointerId);
              setMode("resize");
            }}
          />
        </div>
      </div>
      <p className="mt-1 text-xs text-neutral-400">
        Kéo khung để đặt vị trí phụ đề; kéo góc dưới-phải để co dãn. Chữ căn giữa và xuống
        dòng trong khung, bám mép dưới khung.
      </p>
    </div>
  );
}
