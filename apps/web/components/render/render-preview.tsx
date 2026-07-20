"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Mic, MicOff, Pause, Play, Volume2, VolumeX, X } from "lucide-react";
import {
  MAX_COVER_REGIONS,
  tokenizeAccents,
  type CoverMode,
  type CoverRegion,
  type SubtitleSegment,
} from "@dichvideo/shared";
import type { Lang } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import type { RenderSettings } from "./render-settings";

const T = {
  vi: {
    previewPlaceholder: "Phụ đề xem trước",
    pause: "Dừng",
    play: "Phát",
    muteOrig: "Tắt tiếng gốc",
    unmuteOrig: "Bật tiếng gốc",
    dubUnsupported:
      "Nghe thử theo câu chỉ hỗ trợ giọng thường / Google Cloud — giọng này sẽ có trong bản xuất",
    dubOff: "Tắt nghe thử lồng tiếng",
    dubOn: "Bật nghe thử lồng tiếng",
    dubBtn: "Lồng tiếng",
    hintBase: "Bấm phát để xem phụ đề chạy theo video. Kéo phụ đề / vùng che để đổi chỗ",
    hintCover: (max: number) =>
      `; kéo trên nền trống để khoanh vùng che mới (tối đa ${max}).`,
    region: "Vùng",
    clearAll: "Xóa hết",
    lineCoverTag: "Che dòng này",
  },
  en: {
    previewPlaceholder: "Subtitle preview",
    pause: "Pause",
    play: "Play",
    muteOrig: "Mute original audio",
    unmuteOrig: "Unmute original audio",
    dubUnsupported:
      "Per-line preview only supports standard / Google Cloud voices — this voice will be used in the export",
    dubOff: "Turn off dub preview",
    dubOn: "Turn on dub preview",
    dubBtn: "Dubbing",
    hintBase: "Press play to watch subtitles run with the video. Drag subtitles / cover regions to reposition",
    hintCover: (max: number) =>
      `; drag on empty space to draw a new cover region (max ${max}).`,
    region: "Region",
    clearAll: "Clear all",
    lineCoverTag: "Covers this line",
  },
} as const;

/** Nạp các font render từ Google Fonts để preview đúng mặt chữ (chỉ khi mở preview). */
const FONT_CSS_ID = "render-preview-fonts";
const FONT_CSS_URL =
  "https://fonts.googleapis.com/css2?family=Anton&family=Be+Vietnam+Pro:wght@400;700&family=Montserrat:wght@400;700&family=Noto+Sans:wght@400;700&family=Oswald:wght@400;700&family=Baloo+2:wght@400;700&family=Bungee&family=Paytone+One&family=Lobster&family=Patrick+Hand&display=swap";

/** Vẽ câu theo từng từ: *từ nhấn* tô màu accent + in đậm; reveal = từ hiện đúng nhịp đọc. */
function AccentedWords({
  text,
  accentColor,
  reveal,
  durMs,
}: {
  text: string;
  accentColor: string;
  reveal: boolean;
  durMs: number;
}) {
  const tokens = tokenizeAccents(text);
  const totalChars = tokens.reduce((sum, t) => sum + t.text.length, 0) || 1;
  // offset ký tự tích lũy TRƯỚC mỗi từ (n nhỏ nên O(n²) vô hại; không mutate biến)
  const charOffsets = tokens.map((_, i) =>
    tokens.slice(0, i).reduce((sum, t) => sum + t.text.length, 0),
  );
  return (
    <>
      {tokens.map((tok, i) => {
        // delay theo tỉ lệ ký tự — cùng công thức chia thời gian với bản xuất ASS
        const delayMs = (charOffsets[i] / totalChars) * durMs;
        return (
          <span
            key={i}
            style={{
              ...(tok.accent ? { color: accentColor, fontWeight: 700 } : {}),
              ...(reveal
                ? {
                    opacity: 0,
                    animation: `sub-reveal 0.06s linear ${Math.round(delayMs)}ms forwards`,
                  }
                : {}),
            }}
          >
            {tok.text}
            {i < tokens.length - 1 ? " " : ""}
          </span>
        );
      })}
    </>
  );
}

