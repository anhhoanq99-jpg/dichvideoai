"use client";

import type { Dispatch, SetStateAction } from "react";
import { Mic } from "lucide-react";
import { estimateJobCredits, isPremiumVoice } from "@dichvideo/shared";
import { Modal } from "@/components/ui/modal";
import { fieldLabelClass } from "@/components/ui/form-styles";
import type { Lang } from "@/lib/i18n";
import {
  VoicePicker,
  resolveVoice,
  type VoiceSelection,
} from "@/components/dub/voice-picker";
import type { DubConfig } from "./export-modal";

const T = {
  vi: {
    dubTitle: "Lồng tiếng AI khi xuất",
    dubEnable: "Lồng tiếng vào video khi xuất (giọng đọc khớp thời gian từng câu)",
    volumesTitle: "Âm lượng nhạc & giọng nói",
    voice1: "Giọng 1 (mặc định — mọi dòng chưa gán)",
    voice2: "Bật Giọng 2 (nhân vật khác)",
    voice3: "Bật Giọng 3 (nhân vật khác)",
    multiHint: "Bật thêm giọng rồi bấm nút số ở mỗi dòng trong bảng phụ đề để gán nhân vật đọc dòng đó.",
    speed: "Tốc độ đọc:",
    pitch: "Cao độ:",
    pitchHint: "Trầm hơn ← 0 → cao hơn. Giọng thường và Google Standard/Wavenet dùng được; giọng Google HD (Chirp3) bỏ qua mục này.",
    aiVol: "Âm lượng giọng đọc AI:",
    bgVol: "Âm lượng nhạc nền gốc (giữa các câu):",
    bgVolOff: " — tắt hẳn",
    origVol: "Âm lượng giọng nói gốc (khi AI đọc):",
    dubNote:
      "Giọng gốc tự hạ xuống đúng lúc AI đọc để không chồng tiếng; giữa các câu vẫn giữ nhạc nền. Nghe thử ngay trên khung video (nút “Lồng tiếng” cạnh thanh tua).",
    estTitle: "Ước tính chi phí lồng tiếng",
    estLine: (min: number, price: string, premium: boolean) =>
      `Thời lượng video: ~${min} phút · Đơn giá: ${price} xu/phút (giọng ${premium ? "cao cấp" : "thường"})`,
    estTotalSuffix: "xu — chỉ trừ khi bấm Xuất File",
    dubDisabledHint:
      "Tích ô trên để lồng tiếng khi xuất — các thiết lập bên dưới vẫn chỉnh và nghe thử được ngay.",
  },
  en: {
    dubTitle: "AI dubbing on export",
    dubEnable: "Dub the video on export (voice-over timed to each line)",
    volumesTitle: "Music & voice volumes",
    voice1: "Voice 1 (default — every unassigned line)",
    voice2: "Enable Voice 2 (another character)",
    voice3: "Enable Voice 3 (another character)",
    multiHint: "Enable extra voices, then use the number button on each subtitle row to assign who reads it.",
    speed: "Speaking speed:",
    pitch: "Pitch:",
    pitchHint: "Lower ← 0 → higher. Works on standard and Google Standard/Wavenet voices; Google HD (Chirp3) voices ignore it.",
    aiVol: "AI voice volume:",
    bgVol: "Original background music (between lines):",
    bgVolOff: " — fully off",
    origVol: "Original voice volume (while AI speaks):",
    dubNote:
      "The original voice is lowered exactly while the AI speaks so voices don't overlap; background music stays between lines. Preview right on the video frame (the “Dubbing” button next to the seek bar).",
    estTitle: "Dubbing cost estimate",
    estLine: (min: number, price: string, premium: boolean) =>
      `Video length: ~${min} min · Rate: ${price} credits/min (${premium ? "premium" : "standard"} voice)`,
    estTotalSuffix: "credits — only charged when you press Export",
    dubDisabledHint:
      "Tick the box above to dub on export — the settings below can still be adjusted and previewed right away.",
  },
} as const;

interface DubModalProps {
  dub: DubConfig;
  setDub: Dispatch<SetStateAction<DubConfig>>;
  durationSec: number | null;
  onClose: () => void;
  lang?: Lang;
}

