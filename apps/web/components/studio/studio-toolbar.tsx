"use client";

import {
  Check,
  Droplets,
  Loader2,
  Mic,
  Save,
  Sparkles,
  Stamp,
  TriangleAlert,
  Type,
  Upload,
} from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Hàng nút công cụ trên cùng của studio + trạng thái lưu.
 *
 * Tách khỏi `studio-shell.tsx` vì đây là phần THUẦN HIỂN THỊ: chỉ nhận nhãn,
 * trạng thái và một callback mở modal. Thêm/bớt một công cụ giờ sửa đúng file
 * này, không phải lội qua 770 dòng state của studio.
 */
const SAVE_ICONS = {
  saved: Check,
  dirty: Loader2,
  saving: Loader2,
  conflict: TriangleAlert,
  error: TriangleAlert,
} as const;

export type SaveState = keyof typeof SAVE_ICONS;

/** Modal mà một nút công cụ mở ra. */
export type ToolbarModal =
  | "retranslate"
  | "cover"
  | "style"
  | "logo"
  | "dub"
  | "presets"
  | "export";

const BUTTON_CLASS =
  "flex items-center gap-1.5 rounded-md border border-neutral-300 px-2.5 py-1.5 text-xs font-medium hover:bg-neutral-100 dark:border-neutral-700 dark:hover:bg-neutral-800";

export interface StudioToolbarLabels {
  saveLabels: Record<SaveState, string>;
  saveNow: string;
  aiTranslate: string;
  blurBtn: string;
  subtitleBtn: string;
  logoBtn: string;
  dubBtn: string;
  dubBtnOn: string;
  presetsBtn: string;
  exportBtn: string;
}

export function StudioToolbar({
  t,
  saveState,
  onSaveNow,
  onOpenModal,
  dubEnabled,
}: {
  t: StudioToolbarLabels;
  saveState: SaveState;
  onSaveNow: () => void;
  /** truyền cả event để modal neo được ngay dưới nút vừa bấm (ModalAnchorContext) */
  onOpenModal: (modal: ToolbarModal, e: React.MouseEvent<HTMLElement>) => void;
  dubEnabled: boolean;
}) {
  const SaveIcon = SAVE_ICONS[saveState];
  const spinning = saveState === "saving" || saveState === "dirty";

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="mr-auto flex items-center gap-1 text-xs text-neutral-500 dark:text-neutral-400">
        <SaveIcon className={cn("h-3.5 w-3.5", spinning && "animate-spin")} />
        {t.saveLabels[saveState]}
        <button
          type="button"
          onClick={onSaveNow}
          className="ml-1 rounded border border-neutral-300 px-2 py-0.5 hover:bg-neutral-100 dark:border-neutral-700 dark:hover:bg-neutral-800"
        >
          {t.saveNow}
        </button>
      </span>

      <button
        type="button"
        onClick={(e) => onOpenModal("retranslate", e)}
        className="flex items-center gap-1.5 rounded-md bg-accent-600 px-2.5 py-1.5 text-xs font-medium text-white hover:bg-accent-700"
      >
        <Sparkles className="h-3.5 w-3.5" /> {t.aiTranslate}
      </button>
      <button type="button" onClick={(e) => onOpenModal("cover", e)} className={BUTTON_CLASS}>
        <Droplets className="h-3.5 w-3.5" /> {t.blurBtn}
      </button>
      <button type="button" onClick={(e) => onOpenModal("style", e)} className={BUTTON_CLASS}>
        <Type className="h-3.5 w-3.5" /> {t.subtitleBtn}
      </button>
      <button type="button" onClick={(e) => onOpenModal("logo", e)} className={BUTTON_CLASS}>
        <Stamp className="h-3.5 w-3.5" /> {t.logoBtn}
      </button>
      <button
        type="button"
        onClick={(e) => onOpenModal("dub", e)}
        className={cn(
          BUTTON_CLASS,
          dubEnabled &&
            "border-success-400 text-success-700 dark:border-success-700 dark:text-success-300",
        )}
      >
        <Mic className="h-3.5 w-3.5" /> {t.dubBtn}
        {dubEnabled ? t.dubBtnOn : ""}
      </button>
      <button type="button" onClick={(e) => onOpenModal("presets", e)} className={BUTTON_CLASS}>
        <Save className="h-3.5 w-3.5" /> {t.presetsBtn}
      </button>
      <button
        type="button"
        onClick={(e) => onOpenModal("export", e)}
        className="flex items-center gap-1.5 rounded-md bg-success-700 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-success-800"
      >
        <Upload className="h-3.5 w-3.5" /> {t.exportBtn}
      </button>
    </div>
  );
}
