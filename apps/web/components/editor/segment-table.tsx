"use client";

import { useEffect, useRef } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { Move, SquareDashed, X } from "lucide-react";
import { labelToMs, msToLabel, type SubtitleSegment } from "@dichvideo/shared";
import type { Lang } from "@/lib/i18n";
import { cn } from "@/lib/utils";

const T = {
  vi: {
    cpsOk: "Tốc độ đọc ổn",
    cpsWarn: (limit: number) =>
      `Quá ${limit} ký tự/giây — người xem khó đọc kịp, nên rút gọn câu`,
    chars: "ký tự",
    deleteRow: "Xóa dòng này",
    coverOn: "Đang che chữ gốc ở dòng này — bấm để bỏ che",
    coverOff: "Che chữ gốc ở đúng lúc dòng này chạy (kéo ô trên video để chỉnh)",
    layoutOn: "Dòng này đang đặt chỗ riêng — bấm để trả về vị trí/cỡ chung",
    layoutOff: "Cho dòng này vị trí và cỡ chữ riêng (kéo chữ trên video để chỉnh)",
    seekRow: "Tua video tới dòng này",
    speakerTitle: (n: number) => `Nhân vật đọc dòng này — bấm để đổi (có ${n} giọng)`,
    editStart: "Lúc bắt đầu — sửa được (vd 1:23.5 hoặc 83.5). Enter để lưu, Esc để hủy",
    editEnd: "Lúc kết thúc — sửa được (vd 1:23.5 hoặc 83.5). Enter để lưu, Esc để hủy",
  },
  en: {
    cpsOk: "Reading speed OK",
    cpsWarn: (limit: number) =>
      `Over ${limit} chars/second — viewers can't keep up, consider shortening`,
    chars: "chars",
    deleteRow: "Delete this line",
    coverOn: "Covering the original text on this line — click to remove",
    coverOff: "Cover the original text while this line plays (drag the box on the video)",
    layoutOn: "This line has its own placement — click to use the shared one",
    layoutOff: "Give this line its own position and size (drag the text on the video)",
    seekRow: "Jump the video to this line",
    speakerTitle: (n: number) => `Who reads this line — click to change (${n} voices)`,
    editStart: "Start time — editable (e.g. 1:23.5 or 83.5). Enter to save, Esc to cancel",
    editEnd: "End time — editable (e.g. 1:23.5 or 83.5). Enter to save, Esc to cancel",
  },
} as const;