/** Modal thiết lập lồng tiếng AI: giọng đọc, tốc độ, âm lượng và ước tính chi phí. */
export function DubModal({ dub, setDub, durationSec, onClose, lang = "vi" }: DubModalProps) {
  const t = T[lang];
  return (
    <Modal
      title={
        <>
          <Mic className="h-4 w-4 text-success-500" /> {t.dubTitle}
        </>
      }
      onClose={onClose}
      wide
      dock
      lang={lang}
    >
      <div className="space-y-4">
        <label className="flex items-center gap-2 text-sm font-medium">
          <input
            type="checkbox"
            checked={dub.enabled}
            onChange={(e) => setDub((d) => ({ ...d, enabled: e.target.checked }))}
          />
          {t.dubEnable}
        </label>
        <div className="space-y-4">
          <div>
            <p className="mb-1 text-xs font-semibold text-neutral-600 dark:text-neutral-300">
              {t.voice1}
            </p>
            <VoicePicker
              value={dub.selection}
              onChange={(p) =>
                setDub((d) => ({ ...d, selection: { ...d.selection, ...p } }))
              }
              lang={lang}
            />
          </div>

          {/* Giọng 2 & 3 — phim nhiều nhân vật, gán từng dòng ở bảng phụ đề */}
          {([2, 3] as const).map((slot) => {
            const key = slot === 2 ? "selection2" : "selection3";
            const value = dub[key];
            return (
              <div key={slot}>
                <label className="flex items-center gap-2 text-xs font-semibold text-neutral-600 dark:text-neutral-300">
                  <input
                    type="checkbox"
                    checked={value !== null}
                    onChange={(e) =>
                      setDub((d) => ({
                        ...d,
                        [key]: e.target.checked ? { ...d.selection } : null,
                      }))
                    }
                  />
                  {slot === 2 ? t.voice2 : t.voice3}
                </label>
                {value && (
                  <div className="mt-1">
                    <VoicePicker
                      value={value}
                      onChange={(p) =>
                        setDub((d) => ({
                          ...d,
                          [key]: { ...(d[key] as VoiceSelection), ...p },
                        }))
                      }
                      lang={lang}
                    />
                  </div>
                )}
              </div>
            );
          })}
          <p className="text-xs text-neutral-400">{t.multiHint}</p>
          <div className="rounded-lg border border-neutral-200 p-3 dark:border-neutral-700">
            <p className="text-xs font-semibold text-neutral-600 dark:text-neutral-300">
              {t.volumesTitle}
            </p>
            <div className="mt-2 grid gap-4 sm:grid-cols-2">
              <label className="text-sm">
                <span className={fieldLabelClass}>
                  {t.speed} {dub.speed.toFixed(2)}x
                </span>
                <input
                  type="range"
                  min={0.8}
                  max={1.3}
                  step={0.05}
                  value={dub.speed}
                  onChange={(e) =>
                    setDub((d) => ({ ...d, speed: Number(e.target.value) }))
                  }
                  className="mt-2 w-full"
                />
              </label>
              <label className="text-sm">
                <span className={fieldLabelClass}>
                  {t.pitch} {dub.pitch > 0 ? `+${dub.pitch}` : dub.pitch}
                </span>
                <input
                  type="range"
                  min={-10}
                  max={10}
                  step={1}
                  value={dub.pitch}
                  onChange={(e) =>
                    setDub((d) => ({ ...d, pitch: Number(e.target.value) }))
                  }
                  className="mt-2 w-full"
                />
                <span className="mt-1 block text-xs text-neutral-400">{t.pitchHint}</span>
              </label>
              <label className="text-sm">
                <span className={fieldLabelClass}>
                  {t.aiVol} {dub.aiVolume}%
                </span>
                <input
                  type="range"
                  min={50}
                  max={200}
                  value={dub.aiVolume}
                  onChange={(e) =>
                    setDub((d) => ({ ...d, aiVolume: Number(e.target.value) }))
                  }
                  className="mt-2 w-full"
                />
              </label>
              <label className="text-sm">
                <span className={fieldLabelClass}>
                  {t.bgVol} {dub.bgVolume}%
                  {dub.bgVolume === 0 ? t.bgVolOff : ""}
                </span>
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={dub.bgVolume}
                  onChange={(e) =>
                    setDub((d) => ({ ...d, bgVolume: Number(e.target.value) }))
                  }
                  className="mt-2 w-full"
                />
              </label>
              <label className="text-sm">
                <span className={fieldLabelClass}>
                  {t.origVol} {dub.origVoiceVolume}%
                </span>
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={dub.origVoiceVolume}
                  onChange={(e) =>
                    setDub((d) => ({ ...d, origVoiceVolume: Number(e.target.value) }))
                  }
                  className="mt-2 w-full"
                />
              </label>
            </div>
            <p className="mt-2 text-xs text-neutral-400">{t.dubNote}</p>
          </div>

          {durationSec && (
            <div className="rounded-lg bg-amber-50 px-3 py-2.5 text-sm dark:bg-amber-950/30">
              <p className="text-xs font-semibold text-amber-700 dark:text-amber-300">
                {t.estTitle}
              </p>
              <p className="mt-1 text-xs text-neutral-600 dark:text-neutral-300">
                {t.estLine(
                  Math.max(1, Math.ceil(durationSec / 60)),
                  dub.selection.provider === "gemini" ? "700" : "500",
                  dub.selection.provider === "gemini",
                )}
              </p>
              <p className="mt-0.5 text-sm font-bold text-amber-700 dark:text-amber-300">
                ={" "}
                {estimateJobCredits("dub", {
                  durationSec,
                  premiumVoice: isPremiumVoice(resolveVoice(dub.selection)),
                }).toLocaleString("vi-VN")}{" "}
                {t.estTotalSuffix}
              </p>
            </div>
          )}
        </div>
        {!dub.enabled && <p className="text-xs text-neutral-400">{t.dubDisabledHint}</p>}
      </div>
    </Modal>
  );
}
