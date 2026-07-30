"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { Plus, Replace, Stamp, TriangleAlert } from "lucide-react";
import {
  segmentIndexAtOrBefore,
  type CoverMode,
  type CoverRegion,
  type SubtitleSegment,
} from "@dichvideo/shared";
import { useEditorState } from "@/hooks/use-editor-state";
import type { Lang } from "@/lib/i18n";
import { Modal, ModalAnchorContext } from "@/components/ui/modal";
import { useToast } from "@/components/ui/toaster";
import { inputClass } from "@/components/ui/form-styles";
import { cn } from "@/lib/utils";
import { RenderPreview } from "@/components/render/render-preview";
import {
  DEFAULT_BAND,
  DEFAULT_RENDER_SETTINGS,
  lowestRegion,
  type RenderSettings,
} from "@/components/render/render-settings";
import {
  loadLastPresetName,
  loadStudioPresets,
  storeLastPresetName,
  type StudioPreset,
} from "./studio-presets";
import { LogoFields } from "@/components/render/logo-fields";
import { SegmentTable } from "@/components/editor/segment-table";
import { DEFAULT_VOICE_SELECTION, resolveVoice } from "@/components/dub/voice-picker";
import type { DubConfig } from "./export-modal";
import { StudioToolbar } from "./studio-toolbar";

/**
 * Các modal chỉ mở khi người dùng bấm nút, nhưng trước đây vẫn bị tải + phân
 * tích ngay lúc vào studio (~1.400 dòng JS). Tải động để route nặng nhất của
 * app tương tác được sớm hơn, nhất là trên 4G.
 */
// Tách hàm import ra riêng để vừa truyền cho dynamic(), vừa gọi NẠP TRƯỚC lúc
// vào studio — tránh khựng một nhá khi bấm mở công cụ lần đầu (phải tải chunk).
const loadRetranslate = () =>
  import("@/components/editor/retranslate-modal").then((m) => m.RetranslateModal);
const loadExport = () => import("./export-modal").then((m) => m.ExportModal);
const loadCover = () => import("./cover-modal").then((m) => m.CoverModal);
const loadStyle = () => import("./style-modal").then((m) => m.StyleModal);
const loadDub = () => import("./dub-modal").then((m) => m.DubModal);
const loadPresets = () => import("./presets-modal").then((m) => m.PresetsModal);
const loadAddSegment = () => import("./add-segment-modal").then((m) => m.AddSegmentModal);

const RetranslateModal = dynamic(loadRetranslate);
const ExportModal = dynamic(loadExport);
const CoverModal = dynamic(loadCover);
const StyleModal = dynamic(loadStyle);
const DubModal = dynamic(loadDub);
const PresetsModal = dynamic(loadPresets);
const AddSegmentModal = dynamic(loadAddSegment);

/** Nạp sẵn mọi bảng công cụ để lần bấm đầu tiên mở tức thì (không tải chunk lúc bấm). */
function preloadStudioModals() {
  void loadRetranslate();
  void loadExport();
  void loadCover();
  void loadStyle();
  void loadDub();
  void loadPresets();
  void loadAddSegment();
}

