"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  MAX_COVER_REGIONS,
  type CoverMode,
  type CoverRegion,
  type SubtitleSegment,
} from "@dichvideo/shared";
import type { Lang } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { useDubPreview } from "@/hooks/use-dub-preview";
import { useLogoGesture } from "@/hooks/use-logo-gesture";
import { AccentedWords } from "./accented-words";
import { PreviewControls } from "./preview-controls";
import { subtitleBoxStyle, subtitleTextStyle } from "./subtitle-text-style";
import {
  LOGO_CORNER,
  activeSegmentAt,
  clamp01,
  insideBox,
  type Gesture,
} from "./preview-geometry";
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

/**
 * Nạp font render từ Google Fonts để preview đúng mặt chữ.
 *
 * Chỉ tải ĐÚNG BỘ ĐANG CHỌN, không tải cả 10 bộ như trước: preview chỉ vẽ bằng
 * một `settings.font` tại một thời điểm, mà mỗi bộ có subset tiếng Việt khá nặng
 * — tải cả 10 là ném đi vài trăm KB mỗi lần mở studio. Đổi font thì nạp thêm bộ
 * mới và GIỮ bộ cũ trong <head>, nên bấm qua lại giữa vài font không tải lại.
 */
const FONT_CSS_ID = "render-preview-font";

/** Bộ chữ có sẵn nét đậm — bộ chỉ một nét mà xin wght@700 thì Google trả 400. */
const FONTS_WITH_BOLD = new Set([
  "Be Vietnam Pro",
  "Montserrat",
  "Noto Sans",
  "Oswald",
  "Baloo 2",
]);

function fontCssUrl(family: string): string {
  const name = family.replace(/ /g, "+");
  const weights = FONTS_WITH_BOLD.has(family) ? ":wght@400;700" : "";
  return `https://fonts.googleapis.com/css2?family=${name}${weights}&display=swap`;
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
  // kéo/resize logo trực tiếp trên khung preview — xem hooks/use-logo-gesture.ts
  const logoRef = useRef<HTMLDivElement>(null);
  const logoGesture = useLogoGesture({
    boxRef,
    logoRef,
    settings,
    onSettingsChange,
  });

  useEffect(() => {
    // id gắn theo tên bộ chữ → mỗi bộ chỉ chèn <link> một lần, đổi qua lại không tải lại
    const id = `${FONT_CSS_ID}-${settings.font.replace(/\s/g, "-")}`;
    if (document.getElementById(id)) return;
    const link = document.createElement("link");
    link.id = id;
    link.rel = "stylesheet";
    link.href = fontCssUrl(settings.font);
    document.head.appendChild(link);
  }, [settings.font]);

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

  // nghe thử lồng tiếng theo từng câu — xem hooks/use-dub-preview.ts
  const { dubSupported, dubActive, setDubMuted, unlockDubAudio } =
    useDubPreview({
      dubVoice,
      playing,
      activeSegmentIndex: activeSegment?.i ?? null,
      segments,
      durationMs,
      dubAiVolume,
      dubSpeed,
    });

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
              style={subtitleBoxStyle(
                settings,
                Math.max(9, activeFontSize * previewScale),
              )}
            >
              {/* span trong mang màu + hiệu ứng — key theo câu để animation chạy lại mỗi câu */}
              <span
                key={activeSegment?.i ?? -1}
                style={subtitleTextStyle(settings, segDurMs)}
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
            onPointerDown={logoGesture.onPointerDown}
            onPointerMove={logoGesture.onPointerMove}
            onPointerUp={logoGesture.onPointerUp}
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
                onPointerDown={logoGesture.onResizeDown}
                className="absolute -bottom-1.5 -right-1.5 hidden h-3 w-3 cursor-nwse-resize rounded-sm border border-white bg-primary-500 group-hover:block"
              />
            )}
          </div>
        )}
      </div>

      <PreviewControls
        t={t}
        playing={playing}
        currentMs={currentMs}
        durationMs={durationMs}
        onTogglePlay={togglePlay}
        onSeek={(ms) => {
          setCurrentMs(ms);
          if (videoRef.current) videoRef.current.currentTime = ms / 1000;
        }}
        soundOn={soundOn}
        onToggleSound={() => setSoundOn((v) => !v)}
        dubVoice={dubVoice}
        dubSupported={dubSupported}
        dubActive={dubActive}
        onToggleDub={() => {
          unlockDubAudio();
          setDubMuted((v) => !v);
        }}
        covering={covering}
        regions={regions}
        onRegionsChange={onRegionsChange}
      />
    </div>
  );
}
