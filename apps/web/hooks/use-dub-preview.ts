"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { SubtitleSegment } from "@dichvideo/shared";

/**
 * iOS chỉ cho phát audio nếu phần tử từng gọi .play() TRONG một cử chỉ chạm.
 * Phát 1 file WAV im lặng ngay lúc người dùng bấm nút để "mở khoá" phần tử,
 * các câu lồng tiếng sau chỉ đổi src trên chính phần tử đã mở khoá đó.
 */
const SILENT_WAV =
  "data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQAAAAA=";

interface DubPreviewInput {
  /** giọng đang chọn — null/undefined là tắt lồng tiếng */
  dubVoice: string | null;
  playing: boolean;
  /** `i` của câu đang chạy (null khi đang ở khoảng lặng) */
  activeSegmentIndex: number | null;
  segments: SubtitleSegment[];
  durationMs: number;
  /** % âm lượng giọng AI (0..200, trình duyệt chặn trên ở 100) */
  dubAiVolume: number;
  /** tốc độ đọc cơ bản người dùng chọn */
  dubSpeed: number;
}

/**
 * Nghe thử lồng tiếng theo TỪNG CÂU ngay trên khung xem trước: sang câu mới thì
 * đọc câu đó bằng giọng đã chọn, ép tốc độ cho vừa khe thoại (khớp bản xuất),
 * và tải trước câu kế cho mượt. Clip TTS được cache theo (giọng, câu).
 *
 * Tách khỏi RenderPreview vì đây là mảng độc lập: không đụng tới thẻ video hay
 * khung xem trước, chỉ cần biết câu nào đang chạy.
 */
export function useDubPreview({
  dubVoice,
  playing,
  activeSegmentIndex,
  segments,
  durationMs,
  dubAiVolume,
  dubSpeed,
}: DubPreviewInput) {
  const [dubMuted, setDubMuted] = useState(false);

  // Chỉ nghe thử được với nguồn có hạn mức rộng (Edge, Google Cloud).
  // Gemini/ElevenLabs tính phí theo lượt nên để dành cho bản xuất.
  const dubSupported =
    Boolean(dubVoice) &&
    !dubVoice?.startsWith("gemini:") &&
    !dubVoice?.startsWith("eleven:");
  const dubActive = dubSupported && !dubMuted;

  const clipUrlCache = useRef(new Map<string, string>());
  const dubAudioRef = useRef<HTMLAudioElement | null>(null);
  const lastSpokenRef = useRef<number | null>(null);

  /** Gọi TRONG cử chỉ chạm (bấm play / bấm nút lồng tiếng) — xem chú thích SILENT_WAV. */
  const unlockDubAudio = useCallback(() => {
    if (dubAudioRef.current) return;
    const audio = new Audio(SILENT_WAV);
    dubAudioRef.current = audio;
    void audio.play().catch(() => {});
  }, []);

  /** Tải (và cache) clip TTS của một câu — trả về object URL. */
  const fetchDubClip = useCallback(
    async (voice: string, seg: SubtitleSegment): Promise<string | null> => {
      const key = `${voice}:${seg.i}:${seg.text}`;
      const cached = clipUrlCache.current.get(key);
      if (cached) return cached;
      try {
        const res = await fetch(
          `/api/tts-preview?voice=${encodeURIComponent(voice)}&text=${encodeURIComponent(seg.text.replace(/\*/g, "").slice(0, 300))}`,
        );
        if (!res.ok) return null;
        const url = URL.createObjectURL(await res.blob());
        clipUrlCache.current.set(key, url);
        return url;
      } catch {
        return null;
      }
    },
    [],
  );

  // dọn các object URL khi rời trang
  useEffect(() => {
    const cache = clipUrlCache.current;
    return () => {
      for (const url of cache.values()) URL.revokeObjectURL(url);
      cache.clear();
    };
  }, []);

  useEffect(() => {
    if (!dubActive || !dubVoice || !playing) {
      dubAudioRef.current?.pause();
      if (!playing) lastSpokenRef.current = null;
      return;
    }
    if (activeSegmentIndex === null || lastSpokenRef.current === activeSegmentIndex)
      return;
    lastSpokenRef.current = activeSegmentIndex;
    const segIdx = segments.findIndex((s) => s.i === activeSegmentIndex);
    const seg = segments[segIdx];
    if (!seg) return;
    const next = segments[segIdx + 1];
    // khe thoại của câu = tới lúc câu sau bắt đầu (giống slotMs bên worker)
    const slotMs = Math.max(
      300,
      (next ? next.startMs : Math.max(durationMs, seg.endMs)) - seg.startMs,
    );
    let stale = false;
    void fetchDubClip(dubVoice, seg).then((url) => {
      if (!url || stale) return;
      // tái sử dụng phần tử đã mở khóa trong cử chỉ chạm — iOS mới cho phát;
      // desktop chưa bấm nút nào thì tạo mới (autoplay policy thoáng hơn)
      const audio = dubAudioRef.current ?? new Audio();
      dubAudioRef.current = audio;
      audio.pause();
      audio.src = url;
      audio.volume = Math.min(1, Math.max(0, dubAiVolume / 100));
      audio.onloadedmetadata = () => {
        // câu dài hơn khe → tăng tốc đọc cho khớp (như atempo khi xuất)
        const rawMs = audio.duration * 1000;
        audio.playbackRate = Math.min(4, Math.max(dubSpeed, rawMs / slotMs));
      };
      void audio.play().catch(() => {});
      if (next) void fetchDubClip(dubVoice, next);
    });
    return () => {
      stale = true;
    };
  }, [
    activeSegmentIndex,
    dubActive,
    dubVoice,
    dubAiVolume,
    dubSpeed,
    playing,
    segments,
    durationMs,
    fetchDubClip,
  ]);

  return { dubSupported, dubActive, dubMuted, setDubMuted, unlockDubAudio };
}