const T = {
  vi: {
    saveLabels: {
      saved: "Đã lưu",
      dirty: "Chờ lưu…",
      saving: "Đang lưu…",
      conflict: "Xung đột — tải lại trang",
      error: "Lỗi lưu — thử lại",
    },
    saveNow: "Lưu ngay",
    aiTranslate: "Dịch Bằng AI",
    blurBtn: "Làm mờ",
    subtitleBtn: "Phụ Đề",
    logoBtn: "Logo",
    dubBtn: "Lồng Tiếng",
    dubBtnOn: ": Bật",
    presetsBtn: "Cài đặt đã lưu",
    exportBtn: "Xuất File",
    subtitleViews: [
      { id: "translated", label: "Bản dịch" },
      { id: "original", label: "Bản gốc" },
      { id: "both", label: "Cả hai" },
    ] as { id: "translated" | "original" | "both"; label: string }[],
    loadingVideo: "Đang tải video…",
    findReplace: "Tìm & thay thế (cột bản dịch)",
    findPh: "Tìm…",
    replacePh: "Thay bằng…",
    replaceBtn: "Thay",
    replacedToast: (n: number) => `Đã thay ${n} chỗ`,
    replaceNone: "Không tìm thấy chỗ nào để thay",
    autoScroll: "Tự cuộn danh sách theo video",
    lines: "dòng",
    avgTitle: "Tốc độ đọc trung bình của bản dịch — nên dưới 20 ký tự/giây",
    avgLabel: "TB:",
    lineLayoutToast: "Dòng này đã tách riêng — kéo chữ trên video để đổi chỗ, kéo ô góc để đổi cỡ",
    lineCoverToast: "Đã thêm ô che cho dòng này — kéo/co ô cam trên video cho trùng chữ gốc",
    addLineToast: "Đã thêm dòng phụ đề vào đúng khoảng thời gian bạn chọn",
    addLineTitle: "Thêm dòng phụ đề vào khoảng thời gian bạn tự chọn",
    addLine: "Thêm phụ đề",
    logoTitle: "Logo / tên kênh",
  },
  en: {
    saveLabels: {
      saved: "Saved",
      dirty: "Pending save…",
      saving: "Saving…",
      conflict: "Conflict — reload the page",
      error: "Save failed — retry",
    },
    saveNow: "Save now",
    aiTranslate: "AI Translate",
    blurBtn: "Blur",
    subtitleBtn: "Subtitles",
    logoBtn: "Logo",
    dubBtn: "Dubbing",
    dubBtnOn: ": On",
    presetsBtn: "Saved presets",
    exportBtn: "Export",
    subtitleViews: [
      { id: "translated", label: "Translation" },
      { id: "original", label: "Original" },
      { id: "both", label: "Both" },
    ] as { id: "translated" | "original" | "both"; label: string }[],
    loadingVideo: "Loading video…",
    findReplace: "Find & replace (translation column)",
    findPh: "Find…",
    replacePh: "Replace with…",
    replaceBtn: "Replace",
    replacedToast: (n: number) => `Replaced ${n} occurrence${n === 1 ? "" : "s"}`,
    replaceNone: "Nothing found to replace",
    autoScroll: "Auto-scroll the list with the video",
    lines: "lines",
    avgTitle: "Average reading speed of the translation — should stay under 20 chars/second",
    avgLabel: "Avg:",
    lineLayoutToast: "This line is now independent — drag the text to move it, drag the corner to resize",
    lineCoverToast: "Cover box added for this line — drag the orange box over the original text",
    addLineToast: "Subtitle line added at the time range you picked",
    addLineTitle: "Add a subtitle line at a time range you choose",
    addLine: "Add subtitle",
    logoTitle: "Logo / channel name",
  },
} as const;

type StudioModal =
  | "retranslate"
  | "cover"
  | "style"
  | "logo"
  | "dub"
  | "presets"
  | "addSegment"
  | "export"
  | null;

interface StudioShellProps {
  videoId: string;
  videoName: string;
  previewUrl: string | null;
  /** video OCR có chữ trên hình → "blur"; video STT chỉ tiếng nói → "none" */
  defaultCoverMode: CoverMode;
  trackId: string;
  originalTrackId: string | null;
  trackVersion: number;
  durationSec: number | null;
  original: SubtitleSegment[];
  translated: SubtitleSegment[];
  /** tài khoản dùng thử (chưa nạp) → watermark preview + nhắc nạp */
  isTrial?: boolean;
  lang?: Lang;
}

/**
 * Studio chỉnh sửa trước khi xuất (luồng gensubai): video preview chạy phụ đề
 * thật bên trái, bảng phụ đề gốc/dịch bên phải, toolbar thiết lập phía trên.
 * Mọi chỉnh sửa miễn phí — chỉ "Xuất File" mới tốn credits.
 */
