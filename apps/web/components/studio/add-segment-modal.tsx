"use client";

import { useState } from "react";
import { Crosshair, Plus } from "lucide-react";
import { labelToMs, msToLabel } from "@dichvideo/shared";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { fieldLabelClass, inputClass } from "@/components/ui/form-styles";
import type { Lang } from "@/lib/i18n";
import { cn } from "@/lib/utils";

const T = {
  vi: {
    title: "Thêm phụ đề",
    start: "Bắt đầu",
    end: "Kết thúc",
    text: "Nội dung",
    textPlaceholder: "Nhập lời thoại…",
    now: "Lấy thời gian đang xem",
    add: "Thêm vào phụ đề",
    hint: "Định dạng: phút:giây (vd 1:23.5) hoặc số giây (vd 83.5). Có thể để trống nội dung rồi gõ sau ở bảng bên phải.",
    badTime: "Thời gian không hợp lệ — nhập kiểu 1:23.5 hoặc 83.5",
    badRange: "Thời điểm kết thúc phải sau thời điểm bắt đầu",
    tooLong: (d: string) => `Vượt quá độ dài video (${d})`,
  },
  en: {
    title: "Add subtitle",
    start: "Start",
    end: "End",
    text: "Text",
    textPlaceholder: "Type the line…",
    now: "Use current time",
    add: "Add subtitle",
    hint: "Format: min:sec (e.g. 1:23.5) or seconds (e.g. 83.5). You can leave the text empty and fill it in later in the table.",
    badTime: "Invalid time — use 1:23.5 or 83.5",
    badRange: "End must come after start",
    tooLong: (d: string) => `Beyond the video length (${d})`,
  },
} as const;

interface AddSegmentModalProps {
  /** vị trí đang xem trong video (ms) — dùng làm mốc mặc định */
  currentMs: number;
  durationSec: number | null;
  onAdd: (startMs: number, endMs: number, text: string) => void;
  onClose: () => void;
  lang?: Lang;
}

/** Hộp thoại thêm 1 dòng phụ đề vào đúng khoảng thời gian người dùng chọn. */
export function AddSegmentModal({
  currentMs,
  durationSec,
  onAdd,
  onClose,
  lang = "vi",
}: AddSegmentModalProps) {
  const t = T[lang];
  const [start, setStart] = useState(() => msToLabel(currentMs));
  const [end, setEnd] = useState(() => msToLabel(currentMs + 2000));
  const [text, setText] = useState("");
  const [error, setError] = useState<string | null>(null);

  function submit() {
    const startMs = labelToMs(start);
    const endMs = labelToMs(end);
    if (startMs === null || endMs === null) {
      setError(t.badTime);
      return;
    }
    if (endMs <= startMs) {
      setError(t.badRange);
      return;
    }
    if (durationSec !== null && endMs > Math.round(durationSec * 1000)) {
      setError(t.tooLong(msToLabel(durationSec * 1000)));
      return;
    }
    onAdd(startMs, endMs, text.trim());
    onClose();
  }

  /** Lấy mốc đang xem: bắt đầu = playhead, kết thúc = +2 giây. */
  function useNow() {
    setStart(msToLabel(currentMs));
    setEnd(msToLabel(currentMs + 2000));
    setError(null);
  }

  return (
    <Modal
      title={
        <>
          <Plus className="h-4 w-4 text-primary-500" /> {t.title}
        </>
      }
      onClose={onClose}
      lang={lang}
    >
      <div className="space-y-4">
        <div className="flex flex-wrap items-end gap-3">
          <label className="text-sm">
            <span className={fieldLabelClass}>{t.start}</span>
            <input
              value={start}
              onChange={(e) => {
                setStart(e.target.value);
                setError(null);
              }}
              placeholder="0:00.0"
              className={cn(inputClass, "mt-1 w-28 font-mono")}
            />
          </label>
          <label className="text-sm">
            <span className={fieldLabelClass}>{t.end}</span>
            <input
              value={end}
              onChange={(e) => {
                setEnd(e.target.value);
                setError(null);
              }}
              placeholder="0:02.0"
              className={cn(inputClass, "mt-1 w-28 font-mono")}
            />
          </label>
          <Button variant="secondary" size="sm" onClick={useNow} className="font-medium">
            <Crosshair className="h-3.5 w-3.5" /> {t.now}
          </Button>
        </div>

        <label className="block text-sm">
          <span className={fieldLabelClass}>{t.text}</span>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={3}
            placeholder={t.textPlaceholder}
            className={cn(inputClass, "mt-1 w-full resize-y")}
          />
        </label>

        {error && (
          <p className="rounded-md bg-red-50 px-3 py-2 text-xs text-red-700 dark:bg-red-950/40 dark:text-red-300">
            {error}
          </p>
        )}

        <p className="text-xs text-neutral-400">{t.hint}</p>

        <Button onClick={submit} className="w-full">
          <Plus className="h-4 w-4" /> {t.add}
        </Button>
      </div>
    </Modal>
  );
}