interface RenderPreviewProps {
  previewUrl: string;
  /** phụ đề đã dịch — hiển thị đúng câu theo thời điểm video */
  segments: SubtitleSegment[];
  coverMode: CoverMode;
  regions: CoverRegion[];
  onRegionsChange: (regions: CoverRegion[]) => void;
  settings: RenderSettings;
  /** khung phụ đề hiệu lực (tự động theo vùng che hoặc do user kéo) */
  subBox: CoverRegion | null;
  onSubBoxChange: (box: CoverRegion) => void;
  /** studio: nhận mốc thời gian đang phát để highlight dòng phụ đề */
  onTimeChange?: (ms: number) => void;
  /** studio: cầm element video để seek khi bấm vào dòng phụ đề */
  videoElRef?: React.MutableRefObject<HTMLVideoElement | null>;
  /** giọng lồng tiếng đã chọn — bật chế độ nghe thử đọc từng câu khi phát */
  dubVoice?: string | null;
  /** % nhạc nền gốc GIỮA các câu khi nghe thử lồng tiếng (0..100) */
  dubBgVolume?: number;
  /** % giọng nói gốc TRONG lúc AI đọc (0..100) — hạ để không chồng tiếng */
  dubOrigVoiceVolume?: number;
  /** % âm lượng giọng AI (0..200, trình duyệt chặn trên ở 100) */
  dubAiVolume?: number;
  /** tốc độ đọc cơ bản người dùng chọn (0.8..1.3) */
  dubSpeed?: number;
  /** chế độ "Cả hai": hiện thêm dòng bản gốc nhỏ phía trên bản dịch */
  originalSegments?: SubtitleSegment[] | null;
  /** studio: nhận thay đổi settings khi kéo/resize logo trực tiếp trên video */
  onSettingsChange?: (patch: Partial<RenderSettings>) => void;
  /**
   * studio: đổi vùng che chữ gốc CỦA DÒNG đang chạy (segment.box). Có truyền →
   * ô che của dòng hiện ra trên preview và kéo/co giãn được.
   */
  onActiveLineBoxChange?: (i: number, box: CoverRegion) => void;
  /**
   * studio: đổi vị trí / cỡ chữ RIÊNG của dòng đang chạy. Có truyền → dòng nào
   * đã bật tự chỉnh sẽ kéo được đi chỗ khác và co giãn cỡ chữ ngay trên video.
   */
  onActiveLineLayoutChange?: (
    i: number,
    layout: { pos?: { x: number; y: number }; size?: number },
  ) => void;
  lang?: Lang;
}

/** vị trí 4 góc cho logo trên khung preview */
const LOGO_CORNER: Record<string, React.CSSProperties> = {
  tl: { top: "3%", left: "2%" },
  tr: { top: "3%", right: "2%" },
  bl: { bottom: "3%", left: "2%" },
  br: { bottom: "3%", right: "2%" },
};

type Gesture =
  | { kind: "draw"; start: { x: number; y: number } }
  | { kind: "move-region"; index: number; grab: { dx: number; dy: number } }
  | { kind: "resize-region"; index: number }
  | { kind: "move-sub"; grab: { dx: number; dy: number } }
  // ô che chữ gốc gắn theo dòng phụ đề đang chạy
  | { kind: "move-line-cover"; grab: { dx: number; dy: number } }
  | { kind: "resize-line-cover" }
  // dòng phụ đề có vị trí/cỡ chữ riêng
  | { kind: "move-line-sub"; grab: { dx: number; dy: number } }
  | { kind: "resize-line-sub"; startX: number; startSize: number };

function clamp01(n: number) {
  return Math.min(1, Math.max(0, n));
}

function insideBox(p: { x: number; y: number }, b: CoverRegion) {
  return p.x >= b.x && p.x <= b.x + b.w && p.y >= b.y && p.y <= b.y + b.h;
}

/** tìm câu đang hiển thị tại thời điểm ms (segments đã sắp theo startMs) */
function activeSegmentAt(segments: SubtitleSegment[], ms: number) {
  let lo = 0,
    hi = segments.length - 1;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    if (segments[mid].startMs > ms) hi = mid - 1;
    else if (segments[mid].endMs <= ms) lo = mid + 1;
    else return segments[mid];
  }
  return null;
}

/**
 * Preview render trực tiếp: video chạy kèm phụ đề dịch thật đúng kiểu chữ đã
 * chọn, vùng che mô phỏng bằng blur/hộp tối CSS. Kéo vùng che hoặc khung phụ
 * đề để đổi vị trí; kéo trên nền trống để khoanh vùng che mới. Tất cả miễn
 * phí — chỉ khi bấm "Bắt đầu render" mới tốn credits.
 */