function formatTimestamp(ms: number) {
  const m = Math.floor(ms / 60_000);
  const s = Math.floor((ms % 60_000) / 1000);
  const milli = Math.floor((ms % 1000) / 100);
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}.${milli}`;
}

/**
 * Ô sửa mốc thời gian ngay trong bảng. Dùng input KHÔNG kiểm soát + `key={ms}`:
 * gõ dở thì `ms` chưa đổi nên ô không bị dựng lại giữa chừng; commit xong `ms` đổi
 * → ô dựng lại với giá trị đã chuẩn hoá. (Cách này né được setState-trong-effect
 * mà lint của repo cấm.) Nhập sai → trả lại giá trị cũ.
 */
function TimeCell({
  ms,
  title,
  onCommit,
}: {
  ms: number;
  title: string;
  /** trả về false nếu giá trị bị từ chối (vd kết thúc trước bắt đầu) */
  onCommit: (ms: number) => boolean;
}) {
  return (
    <input
      key={ms}
      defaultValue={msToLabel(ms)}
      title={title}
      inputMode="decimal"
      onFocus={(e) => e.currentTarget.select()}
      onKeyDown={(e) => {
        if (e.key === "Enter") e.currentTarget.blur();
        if (e.key === "Escape") {
          e.currentTarget.value = msToLabel(ms);
          e.currentTarget.blur();
        }
      }}
      onBlur={(e) => {
        const raw = e.currentTarget.value;
        // Ô chỉ hiện 1 chữ số thập phân nên nhãn LÀM TRÒN về 0,1 giây: 6789ms cũng
        // hiện "0:06.8". Nếu cứ blur là ghi thì chỉ bấm vào rồi bấm ra cũng dịch
        // thời gian tới 50ms — lướt qua vài dòng là phụ đề lệch dần mà không ai hay.
        // Vậy nên: không gõ thay đổi gì thì KHÔNG đụng vào dữ liệu.
        if (raw === msToLabel(ms)) return;
        const parsed = labelToMs(raw);
        if (parsed === null || !onCommit(parsed)) {
          e.currentTarget.value = msToLabel(ms);
        }
      }}
      className="w-14 rounded border border-transparent bg-transparent px-1 py-0.5 text-center font-mono text-xs text-neutral-500 hover:border-neutral-300 focus:border-primary-400 focus:bg-white focus:text-neutral-900 focus:outline-none dark:text-neutral-400 dark:hover:border-neutral-700 dark:focus:bg-neutral-900 dark:focus:text-neutral-100"
    />
  );
}

/** Màu nhãn nhân vật đọc — mỗi giọng một màu để lướt mắt là thấy ai đọc dòng nào. */
const SPEAKER_CLS = [
  "bg-neutral-200 text-neutral-600 dark:bg-neutral-700 dark:text-neutral-300",
  "bg-primary-100 text-primary-700 dark:bg-primary-950/60 dark:text-primary-300",
  "bg-accent-100 text-accent-700 dark:bg-accent-950/60 dark:text-accent-300",
];

/** chars/second — tốc độ đọc; phụ đề Việt thường thoải mái tới ~20 C/S */
const CPS_WARN = 20;

function cps(seg: SubtitleSegment): number | null {
  const durS = (seg.endMs - seg.startMs) / 1000;
  if (durS <= 0) return null;
  return Math.round((seg.text.replace(/\s/g, "").length / durS) * 10) / 10;
}

interface SegmentTableProps {
  original: SubtitleSegment[];
  translated: SubtitleSegment[];
  activeIndex: number;
  autoScroll: boolean;
  onEdit: (i: number, text: string) => void;
  onRowClick: (startMs: number) => void;
  /** có truyền → hiện nút xóa từng dòng */
  onDelete?: (i: number) => void;
  /** có truyền → hiện nút bật/tắt che chữ gốc cho từng dòng */
  onToggleCover?: (i: number) => void;
  /** có truyền → mốc thời gian mỗi dòng sửa được ngay tại bảng */
  onEditTime?: (i: number, startMs: number, endMs: number) => void;
  /** có truyền → hiện nút bật/tắt tự chỉnh vị trí + cỡ chữ cho từng dòng */
  onToggleLayout?: (i: number) => void;
  /**
   * Số giọng đang bật (1..3). >1 thì mỗi dòng hiện nút gán nhân vật đọc.
   * Bằng 1 thì giấu đi cho đỡ rối — đa số video chỉ cần một giọng.
   */
  voiceCount?: number;
  /** đổi nhân vật đọc dòng này (0/1/2) */
  onCycleSpeaker?: (i: number) => void;
  lang?: Lang;
}

export function SegmentTable({
  original,
  translated,
  activeIndex,
  autoScroll,
  onEdit,
  onRowClick,
  onDelete,
  onToggleCover,
  onEditTime,
  onToggleLayout,
  voiceCount = 1,
  onCycleSpeaker,
  lang = "vi",
}: SegmentTableProps) {
  const t = T[lang];
  const parentRef = useRef<HTMLDivElement>(null);
  const originalByI = new Map(original.map((s) => [s.i, s.text]));

  const virtualizer = useVirtualizer({
    count: translated.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 108,
    overscan: 10,
  });

  useEffect(() => {
    if (autoScroll && activeIndex >= 0) {
      virtualizer.scrollToIndex(activeIndex, { align: "center" });
    }
  }, [activeIndex, autoScroll, virtualizer]);

  return (
    <div ref={parentRef} className="h-full overflow-y-auto p-2">
      <div
        style={{ height: virtualizer.getTotalSize(), position: "relative" }}
        className="w-full"
      >
        {virtualizer.getVirtualItems().map((row) => {
          const seg = translated[row.index];
          const isActive = row.index === activeIndex;
          return (
            <div
              key={seg.i}
              data-index={row.index}
              ref={virtualizer.measureElement}
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                width: "100%",
                transform: `translateY(${row.start}px)`,
              }}
              className="px-1 py-1"
            >
              <div
                className={cn(
                  "rounded-xl border px-3 py-2 transition-colors",
                  isActive
                    ? "border-primary-400 bg-primary-50/70 shadow-sm shadow-primary-500/10 dark:border-primary-700 dark:bg-primary-950/30"
                    : "border-neutral-200 bg-white hover:border-neutral-300 dark:border-neutral-800 dark:bg-neutral-900/60 dark:hover:border-neutral-700",
                )}
              >
              <div className="flex items-center justify-between gap-2">
                <div className="flex min-w-0 flex-wrap items-center gap-x-1 font-mono text-xs text-neutral-400">
                  <button
                    type="button"
                    onClick={() => onRowClick(seg.startMs)}
                    title={t.seekRow}
                    className="hover:text-primary-600 dark:hover:text-primary-400"
                  >
                    #{row.index + 1}
                  </button>
                  <span>·</span>
                  {onEditTime ? (
                    <>
                      <TimeCell
                        ms={seg.startMs}
                        title={t.editStart}
                        onCommit={(ms) => {
                          if (ms >= seg.endMs) return false; // phải trước lúc kết thúc
                          onEditTime(seg.i, ms, seg.endMs);
                          return true;
                        }}
                      />
                      <span>→</span>
                      <TimeCell
                        ms={seg.endMs}
                        title={t.editEnd}
                        onCommit={(ms) => {
                          if (ms <= seg.startMs) return false; // phải sau lúc bắt đầu
                          onEditTime(seg.i, seg.startMs, ms);
                          return true;
                        }}
                      />
                    </>
                  ) : (
                    <span>
                      {formatTimestamp(seg.startMs)} → {formatTimestamp(seg.endMs)}
                    </span>
                  )}
                  <span>· {seg.endMs - seg.startMs}ms</span>
                </div>
                {(() => {
                  const charsPerSec = cps(seg);
                  if (charsPerSec === null) return null;
                  const slow = charsPerSec <= CPS_WARN;
                  return (
                    <span
                      title={slow ? t.cpsOk : t.cpsWarn(CPS_WARN)}
                      className={cn(
                        "shrink-0 font-mono text-[10px]",
                        slow
                          ? "text-neutral-400"
                          : "font-semibold text-red-500",
                      )}
                    >
                      {seg.text.replace(/\s/g, "").length} {t.chars} · {charsPerSec} C/S
                    </span>
                  );
                })()}
                {voiceCount > 1 && onCycleSpeaker && (
                  <button
                    type="button"
                    onClick={() => onCycleSpeaker(seg.i)}
                    title={t.speakerTitle(voiceCount)}
                    className={cn(
                      "flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded text-[11px] font-bold sm:h-5 sm:min-h-0 sm:w-5 sm:min-w-0",
                      SPEAKER_CLS[Math.min(seg.speaker ?? 0, 2)],
                    )}
                  >
                    {(seg.speaker ?? 0) + 1}
                  </button>
                )}
                {onToggleLayout && (
                  <button
                    type="button"
                    onClick={() => onToggleLayout(seg.i)}
                    title={seg.pos ? t.layoutOn : t.layoutOff}
                    aria-label={seg.pos ? t.layoutOn : t.layoutOff}
                    aria-pressed={Boolean(seg.pos)}
                    className={cn(
                      // ĐIỆN THOẠI: vùng chạm tối thiểu 44px (11*4). Trước đây
                      // p-0.5 quanh icon 14px ra ~18px — gần như không bấm trúng.
                      // Từ sm trở lên thu về kích thước cũ cho gọn bảng.
                      "flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded sm:min-h-0 sm:min-w-0 sm:p-0.5",
                      seg.pos
                        ? "bg-primary-100 text-primary-700 dark:bg-primary-950/60 dark:text-primary-300"
                        : "text-neutral-300 hover:bg-primary-50 hover:text-primary-600 dark:text-neutral-600 dark:hover:bg-primary-950/40",
                    )}
                  >
                    <Move className="h-3.5 w-3.5" />
                  </button>
                )}
                {onToggleCover && (
                  <button
                    type="button"
                    onClick={() => onToggleCover(seg.i)}
                    title={seg.box ? t.coverOn : t.coverOff}
                    aria-label={seg.box ? t.coverOn : t.coverOff}
                    aria-pressed={Boolean(seg.box)}
                    className={cn(
                      // ĐIỆN THOẠI: vùng chạm tối thiểu 44px (11*4). Trước đây
                      // p-0.5 quanh icon 14px ra ~18px — gần như không bấm trúng.
                      // Từ sm trở lên thu về kích thước cũ cho gọn bảng.
                      "flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded sm:min-h-0 sm:min-w-0 sm:p-0.5",
                      seg.box
                        ? "bg-primary-100 text-primary-700 dark:bg-primary-950/60 dark:text-primary-300"
                        : "text-neutral-300 hover:bg-primary-50 hover:text-primary-600 dark:text-neutral-600 dark:hover:bg-primary-950/40",
                    )}
                  >
                    <SquareDashed className="h-3.5 w-3.5" />
                  </button>
                )}
                {onDelete && (
                  <button
                    type="button"
                    onClick={() => onDelete(seg.i)}
                    title={t.deleteRow}
                    aria-label={t.deleteRow}
                    className="flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded text-neutral-300 hover:bg-red-50 hover:text-red-600 sm:min-h-0 sm:min-w-0 sm:p-0.5 dark:text-neutral-600 dark:hover:bg-red-950/40"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
              <p className="mt-0.5 text-xs text-neutral-400 dark:text-neutral-500">
                {originalByI.get(seg.i) ?? ""}
              </p>
              <textarea
                value={seg.text}
                onChange={(e) => onEdit(seg.i, e.target.value)}
                rows={Math.max(1, seg.text.split("\n").length)}
                className="mt-1 w-full resize-none rounded-lg border border-transparent bg-transparent px-1.5 py-0.5 text-sm leading-snug focus:border-primary-400 focus:bg-white focus:outline-none dark:focus:bg-neutral-900"
              />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
