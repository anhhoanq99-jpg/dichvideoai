"use client";

import { useRef, type PointerEvent, type RefObject } from "react";
import { clamp01 } from "@/components/render/preview-geometry";
import type { RenderSettings } from "@/components/render/render-settings";

/**
 * Kéo và co giãn logo trực tiếp trên khung preview.
 *
 * Tách khỏi `render-preview.tsx` vì đây là khối TỰ CHỨA: chỉ cần khung bao,
 * element logo và callback đổi settings — không dính gì tới vùng che, phụ đề hay
 * trạng thái phát video. Để lẫn trong component thì 4 handler này nằm chen giữa
 * logic video, đọc mãi mới biết chúng không liên quan nhau.
 *
 * Vị trí lưu dưới dạng TỈ LỆ `logoFx`/`logoFy` (0..1) của khoảng trống còn lại,
 * không phải pixel — kéo ở preview nhỏ thì render 1080p vẫn ra đúng chỗ đó.
 */
export function useLogoGesture({
  boxRef,
  logoRef,
  settings,
  onSettingsChange,
}: {
  /** khung bao video (hệ quy chiếu để quy đổi ra tỉ lệ) */
  boxRef: RefObject<HTMLDivElement | null>;
  logoRef: RefObject<HTMLDivElement | null>;
  settings: RenderSettings;
  /** không truyền = chế độ chỉ xem, mọi thao tác kéo bị bỏ qua */
  onSettingsChange?: (patch: Partial<RenderSettings>) => void;
}) {
  const gesture = useRef<
    | null
    | { kind: "move"; grabDX: number; grabDY: number }
    | { kind: "resize"; startWidth: number; startFontSize: number }
  >(null);

  function onPointerDown(e: PointerEvent) {
    if (!onSettingsChange || !logoRef.current) return;
    e.stopPropagation();
    e.currentTarget.setPointerCapture(e.pointerId);
    const rect = logoRef.current.getBoundingClientRect();
    gesture.current = {
      kind: "move",
      grabDX: e.clientX - rect.left,
      grabDY: e.clientY - rect.top,
    };
  }

  function onResizeDown(e: PointerEvent) {
    if (!onSettingsChange || !logoRef.current) return;
    e.stopPropagation();
    e.currentTarget.setPointerCapture(e.pointerId);
    const rect = logoRef.current.getBoundingClientRect();
    gesture.current = {
      kind: "resize",
      startWidth: rect.width,
      startFontSize: settings.logoSize,
    };
  }

  function onPointerMove(e: PointerEvent) {
    const g = gesture.current;
    const box = boxRef.current?.getBoundingClientRect();
    const rect = logoRef.current?.getBoundingClientRect();
    if (!g || !box || !rect || !onSettingsChange) return;

    if (g.kind === "move") {
      // chia cho KHOẢNG TRỐNG còn lại chứ không phải cả khung: logo to hay nhỏ
      // thì kéo hết cỡ vẫn đúng mép, không bị tràn ra ngoài.
      const freeW = Math.max(1, box.width - rect.width);
      const freeH = Math.max(1, box.height - rect.height);
      onSettingsChange({
        logoFx: clamp01((e.clientX - box.left - g.grabDX) / freeW),
        logoFy: clamp01((e.clientY - box.top - g.grabDY) / freeH),
      });
      return;
    }

    const width = Math.max(12, e.clientX - rect.left);
    if (settings.logoType === "image") {
      onSettingsChange({
        logoScale: Math.round(Math.min(60, Math.max(3, (width / box.width) * 100))),
      });
    } else {
      onSettingsChange({
        logoSize: Math.round(
          Math.min(96, Math.max(12, g.startFontSize * (width / g.startWidth))),
        ),
      });
    }
  }

  function onPointerUp() {
    gesture.current = null;
  }

  return { onPointerDown, onResizeDown, onPointerMove, onPointerUp };
}