export function RenderPreview({
  previewUrl,
  segments,
  coverMode,
  regions,
  onRegionsChange,
  settings,
  subBox,
  onSubBoxChange,
  onTimeChange,
  videoElRef,
  dubVoice = null,
  dubBgVolume = 20,
  dubOrigVoiceVolume,
  dubAiVolume = 100,
  dubSpeed = 1,
  originalSegments = null,
  onSettingsChange,
  onActiveLineBoxChange,
  onActiveLineLayoutChange,
  lang = "vi",
}: RenderPreviewProps) {
  const t = T[lang];
  const boxRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  /** khối chữ của dòng đang chạy — đo vùng thật để bắt đúng chỗ khi kéo */
  const subLineRef = useRef<HTMLDivElement>(null);
  const [gesture, setGesture] = useState<Gesture | null>(null);
  const [draft, setDraft] = useState<CoverRegion | null>(null);
  const [currentMs, setCurrentMs] = useState(0);
  const [durationMs, setDurationMs] = useState(0);
  const [videoHeight, setVideoHeight] = useState(1080);
  const [playing, setPlaying] = useState(false);
  // scale cỡ chữ ASS (theo video gốc) về px của khung preview
  const [previewScale, setPreviewScale] = useState(0.3);

  // âm thanh: tiếng gốc + nghe thử lồng tiếng theo câu (giọng thường, miễn phí)
  const [soundOn, setSoundOn] = useState(true);
  const [dubMuted, setDubMuted] = useState(false);
  // nghe thử theo câu: chỉ nguồn có hạn mức rộng (Edge, Google Cloud) —
  // Gemini/ElevenLabs tính phí theo lượt nên chỉ nghe trong bản xuất
  const dubSupported =
    Boolean(dubVoice) &&
    !dubVoice?.startsWith("gemini:") &&
    !dubVoice?.startsWith("eleven:");
  const dubActive = dubSupported && !dubMuted;
  const clipUrlCache = useRef(new Map<string, string>());
  const dubAudioRef = useRef<HTMLAudioElement | null>(null);
  const lastSpokenRef = useRef<number | null>(null);

  // iOS chỉ cho phát audio nếu phần tử từng .play() TRONG một cử chỉ chạm.
  // Tạo 1 phần tử duy nhất + phát file WAV im lặng ngay lúc bấm nút, các câu
  // lồng tiếng sau chỉ đổi src trên chính phần tử đã "mở khóa" này.
  const SILENT_WAV =
    "data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQAAAAA=";
  function unlockDubAudio() {
    if (dubAudioRef.current) return;
    const audio = new Audio(SILENT_WAV);
    dubAudioRef.current = audio;
    void audio.play().catch(() => {});
  }

  // kéo/resize logo trực tiếp trên khung preview
  const logoRef = useRef<HTMLDivElement>(null);
  const logoGesture = useRef<
    | null
    | { kind: "move"; grabDX: number; grabDY: number }
    | { kind: "resize"; startWidth: number; startFontSize: number }
  >(null);

  function handleLogoPointerDown(e: React.PointerEvent) {
    if (!onSettingsChange) return;
    e.stopPropagation();
    e.currentTarget.setPointerCapture(e.pointerId);
    const rect = logoRef.current!.getBoundingClientRect();
    logoGesture.current = {
      kind: "move",
      grabDX: e.clientX - rect.left,
      grabDY: e.clientY - rect.top,
    };
  }

  function handleLogoResizeDown(e: React.PointerEvent) {
    if (!onSettingsChange) return;
    e.stopPropagation();
    e.currentTarget.setPointerCapture(e.pointerId);
    const rect = logoRef.current!.getBoundingClientRect();
    logoGesture.current = {
      kind: "resize",
      startWidth: rect.width,
      startFontSize: settings.logoSize,
    };
  }

  function handleLogoPointerMove(e: React.PointerEvent) {
    const gesture = logoGesture.current;
    const box = boxRef.current?.getBoundingClientRect();
    const rect = logoRef.current?.getBoundingClientRect();
    if (!gesture || !box || !rect || !onSettingsChange) return;
    if (gesture.kind === "move") {
      const freeW = Math.max(1, box.width - rect.width);
      const freeH = Math.max(1, box.height - rect.height);
      onSettingsChange({
        logoFx: clamp01((e.clientX - box.left - gesture.grabDX) / freeW),
        logoFy: clamp01((e.clientY - box.top - gesture.grabDY) / freeH),
      });
    } else {
      const width = Math.max(12, e.clientX - rect.left);
      if (settings.logoType === "image") {
        onSettingsChange({
          logoScale: Math.round(
            Math.min(60, Math.max(3, (width / box.width) * 100)),
          ),
        });
      } else {
        onSettingsChange({
          logoSize: Math.round(
            Math.min(
              96,
              Math.max(12, gesture.startFontSize * (width / gesture.startWidth)),
            ),
          ),
        });
      }
    }
  }

  function handleLogoPointerUp() {
    logoGesture.current = null;
  }

  useEffect(() => {
    if (document.getElementById(FONT_CSS_ID)) return;
    const link = document.createElement("link");
    link.id = FONT_CSS_ID;
    link.rel = "stylesheet";
    link.href = FONT_CSS_URL;
    document.head.appendChild(link);
  }, []);

  const updatePreviewScale = useCallback(() => {
    const boxWidth = boxRef.current?.getBoundingClientRect().width;
    const videoWidth = videoRef.current?.videoWidth;
    if (boxWidth && videoWidth) setPreviewScale(boxWidth / videoWidth);
  }, []);

  useEffect(() => {
    const box = boxRef.current;
    if (!box) return;
    const observer = new ResizeObserver(updatePreviewScale);
    observer.observe(box);
    return () => observer.disconnect();
  }, [updatePreviewScale]);

  const activeSegment = activeSegmentAt(segments, currentMs);

  // đồng bộ loa: tắt/bật tiếng gốc. Đang nghe thử lồng tiếng → tiếng gốc hạ
  // như bản xuất thật: trong câu = "giọng nói gốc", giữa các câu = "nhạc nền".
  // iOS BỎ QUA video.volume (chỉ nghe muted) → mức < 15% coi như tắt hẳn,
  // nếu không trên iPhone tiếng gốc vẫn kêu 100% đè lên giọng AI.
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    const level = !soundOn
      ? 0
      : !dubActive
        ? 100
        : activeSegment
          ? (dubOrigVoiceVolume ?? dubBgVolume)
          : dubBgVolume;
    video.volume = Math.min(1, Math.max(0, level / 100));
    video.muted = level < 15;
  }, [soundOn, dubActive, dubBgVolume, dubOrigVoiceVolume, activeSegment]);

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

  const covering = coverMode !== "none";

  // Ô che chữ gốc của DÒNG đang chạy — chỉ hiện khi đúng câu đó đang phát,
  // đúng như lúc render (ffmpeg bật/tắt theo enable='between(t,…)').
  const activeLineBox = activeSegment?.box ?? null;
  const lineCoverOn = covering && Boolean(activeLineBox) && Boolean(onActiveLineBoxChange);

  // Dòng đang chạy có tự chỉnh vị trí riêng → đặt chữ đúng chỗ đó (neo giữa-dưới,
  // khớp \an2\pos của ASS) và cho kéo/co giãn ngay trên khung xem trước.
  const activeLinePos = activeSegment?.pos ?? null;
  const lineLayoutOn = Boolean(activeLinePos) && Boolean(onActiveLineLayoutChange);
  /** cỡ chữ hiệu lực của câu đang chạy — riêng của dòng, không có thì lấy cỡ chung */
  const activeFontSize = activeSegment?.size ?? settings.fontSize;

  // khung phụ đề hiển thị: có subBox thì dùng, không thì dải đáy theo marginV
  const displaySubBox: CoverRegion = useMemo(() => {
    if (subBox) return subBox;
    const marginFrac = Math.min(0.8, settings.marginV / videoHeight);
    return { x: 0.05, y: 1 - marginFrac - 0.14, w: 0.9, h: 0.14 };
  }, [subBox, settings.marginV, videoHeight]);

  // đang dừng ở khoảng lặng → mượn câu đầu làm mẫu cho user chỉnh kiểu chữ
  const previewText =
    activeSegment?.text ??
    (!playing ? (segments[0]?.text ?? t.previewPlaceholder) : null);
  // thời lượng câu đang phát — nhịp cho hiệu ứng karaoke/reveal trong preview
  const segDurMs = Math.max(
    300,
    (activeSegment?.endMs ?? 2000) - (activeSegment?.startMs ?? 0),
  );

  // nghe thử lồng tiếng: sang câu mới → đọc câu đó bằng giọng đã chọn, ép tốc
  // độ đọc cho vừa khe thoại (khớp thời gian như bản xuất), tải trước câu kế
  const activeSegmentIndex = activeSegment?.i ?? null;
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

  function toNorm(e: React.PointerEvent) {
    const rect = boxRef.current!.getBoundingClientRect();
    return {
      x: clamp01((e.clientX - rect.left) / rect.width),
      y: clamp01((e.clientY - rect.top) / rect.height),
    };
  }

  function handlePointerDown(e: React.PointerEvent) {
    const p = toNorm(e);
    e.currentTarget.setPointerCapture(e.pointerId);

    // Dòng phụ đề tự chỉnh nằm TRÊN CÙNG về mặt hình ảnh (chữ đè lên ô che) nên
    // bắt trước. Đo vùng thật của khối chữ thay vì ước lượng — chữ dài ngắn khác nhau.
    if (lineLayoutOn && activeSegment && activeLinePos && subLineRef.current) {
      const sub = subLineRef.current.getBoundingClientRect();
      // tay cầm co giãn ở góc phải-dưới khối chữ
      if (
        Math.abs(e.clientX - sub.right) < 18 &&
        Math.abs(e.clientY - sub.bottom) < 18
      ) {
        setGesture({
          kind: "resize-line-sub",
          startX: p.x,
          startSize: activeSegment.size ?? settings.fontSize,
        });
        return;
      }
      if (
        e.clientX >= sub.left &&
        e.clientX <= sub.right &&
        e.clientY >= sub.top &&
        e.clientY <= sub.bottom
      ) {
        setGesture({
          kind: "move-line-sub",
          grab: { dx: p.x - activeLinePos.x, dy: p.y - activeLinePos.y },
        });
        return;
      }
    }

    // Ô che của dòng đang chạy được ưu tiên trước mọi thứ — nó là thứ user vừa
    // bật lên để chỉnh, và thường nằm đè lên vùng che/khung phụ đề.
    if (lineCoverOn && activeLineBox) {
      const rect = boxRef.current!.getBoundingClientRect();
      const cornerX = rect.left + (activeLineBox.x + activeLineBox.w) * rect.width;
      const cornerY = rect.top + (activeLineBox.y + activeLineBox.h) * rect.height;
      if (Math.abs(e.clientX - cornerX) < 18 && Math.abs(e.clientY - cornerY) < 18) {
        setGesture({ kind: "resize-line-cover" });
        return;
      }
      if (insideBox(p, activeLineBox)) {
        setGesture({
          kind: "move-line-cover",
          grab: { dx: p.x - activeLineBox.x, dy: p.y - activeLineBox.y },
        });
        return;
      }
    }

    // ưu tiên cao nhất: chạm gần góc phải-dưới một vùng che → đổi kích thước
    if (covering) {
      const rect = boxRef.current!.getBoundingClientRect();
      for (let i = regions.length - 1; i >= 0; i--) {
        const cornerX = rect.left + (regions[i].x + regions[i].w) * rect.width;
        const cornerY = rect.top + (regions[i].y + regions[i].h) * rect.height;
        if (Math.abs(e.clientX - cornerX) < 18 && Math.abs(e.clientY - cornerY) < 18) {
          setGesture({ kind: "resize-region", index: i });
          return;
        }
      }
    }
    // tiếp theo: kéo khung phụ đề → kéo vùng che → vẽ vùng mới
    if (previewText && insideBox(p, displaySubBox)) {
      setGesture({
        kind: "move-sub",
        grab: { dx: p.x - displaySubBox.x, dy: p.y - displaySubBox.y },
      });
      return;
    }
    if (covering) {
      for (let i = regions.length - 1; i >= 0; i--) {
        if (insideBox(p, regions[i])) {
          setGesture({
            kind: "move-region",
            index: i,
            grab: { dx: p.x - regions[i].x, dy: p.y - regions[i].y },
          });
          return;
        }
      }
      if (regions.length < MAX_COVER_REGIONS) {
        setGesture({ kind: "draw", start: p });
      }
    }
  }

  function handlePointerMove(e: React.PointerEvent) {
    if (!gesture) return;
    const p = toNorm(e);
    if (gesture.kind === "draw") {
      setDraft({
        x: Math.min(gesture.start.x, p.x),
        y: Math.min(gesture.start.y, p.y),
        w: Math.abs(p.x - gesture.start.x),
        h: Math.abs(p.y - gesture.start.y),
      });
    } else if (gesture.kind === "move-region") {
      const region = regions[gesture.index];
      const moved = {
        ...region,
        x: Math.min(Math.max(p.x - gesture.grab.dx, 0), 1 - region.w),
        y: Math.min(Math.max(p.y - gesture.grab.dy, 0), 1 - region.h),
      };
      onRegionsChange(regions.map((r, i) => (i === gesture.index ? moved : r)));
    } else if (gesture.kind === "resize-region") {
      const region = regions[gesture.index];
      const resized = {
        ...region,
        w: Math.min(1 - region.x, Math.max(0.03, p.x - region.x)),
        h: Math.min(1 - region.y, Math.max(0.03, p.y - region.y)),
      };
      onRegionsChange(regions.map((r, i) => (i === gesture.index ? resized : r)));
    } else if (gesture.kind === "move-line-sub") {
      if (!activeSegment) return;
      onActiveLineLayoutChange?.(activeSegment.i, {
        pos: {
          x: clamp01(p.x - gesture.grab.dx),
          y: clamp01(p.y - gesture.grab.dy),
        },
      });
    } else if (gesture.kind === "resize-line-sub") {
      if (!activeSegment) return;
      // kéo sang phải = to ra; 10% chiều ngang video ~ 20px cỡ chữ
      const next = Math.round(gesture.startSize + (p.x - gesture.startX) * 200);
      onActiveLineLayoutChange?.(activeSegment.i, {
        size: Math.min(160, Math.max(12, next)),
      });
    } else if (gesture.kind === "move-line-cover") {
      if (!activeSegment || !activeLineBox) return;
      onActiveLineBoxChange?.(activeSegment.i, {
        ...activeLineBox,
        x: Math.min(Math.max(p.x - gesture.grab.dx, 0), 1 - activeLineBox.w),
        y: Math.min(Math.max(p.y - gesture.grab.dy, 0), 1 - activeLineBox.h),
      });
    } else if (gesture.kind === "resize-line-cover") {
      if (!activeSegment || !activeLineBox) return;
      onActiveLineBoxChange?.(activeSegment.i, {
        ...activeLineBox,
        w: Math.min(1 - activeLineBox.x, Math.max(0.03, p.x - activeLineBox.x)),
        h: Math.min(1 - activeLineBox.y, Math.max(0.03, p.y - activeLineBox.y)),
      });
    } else {
      onSubBoxChange({
        ...displaySubBox,
        x: Math.min(Math.max(p.x - gesture.grab.dx, 0), 1 - displaySubBox.w),
        y: Math.min(Math.max(p.y - gesture.grab.dy, 0), 1 - displaySubBox.h),
      });
    }
  }

  function handlePointerUp() {
    if (gesture?.kind === "draw" && draft && draft.w > 0.02 && draft.h > 0.02) {
      onRegionsChange([...regions, draft]);
    }
    setGesture(null);
    setDraft(null);
  }

  function togglePlay() {
    const video = videoRef.current;
    if (!video) return;
    // đang trong cử chỉ chạm — tranh thủ mở khóa audio lồng tiếng cho iOS
    if (dubSupported) unlockDubAudio();
    if (video.paused) void video.play();
    else video.pause();
  }

  const boxAlpha = Math.round((settings.boxOpacity / 100) * 255)
    .toString(16)
    .padStart(2, "0");
  const outline = settings.outlineColor;

  return (
    <div>
      {/* w-fit + video giới hạn chiều cao: video dọc 9:16 không chiếm cả màn hình,
          overlay % vẫn khớp video vì container ôm sát; touch-none để kéo vùng che /
          phụ đề / logo trên điện thoại không bị cuộn trang giật */}
      <div
        ref={boxRef}
        className={cn(
          "relative mx-auto w-fit max-w-full touch-none select-none overflow-hidden rounded-lg bg-black",
          covering && regions.length < MAX_COVER_REGIONS
            ? "cursor-crosshair"
            : "cursor-default",
        )}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
      >
        <video
          ref={(el) => {
            videoRef.current = el;
            if (videoElRef) videoElRef.current = el;
          }}
          src={previewUrl}
          playsInline
          preload="metadata"
          onLoadedMetadata={(e) => {
            updatePreviewScale();
            setDurationMs(Math.round(e.currentTarget.duration * 1000));
            if (e.currentTarget.videoHeight) setVideoHeight(e.currentTarget.videoHeight);
          }}
          onTimeUpdate={(e) => {
            const ms = Math.round(e.currentTarget.currentTime * 1000);
            setCurrentMs(ms);
            onTimeChange?.(ms);
          }}
          onPlay={() => setPlaying(true)}
          onPause={() => setPlaying(false)}
          className="max-h-[62dvh] w-auto max-w-full lg:max-h-[76dvh]"
        />

        {/* vùng che — mô phỏng đúng chế độ đã chọn */}
        {covering &&
          [...regions, ...(draft ? [draft] : [])].map((r, idx) => (
            <div
              key={idx}
              className={cn(
                "absolute border border-dashed border-red-400/70",
                idx < regions.length && "cursor-move",
              )}
              style={{
                left: `${r.x * 100}%`,
                top: `${r.y * 100}%`,
                width: `${r.w * 100}%`,
                height: `${r.h * 100}%`,
                ...(coverMode === "blur"
                  ? {
                      backdropFilter: `blur(${Math.round(settings.blurStrength * 1.8)}px)`,
                      background: "rgba(255,255,255,0.02)",
                    }
                  : { background: "rgba(12,12,12,0.92)" }),
              }}
            >
              <span className="absolute left-0 top-0 bg-red-500/90 px-1 text-[10px] font-bold text-white">
                {idx + 1}
              </span>
              {/* nút góc đổi kích thước — hit-test nằm ở handlePointerDown của khung */}
              {idx < regions.length && (
                <span className="absolute -bottom-1.5 -right-1.5 h-3.5 w-3.5 cursor-nwse-resize rounded-sm border-2 border-white bg-red-500 shadow" />
              )}
            </div>
          ))}

        {/* ô che chữ gốc GẮN THEO DÒNG đang chạy — viền cam để phân biệt với
            vùng che đỏ (áp cả video). Mô phỏng đúng chế độ che đã chọn. */}
        {lineCoverOn && activeLineBox && (
          <div
            className="absolute cursor-move border-2 border-dashed border-primary-400"
            style={{
              left: `${activeLineBox.x * 100}%`,
              top: `${activeLineBox.y * 100}%`,
              width: `${activeLineBox.w * 100}%`,
              height: `${activeLineBox.h * 100}%`,
              ...(coverMode === "blur"
                ? {
                    backdropFilter: `blur(${Math.round(settings.blurStrength * 1.8)}px)`,
                    background: "rgba(255,255,255,0.02)",
                  }
                : { background: "rgba(12,12,12,0.92)" }),
            }}
          >
            <span className="absolute left-0 top-0 bg-primary-600 px-1 text-[10px] font-bold text-white">
              {t.lineCoverTag}
            </span>
            <span className="absolute -bottom-1.5 -right-1.5 h-3.5 w-3.5 cursor-nwse-resize rounded-sm border-2 border-white bg-primary-600 shadow" />
          </div>
        )}

        {/* phụ đề dịch thật — đúng font/cỡ/màu, kéo để đổi chỗ */}
        {previewText && (
          <div
            ref={subLineRef}
            className={cn(
              "absolute flex cursor-move flex-col items-center",
              lineLayoutOn ? "justify-start" : "justify-end",
            )}
            style={
              lineLayoutOn && activeLinePos
                ? {
                    // neo GIỮA-DƯỚI đúng như \an2\pos khi render ra video
                    left: `${activeLinePos.x * 100}%`,
                    top: `${activeLinePos.y * 100}%`,
                    transform: "translate(-50%, -100%)",
                    maxWidth: "94%",
                  }
                : {
                    left: `${displaySubBox.x * 100}%`,
                    top: `${displaySubBox.y * 100}%`,
                    width: `${displaySubBox.w * 100}%`,
                    height: `${displaySubBox.h * 100}%`,
                  }
            }
          >
            {/* chế độ "Cả hai": dòng bản gốc nhỏ phía trên */}
            {originalSegments && (
              <span
                className="mb-0.5 max-w-full px-1 text-center leading-tight text-white/85"
                style={{
                  fontSize: Math.max(8, activeFontSize * previewScale * 0.65),
                  textShadow: "0 0 3px #000, 0 0 3px #000",
                }}
              >
                {activeSegmentAt(originalSegments, currentMs)?.text ?? ""}
              </span>
            )}
            <span
              className="max-w-full px-1.5 py-0.5 text-center leading-tight"
              style={{
                fontFamily: `'${settings.font}', sans-serif`,
                fontSize: Math.max(9, activeFontSize * previewScale),
                fontWeight: settings.bold ? 700 : 400,
                backgroundColor: settings.boxed
                  ? `${settings.boxColor}${boxAlpha}`
                  : "transparent",
              }}
            >
              {/* span trong mang màu + hiệu ứng — key theo câu để animation chạy lại mỗi câu */}
              <span
                key={activeSegment?.i ?? -1}
                style={{
                  display: "inline-block",
                  color: settings.primaryColor,
                  textShadow: settings.boxed
                    ? "none"
                    : `-1px -1px 0 ${outline}, 1px -1px 0 ${outline}, -1px 1px 0 ${outline}, 1px 1px 0 ${outline}, 0 0 4px ${outline}`,
                  ...(settings.effect === "fade"
                    ? { animation: "sub-fade 0.18s ease-out both" }
                    : {}),
                  ...(settings.effect === "pop"
                    ? { animation: "sub-pop 0.16s ease-out both" }
                    : {}),
                  ...(settings.effect === "karaoke"
                    ? {
                        color: "transparent",
                        textShadow: "none",
                        backgroundImage: `linear-gradient(90deg, ${settings.primaryColor} 50%, #C9C9C9 50%)`,
                        backgroundSize: "200% 100%",
                        WebkitBackgroundClip: "text",
                        backgroundClip: "text",
                        WebkitTextStroke: settings.boxed ? undefined : `1px ${outline}`,
                        animation: `sub-karaoke ${segDurMs}ms linear both`,
                      }
                    : {}),
                }}
              >
                {settings.effect === "karaoke" ? (
                  previewText.replace(/\*/g, "")
                ) : (
                  <AccentedWords
                    text={previewText}
                    accentColor={settings.accentColor}
                    reveal={settings.effect === "reveal"}
                    durMs={segDurMs}
                  />
                )}
              </span>
            </span>
            {/* dòng đang tự chỉnh: viền cam + tay cầm co giãn cỡ chữ ở góc phải-dưới */}
            {lineLayoutOn && (
              <>
                <span className="pointer-events-none absolute inset-0 rounded border border-dashed border-primary-400" />
                <span className="absolute -bottom-1.5 -right-1.5 h-3.5 w-3.5 cursor-nwse-resize rounded-sm border-2 border-white bg-primary-600 shadow" />
              </>
            )}
          </div>
        )}

        {/* logo / watermark — kéo để đổi chỗ, kéo ô góc để đổi kích thước */}
        {settings.logoOn && (
          <div
            ref={logoRef}
            onPointerDown={handleLogoPointerDown}
            onPointerMove={handleLogoPointerMove}
            onPointerUp={handleLogoPointerUp}
            className={cn(
              "group absolute touch-none",
              onSettingsChange ? "cursor-move" : "pointer-events-none",
            )}
            style={{
              ...(settings.logoFx !== null && settings.logoFy !== null
                ? {
                    left: `${settings.logoFx * 100}%`,
                    top: `${settings.logoFy * 100}%`,
                    transform: `translate(-${settings.logoFx * 100}%, -${settings.logoFy * 100}%)`,
                  }
                : LOGO_CORNER[settings.logoPosition]),
              opacity: settings.logoOpacity / 100,
              ...(settings.logoType === "image"
                ? { width: `${settings.logoScale}%` }
                : {}),
            }}
          >
            {settings.logoType === "image" && settings.logoImageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={settings.logoImageUrl} alt="logo" className="w-full" draggable={false} />
            ) : settings.logoType === "text" && settings.logoText.trim() ? (
              <span
                className="whitespace-nowrap"
                style={{
                  fontSize: Math.max(8, settings.logoSize * previewScale),
                  fontWeight: 700,
                  color: settings.logoColor,
                  textShadow: "0 0 3px rgba(0,0,0,0.5)",
                }}
              >
                {settings.logoText}
              </span>
            ) : null}
            {/* ô kéo đổi kích thước — hiện khi rê chuột vào logo */}
            {onSettingsChange && (
              <span
                onPointerDown={handleLogoResizeDown}
                className="absolute -bottom-1.5 -right-1.5 hidden h-3 w-3 cursor-nwse-resize rounded-sm border border-white bg-primary-500 group-hover:block"
              />
            )}
          </div>
        )}
      </div>

      {/* điều khiển phát — tự làm để không vướng lớp kéo thả phía trên */}
      <div className="mt-2 flex items-center gap-3">
        <button
          type="button"
          onClick={togglePlay}
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
          onChange={(e) => {
            const ms = Number(e.target.value);
            setCurrentMs(ms);
            if (videoRef.current) videoRef.current.currentTime = ms / 1000;
          }}
          className="w-full"
        />
        <span className="shrink-0 font-mono text-xs text-neutral-400">
          {Math.floor(currentMs / 60000)}:
          {String(Math.floor((currentMs % 60000) / 1000)).padStart(2, "0")}
        </span>
        <button
          type="button"
          onClick={() => setSoundOn((v) => !v)}
          title={soundOn ? t.muteOrig : t.unmuteOrig}
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-neutral-300 text-neutral-600 hover:bg-neutral-100 dark:border-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-800"
        >
          {soundOn ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
        </button>
        {dubVoice && (
          <button
            type="button"
            onClick={() => {
              unlockDubAudio();
              setDubMuted((v) => !v);
            }}
            disabled={!dubSupported}
            title={
              !dubSupported ? t.dubUnsupported : dubActive ? t.dubOff : t.dubOn
            }
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
    </div>
  );
}