export function StudioShell({
  videoId,
  videoName,
  previewUrl,
  defaultCoverMode,
  trackId,
  originalTrackId,
  trackVersion,
  durationSec,
  original,
  translated,
  isTrial = false,
  lang = "vi",
}: StudioShellProps) {
  const t = T[lang];
  const {
    segments,
    saveState,
    updateSegmentText,
    updateSegmentTime,
    insertSegment,
    setSegmentLayout,
    setSegmentSpeaker,
    setSegmentBox,
    deleteSegment,
    replaceAll,
    saveNow,
  } = useEditorState(trackId, translated, trackVersion);

  /** ô che mặc định khi bật che cho 1 dòng — dải đáy, nơi chữ gốc hay nằm */
  const DEFAULT_LINE_BOX = { x: 0.06, y: 0.72, w: 0.88, h: 0.14 };

  const [modal, setModal] = useState<StudioModal>(null);
  // vị trí nút vừa bấm để bảng công cụ neo ngay dưới nút đó (xem ModalAnchorContext)
  const [anchorRect, setAnchorRect] = useState<DOMRect | null>(null);
  const openModal = (m: StudioModal, e?: React.MouseEvent<HTMLElement>) => {
    if (e) setAnchorRect(e.currentTarget.getBoundingClientRect());
    setModal(m);
  };
  // nạp trước chunk các bảng công cụ ngay sau khi studio hiện, để lần bấm đầu
  // tiên không phải chờ tải → hết "giật load"
  useEffect(() => {
    const timer = setTimeout(preloadStudioModals, 300);
    return () => clearTimeout(timer);
  }, []);
  const [settings, setSettings] = useState<RenderSettings>({
    ...DEFAULT_RENDER_SETTINGS,
    coverMode: defaultCoverMode,
  });
  const [regions, setRegions] = useState<CoverRegion[]>(
    defaultCoverMode === "none" ? [] : [DEFAULT_BAND],
  );
  const [manualSubBox, setManualSubBox] = useState<CoverRegion | null>(null);
  const [dub, setDub] = useState<DubConfig>({
    enabled: false,
    selection: DEFAULT_VOICE_SELECTION,
    selection2: null,
    selection3: null,
    speed: 1,
    pitch: 0,
    aiVolume: 100,
    bgVolume: 20,
    origVoiceVolume: 5,
  });
  // xem phụ đề nào trên video: bản dịch / bản gốc / cả hai
  const [subtitleView, setSubtitleView] = useState<"translated" | "original" | "both">(
    "translated",
  );

  const { toast } = useToast();
  /**
   * Video bắn mốc thời gian ~4 lần/giây. Trước đây mỗi lần đều setState ở đây →
   * render lại TOÀN BỘ cây studio (khung xem trước, bảng phụ đề, các panel) →
   * giật rõ trên điện thoại. Nay mốc thời gian giữ trong ref (không gây render),
   * chỉ `activeIndex` mới là state — và nó chỉ đổi khi sang câu KHÁC, tức vài
   * giây một lần thay vì 4 lần/giây.
   */
  const currentMsRef = useRef(0);
  const [activeIndex, setActiveIndex] = useState(-1);
  /** mốc thời gian chụp lại lúc mở hộp thoại "Thêm phụ đề" (đọc ref trong render là vi phạm lint) */
  const [addSegmentAtMs, setAddSegmentAtMs] = useState(0);
  const [autoScroll, setAutoScroll] = useState(true);
  const [find, setFind] = useState("");
  const [replace, setReplace] = useState("");
  const videoElRef = useRef<HTMLVideoElement | null>(null);

  const patch = (p: Partial<RenderSettings>) =>
    setSettings((prev) => ({ ...prev, ...p }));

  /** số giọng đang bật (1..3) — quyết định có hiện nút gán nhân vật hay không */
  const voiceCount =
    1 + (dub.selection2 ? 1 : 0) + (dub.selection3 ? 1 : 0);

  /** Đổi nhân vật đọc dòng này, xoay vòng trong số giọng đang bật. */
  function cycleSpeaker(i: number) {
    const seg = segments.find((s) => s.i === i);
    if (!seg) return;
    setSegmentSpeaker(i, ((seg.speaker ?? 0) + 1) % voiceCount);
  }

  /**
   * Bật/tắt vị trí + cỡ chữ RIÊNG cho một dòng. Bật lên thì dòng đó tách khỏi
   * vị trí chung, kéo thả và co giãn trực tiếp trên khung xem trước.
   */
  function toggleLineLayout(i: number) {
    const seg = segments.find((s) => s.i === i);
    if (!seg) return;
    if (seg.pos) {
      setSegmentLayout(i, { pos: null, size: null });
      return;
    }
    // đặt ngay chỗ phụ đề đang hiện (neo giữa-dưới) để không bị nhảy vị trí
    setSegmentLayout(i, {
      pos: {
        x: effectiveSubBox ? effectiveSubBox.x + effectiveSubBox.w / 2 : 0.5,
        y: effectiveSubBox ? effectiveSubBox.y + effectiveSubBox.h : 0.9,
      },
    });
    if (videoElRef.current) videoElRef.current.currentTime = seg.startMs / 1000;
    toast(t.lineLayoutToast, "info");
  }

  /**
   * Bật/tắt che chữ gốc cho MỘT dòng phụ đề. Ô che chỉ hiện đúng lúc dòng đó
   * chạy — hợp với video có chữ nước ngoài rải rác nhiều chỗ, nhiều thời điểm.
   */
  function toggleLineCover(i: number) {
    const seg = segments.find((s) => s.i === i);
    if (!seg) return;
    if (seg.box) {
      setSegmentBox(i, null);
      return;
    }
    // Chế độ che đang TẮT thì ô che sẽ bị bỏ qua cả ở preview lẫn lúc render
    // → bật lại, nếu không người dùng bấm mà chẳng thấy gì xảy ra.
    if (settings.coverMode === "none") patch({ coverMode: "blur" });
    setSegmentBox(i, DEFAULT_LINE_BOX);
    // nhảy tới đúng câu để thấy ngay ô che mà kéo/chỉnh
    if (videoElRef.current) videoElRef.current.currentTime = seg.startMs / 1000;
    toast(t.lineCoverToast, "info");
  }

  /** Áp một preset đã lưu (giữ coverMode theo loại video hiện tại). */
  function applyPreset(name: string, preset: StudioPreset) {
    setSettings((prev) => ({
      ...DEFAULT_RENDER_SETTINGS,
      ...preset.settings,
      coverMode: prev.coverMode,
    }));
    setDub((prev) => ({ ...prev, ...preset.dub }));
    storeLastPresetName(name);
  }

  // lần sau mở studio → tự áp preset dùng gần nhất (chạy sau frame đầu để không đá hydration)
  useEffect(() => {
    const timer = setTimeout(() => {
      const name = loadLastPresetName();
      if (!name) return;
      const preset = loadStudioPresets()[name];
      if (preset) applyPreset(name, preset);
    }, 0);
    return () => clearTimeout(timer);
  }, []);

  const covering = settings.coverMode !== "none";
  const replaceRegion =
    covering && settings.placeOver ? lowestRegion(regions) : null;
  const autoSubBox = replaceRegion
    ? { x: 0.05, y: replaceRegion.y, w: 0.9, h: replaceRegion.h }
    : null;
  const effectiveSubBox = manualSubBox ?? autoSubBox;

  /**
   * Nhận mốc thời gian từ khung xem trước. Ghi vào ref (không render) rồi chỉ
   * setState khi chỉ số dòng đang phát ĐỔI — gọi setState với đúng giá trị cũ
   * thì React tự bỏ qua, nên 4 lần/giây gần như không tốn gì.
   */
  const handleTimeChange = useCallback(
    (ms: number) => {
      currentMsRef.current = ms;
      const idx = segmentIndexAtOrBefore(segments, ms);
      setActiveIndex((prev) => (prev === idx ? prev : idx));
    },
    [segments],
  );

  // danh sách câu đổi (sửa/thêm/xóa) → tính lại chỉ số dòng đang phát cho khớp
  useEffect(() => {
    const idx = segmentIndexAtOrBefore(segments, currentMsRef.current);
    setActiveIndex((prev) => (prev === idx ? prev : idx));
  }, [segments]);

  return (
    /**
     * ĐIỆN THOẠI: để trang cuộn tự nhiên, KHÔNG khóa chiều cao.
     * Trước đây h-[calc(100dvh-7.5rem)] áp cho mọi cỡ màn: trên máy 360×640,
     * thanh công cụ 8 nút xuống 3-4 hàng đã ăn ~140px, phần còn lại phải chứa
     * cả video 16:9 lẫn bảng phụ đề (min-h-96) — bảng gần như không tới được.
     * Từ lg trở lên mới khóa, vì lúc đó bố cục 2 cột cần chiều cao cố định để
     * hai bên cuộn độc lập.
     */
    <div className="flex flex-col gap-3 lg:h-[calc(100dvh-7.5rem)]">
      {isTrial && (
        <a
          href="/credits"
          className="flex items-center gap-2 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-xs font-medium text-amber-800 hover:bg-amber-100 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-200 dark:hover:bg-amber-950/50"
        >
          <TriangleAlert className="h-4 w-4 shrink-0" />
          <span>
            {lang === "vi"
              ? "Tài khoản dùng thử — video xuất ra sẽ gắn watermark “SubVideo AI”. Nạp tiền để gỡ watermark & mở giới hạn 5 phút."
              : "Trial account — exported videos get a “SubVideo AI” watermark. Top up to remove it and unlock the 5-minute limit."}
          </span>
        </a>
      )}
      <StudioToolbar
        t={t}
        saveState={saveState}
        onSaveNow={saveNow}
        onOpenModal={openModal}
        dubEnabled={dub.enabled}
      />

      {/* màn nhỏ xếp dọc (preview trên, bảng dưới); từ lg trở lên chia 2 cột */}
      <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto lg:flex-row lg:overflow-visible">
        {/* Trái: preview + tìm & thay — 1/2 màn hình để video xem trước đủ lớn khi chỉnh */}
        <div className="flex w-full shrink-0 flex-col gap-3 lg:w-1/2 lg:min-w-72 lg:shrink lg:overflow-y-auto">
          {/* xem phụ đề nào trên video */}
          <div className="flex items-center gap-1 self-start rounded-lg border border-neutral-200 p-0.5 text-xs dark:border-neutral-700">
            {t.subtitleViews.map((v) => (
              <button
                key={v.id}
                type="button"
                onClick={() => setSubtitleView(v.id)}
                className={cn(
                  "rounded-md px-2.5 py-1 font-medium",
                  subtitleView === v.id
                    ? "bg-primary-600 text-white"
                    : "text-neutral-500 hover:bg-neutral-100 dark:text-neutral-400 dark:hover:bg-neutral-800",
                )}
              >
                {v.label}
              </button>
            ))}
          </div>

          {previewUrl ? (
            <div className="relative">
            <RenderPreview
              previewUrl={previewUrl}
              segments={subtitleView === "original" ? original : segments}
              originalSegments={subtitleView === "both" ? original : null}
              coverMode={settings.coverMode}
              regions={regions}
              onRegionsChange={setRegions}
              settings={settings}
              subBox={effectiveSubBox}
              onSubBoxChange={setManualSubBox}
              onTimeChange={handleTimeChange}
              videoElRef={videoElRef}
              dubVoice={
                dub.enabled && subtitleView !== "original"
                  ? resolveVoice(dub.selection)
                  : null
              }
              dubBgVolume={dub.bgVolume}
              dubOrigVoiceVolume={dub.origVoiceVolume}
              dubAiVolume={dub.aiVolume}
              dubSpeed={dub.speed}
              onSettingsChange={patch}
              onActiveLineBoxChange={setSegmentBox}
              onActiveLineLayoutChange={setSegmentLayout}
              lang={lang}
            />
            {/*
              Tài khoản dùng thử: nhắc trước rằng bản xuất sẽ có watermark.
              Đặt CHÍNH GIỮA và cỡ lớn cho khớp bản render thật — worker burn ở
              `x=(w-tw)/2:y=(h-th)/2` với cỡ chữ = chiều cao khung / 16
              (`trialWatermarkDrawText`). Lệch lên 18% như trước khiến khách
              tưởng watermark nằm chỗ khác và nhỏ hơn thực tế.
            */}
            {isTrial && (
              <span className="pointer-events-none absolute inset-0 flex items-center justify-center">
                <span className="select-none text-4xl font-bold text-white/45 [text-shadow:0_2px_6px_rgba(0,0,0,0.55)] sm:text-5xl lg:text-6xl">
                  SubVideo AI
                </span>
              </span>
            )}
            </div>
          ) : (
            <div className="flex aspect-video items-center justify-center rounded-lg bg-neutral-100 text-sm text-neutral-400 dark:bg-neutral-900">
              {t.loadingVideo}
            </div>
          )}

          <div className="rounded-lg border border-neutral-200 bg-white p-3 dark:border-neutral-800 dark:bg-neutral-900">
            <p className="flex items-center gap-2 text-xs font-medium text-neutral-500 dark:text-neutral-400">
              <Replace className="h-3.5 w-3.5" /> {t.findReplace}
            </p>
            {/* điện thoại: 2 ô + nút trên một hàng thì mỗi ô còn ~110px, xếp dọc */}
            <div className="mt-2 flex flex-col gap-2 sm:flex-row">
              <input
                value={find}
                onChange={(e) => setFind(e.target.value)}
                placeholder={t.findPh}
                className={cn(inputClass, "w-full")}
              />
              <input
                value={replace}
                onChange={(e) => setReplace(e.target.value)}
                placeholder={t.replacePh}
                className={cn(inputClass, "w-full")}
              />
              <button
                type="button"
                onClick={() => {
                  const replacedCount = replaceAll(find, replace);
                  toast(
                    replacedCount > 0
                      ? t.replacedToast(replacedCount)
                      : t.replaceNone,
                    replacedCount > 0 ? "success" : "info",
                  );
                }}
                className="shrink-0 rounded bg-primary-600 px-3 py-1 text-sm text-white hover:bg-primary-700"
              >
                {t.replaceBtn}
              </button>
            </div>
          </div>

          <label className="flex items-center gap-2 text-sm text-neutral-600 dark:text-neutral-300">
            <input
              type="checkbox"
              checked={autoScroll}
              onChange={(e) => setAutoScroll(e.target.checked)}
            />
            {t.autoScroll}
          </label>
        </div>

        {/* Phải: bảng phụ đề gốc / dịch */}
        <div className="flex min-h-96 min-w-0 flex-1 flex-col rounded-lg border border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 border-b border-neutral-200 px-3 py-2 dark:border-neutral-800">
            <p className="min-w-0 flex-1 truncate text-sm font-semibold">
              {videoName} — {segments.length} {t.lines}
            </p>
            {(() => {
              // tốc độ đọc trung bình của bản dịch (C/S)
              const totalChars = segments.reduce(
                (sum, s) => sum + s.text.replace(/\s/g, "").length,
                0,
              );
              const totalSec = segments.reduce(
                (sum, s) => sum + Math.max(0, s.endMs - s.startMs) / 1000,
                0,
              );
              if (totalSec <= 0) return null;
              const avg = Math.round((totalChars / totalSec) * 10) / 10;
              return (
                <span
                  title={t.avgTitle}
                  className={cn(
                    "shrink-0 rounded bg-neutral-100 px-1.5 py-0.5 font-mono text-[11px] dark:bg-neutral-800",
                    avg > 20 ? "font-semibold text-red-500" : "text-neutral-500",
                  )}
                >
                  {t.avgLabel} {avg} C/S
                </span>
              );
            })()}
            <button
              type="button"
              onClick={() => {
                // chụp mốc đang xem NGAY lúc bấm — mốc này giữ trong ref nên
                // không đọc được trong lúc render
                setAddSegmentAtMs(currentMsRef.current);
                setModal("addSegment");
              }}
              title={t.addLineTitle}
              className="flex shrink-0 items-center gap-1 rounded-md border border-primary-300 px-2 py-1 text-xs font-medium text-primary-700 hover:bg-primary-50 dark:border-primary-700 dark:text-primary-300 dark:hover:bg-primary-950/40"
            >
              <Plus className="h-3.5 w-3.5" /> {t.addLine}
            </button>
          </div>
          <div className="min-h-0 flex-1">
            <SegmentTable
              original={original}
              translated={segments}
              activeIndex={activeIndex}
              autoScroll={autoScroll}
              onEdit={updateSegmentText}
              onEditTime={updateSegmentTime}
              onToggleLayout={toggleLineLayout}
              voiceCount={voiceCount}
              onCycleSpeaker={cycleSpeaker}
              onToggleCover={toggleLineCover}
              onDelete={deleteSegment}
              onRowClick={(startMs) => {
                if (videoElRef.current) videoElRef.current.currentTime = startMs / 1000;
              }}
              lang={lang}
            />
          </div>
        </div>
      </div>

      {/* ---- Modals ---- */}
      <ModalAnchorContext.Provider value={anchorRect}>
      {modal === "addSegment" && (
        <AddSegmentModal
          currentMs={addSegmentAtMs}
          durationSec={durationSec}
          onAdd={(startMs, endMs, text) => {
            insertSegment(startMs, endMs, text);
            toast(t.addLineToast, "info");
          }}
          onClose={() => setModal(null)}
          lang={lang}
        />
      )}

      {modal === "retranslate" && (
        <RetranslateModal
          videoId={videoId}
          lineCount={segments.length}
          onClose={() => setModal(null)}
          lang={lang}
        />
      )}

      {modal === "cover" && (
        <CoverModal
          settings={settings}
          onChange={patch}
          regions={regions}
          onRegionsChange={setRegions}
          manualSubBox={manualSubBox}
          onManualSubBoxChange={setManualSubBox}
          onClose={() => setModal(null)}
          lang={lang}
        />
      )}

      {modal === "style" && (
        <StyleModal
          settings={settings}
          onChange={patch}
          hideMarginV={effectiveSubBox !== null}
          onClose={() => setModal(null)}
          lang={lang}
        />
      )}

      {modal === "logo" && (
        <Modal
          title={
            <>
              <Stamp className="h-4 w-4 text-primary-500" /> {t.logoTitle}
            </>
          }
          onClose={() => setModal(null)}
          wide
          dock
          lang={lang}
        >
          <LogoFields settings={settings} onChange={patch} lang={lang} />
        </Modal>
      )}

      {modal === "dub" && (
        <DubModal
          dub={dub}
          setDub={setDub}
          durationSec={durationSec}
          onClose={() => setModal(null)}
          lang={lang}
        />
      )}

      {modal === "presets" && (
        <PresetsModal
          settings={settings}
          dub={dub}
          regions={regions}
          onApply={applyPreset}
          onClose={() => setModal(null)}
          lang={lang}
        />
      )}


      {modal === "export" && (
        <ExportModal
          videoId={videoId}
          trackId={trackId}
          originalTrackId={originalTrackId}
          durationSec={durationSec}
          settings={settings}
          regions={regions}
          subBox={effectiveSubBox}
          dub={dub}
          isTrial={isTrial}
          onClose={() => setModal(null)}
          lang={lang}
        />
      )}
      </ModalAnchorContext.Provider>
    </div>
  );
}
