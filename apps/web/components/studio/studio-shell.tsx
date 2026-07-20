"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import {
  Check,
  Droplets,
  Loader2,
  Mic,
  Plus,
  Replace,
  Save,
  Sparkles,
  Stamp,
  TriangleAlert,
  Type,
  Upload,
} from "lucide-react";
import {
  segmentIndexAtOrBefore,
  type CoverMode,
  type CoverRegion,
  type SubtitleSegment,
} from "@dichvideo/shared";
import { useEditorState } from "@/hooks/use-editor-state";
import type { Lang } from "@/lib/i18n";
import { Modal } from "@/components/ui/modal";
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

/**
 * Các modal chỉ mở khi người dùng bấm nút, nhưng trước đây vẫn bị tải + phân
 * tích ngay lúc vào studio (~1.400 dòng JS). Tải động để route nặng nhất của
 * app tương tác được sớm hơn, nhất là trên 4G.
 */
const RetranslateModal = dynamic(() =>
  import("@/components/editor/retranslate-modal").then((m) => m.RetranslateModal),
);
const ExportModal = dynamic(() => import("./export-modal").then((m) => m.ExportModal));
const CoverModal = dynamic(() => import("./cover-modal").then((m) => m.CoverModal));
const StyleModal = dynamic(() => import("./style-modal").then((m) => m.StyleModal));
const DubModal = dynamic(() => import("./dub-modal").then((m) => m.DubModal));
const PresetsModal = dynamic(() => import("./presets-modal").then((m) => m.PresetsModal));
const AddSegmentModal = dynamic(() =>
  import("./add-segment-modal").then((m) => m.AddSegmentModal),
);

const SAVE_ICONS = {
  saved: Check,
  dirty: Loader2,
  saving: Loader2,
  conflict: TriangleAlert,
  error: TriangleAlert,
} as const;

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
    setSegmentBox,
    deleteSegment,
    replaceAll,
    saveNow,
  } = useEditorState(trackId, translated, trackVersion);

  /** ô che mặc định khi bật che cho 1 dòng — dải đáy, nơi chữ gốc hay nằm */
  const DEFAULT_LINE_BOX = { x: 0.06, y: 0.72, w: 0.88, h: 0.14 };

  const [modal, setModal] = useState<StudioModal>(null);
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

  const SaveIcon = SAVE_ICONS[saveState];

  const toolbarButton =
    "flex items-center gap-1.5 rounded-md border border-neutral-300 px-2.5 py-1.5 text-xs font-medium hover:bg-neutral-100 dark:border-neutral-700 dark:hover:bg-neutral-800";

  return (
    <div className="flex h-[calc(100dvh-7.5rem)] flex-col gap-3">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="mr-auto flex items-center gap-1 text-xs text-neutral-500 dark:text-neutral-400">
          <SaveIcon
            className={`h-3.5 w-3.5 ${saveState === "saving" || saveState === "dirty" ? "animate-spin" : ""}`}
          />
          {t.saveLabels[saveState]}
          <button
            type="button"
            onClick={saveNow}
            className="ml-1 rounded border border-neutral-300 px-2 py-0.5 hover:bg-neutral-100 dark:border-neutral-700 dark:hover:bg-neutral-800"
          >
            {t.saveNow}
          </button>
        </span>

        <button
          type="button"
          onClick={() => setModal("retranslate")}
          className="flex items-center gap-1.5 rounded-md bg-accent-600 px-2.5 py-1.5 text-xs font-medium text-white hover:bg-accent-700"
        >
          <Sparkles className="h-3.5 w-3.5" /> {t.aiTranslate}
        </button>
        <button type="button" onClick={() => setModal("cover")} className={toolbarButton}>
          <Droplets className="h-3.5 w-3.5" /> {t.blurBtn}
        </button>
        <button type="button" onClick={() => setModal("style")} className={toolbarButton}>
          <Type className="h-3.5 w-3.5" /> {t.subtitleBtn}
        </button>
        <button type="button" onClick={() => setModal("logo")} className={toolbarButton}>
          <Stamp className="h-3.5 w-3.5" /> {t.logoBtn}
        </button>
        <button
          type="button"
          onClick={() => setModal("dub")}
          className={cn(
            toolbarButton,
            dub.enabled &&
              "border-success-400 text-success-700 dark:border-success-700 dark:text-success-300",
          )}
        >
          <Mic className="h-3.5 w-3.5" /> {t.dubBtn}{dub.enabled ? t.dubBtnOn : ""}
        </button>
        <button type="button" onClick={() => setModal("presets")} className={toolbarButton}>
          <Save className="h-3.5 w-3.5" /> {t.presetsBtn}
        </button>
        <button
          type="button"
          onClick={() => setModal("export")}
          className="flex items-center gap-1.5 rounded-md bg-success-600 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-success-700"
        >
          <Upload className="h-3.5 w-3.5" /> {t.exportBtn}
        </button>
      </div>

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
          ) : (
            <div className="flex aspect-video items-center justify-center rounded-lg bg-neutral-100 text-sm text-neutral-400 dark:bg-neutral-900">
              {t.loadingVideo}
            </div>
          )}

          <div className="rounded-lg border border-neutral-200 bg-white p-3 dark:border-neutral-800 dark:bg-neutral-900">
            <p className="flex items-center gap-2 text-xs font-medium text-neutral-500 dark:text-neutral-400">
              <Replace className="h-3.5 w-3.5" /> {t.findReplace}
            </p>
            <div className="mt-2 flex gap-2">
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
          onClose={() => setModal(null)}
          lang={lang}
        />
      )}
    </div>
  );
}
