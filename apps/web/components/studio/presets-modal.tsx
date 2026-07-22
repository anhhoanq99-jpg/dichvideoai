"use client";

import { useState } from "react";
import { Save, Trash2 } from "lucide-react";
import type { CoverRegion } from "@dichvideo/shared";
import { Modal } from "@/components/ui/modal";
import { useToast } from "@/components/ui/toaster";
import { inputClass, selectClass } from "@/components/ui/form-styles";
import type { Lang } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import type { RenderSettings } from "@/components/render/render-settings";
import { resolveVoice } from "@/components/dub/voice-picker";
import type { DubConfig } from "./export-modal";
import {
  loadLastPresetName,
  loadStudioPresets,
  storeLastPresetName,
  storeStudioPresets,
  type StudioPreset,
} from "./studio-presets";

const T = {
  vi: {
    presetsTitle: "Cài đặt đã lưu",
    choosePreset: "— Chọn cài đặt —",
    presetNamePh: "Tên cài đặt…",
    saveNew: "Lưu mới",
    savedToast: (name: string) =>
      `Đã lưu cài đặt "${name}" — lần sau mở studio sẽ tự áp`,
    sumVoice: "🎙 Giọng đọc:",
    sumVoiceOff: " (chưa bật lồng tiếng)",
    sumAudio: "🔊 Âm thanh:",
    sumBg: "Nhạc nền",
    sumOrig: "Giọng gốc",
    sumAi: "Giọng AI",
    sumSpeed: "Tốc độ",
    sumBlur: "💧 Làm mờ:",
    sumBlurNone: "Không che",
    sumBlurLevel: (n: number) => `Mờ mức ${n}`,
    sumBlurBox: "Hộp tối",
    sumRegions: "vùng",
    sumSub: "💬 Phụ đề:",
    sumBoxed: " · có ô nền",
    sumLogo: "🏷 Logo:",
    sumLogoOff: "Tắt",
    sumLogoImage: "Hình ảnh",
    sumLogoTextUnset: "Chữ (chưa nhập)",
    deletedToast: "Đã xóa cài đặt",
    deletePreset: "Xóa cài đặt",
    presetsHint:
      "Cài đặt lưu trọn bộ: giọng đọc, âm thanh, làm mờ, kiểu phụ đề, logo. Lần sau mở trình chỉnh sửa sẽ tự áp cài đặt dùng gần nhất.",
  },
  en: {
    presetsTitle: "Saved presets",
    choosePreset: "— Choose a preset —",
    presetNamePh: "Preset name…",
    saveNew: "Save new",
    savedToast: (name: string) =>
      `Preset "${name}" saved — it will auto-apply next time you open the studio`,
    sumVoice: "🎙 Voice:",
    sumVoiceOff: " (dubbing not enabled)",
    sumAudio: "🔊 Audio:",
    sumBg: "Background",
    sumOrig: "Original voice",
    sumAi: "AI voice",
    sumSpeed: "Speed",
    sumBlur: "💧 Cover:",
    sumBlurNone: "No cover",
    sumBlurLevel: (n: number) => `Blur level ${n}`,
    sumBlurBox: "Dark box",
    sumRegions: "regions",
    sumSub: "💬 Subtitles:",
    sumBoxed: " · with background box",
    sumLogo: "🏷 Logo:",
    sumLogoOff: "Off",
    sumLogoImage: "Image",
    sumLogoTextUnset: "Text (not set)",
    deletedToast: "Preset deleted",
    deletePreset: "Delete preset",
    presetsHint:
      "Presets store everything: voice, audio, cover, subtitle style, logo. Next time you open the editor the most recent preset auto-applies.",
  },
} as const;

interface PresetsModalProps {
  settings: RenderSettings;
  dub: DubConfig;
  regions: CoverRegion[];
  /** shell áp preset vào state settings/dub (giữ coverMode hiện tại) */
  onApply: (name: string, preset: StudioPreset) => void;
  onClose: () => void;
  lang?: Lang;
}

/**
 * Modal lưu/áp/xóa bộ cài đặt studio. Danh sách preset đọc thẳng từ
 * localStorage lúc mở modal — shell chỉ cần biết khi user áp một preset.
 */
export function PresetsModal({
  settings,
  dub,
  regions,
  onApply,
  onClose,
  lang = "vi",
}: PresetsModalProps) {
  const t = T[lang];
  const { toast } = useToast();
  const [savedPresets, setSavedPresets] = useState<Record<string, StudioPreset>>(() =>
    loadStudioPresets(),
  );
  const [activePresetName, setActivePresetName] = useState<string | null>(() =>
    loadLastPresetName(),
  );
  const [presetName, setPresetName] = useState("");

  return (
    <Modal
      title={
        <>
          <Save className="h-4 w-4 text-primary-500" /> {t.presetsTitle}
        </>
      }
      onClose={onClose}
      dock
      lang={lang}
    >
      <div className="space-y-4">
        {/* chọn / lưu cài đặt */}
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={activePresetName ?? ""}
            onChange={(e) => {
              const name = e.target.value;
              const preset = savedPresets[name];
              if (preset) {
                setActivePresetName(name);
                onApply(name, preset);
              }
            }}
            className={cn(selectClass, "min-w-40 flex-1")}
          >
            <option value="">{t.choosePreset}</option>
            {Object.keys(savedPresets).map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </select>
          <input
            value={presetName}
            onChange={(e) => setPresetName(e.target.value)}
            placeholder={t.presetNamePh}
            className={cn(inputClass, "w-36")}
          />
          <button
            type="button"
            disabled={!presetName.trim()}
            onClick={() => {
              const name = presetName.trim();
              if (!name) return;
              const next = { ...savedPresets, [name]: { settings, dub } };
              setSavedPresets(next);
              storeStudioPresets(next);
              setActivePresetName(name);
              storeLastPresetName(name);
              setPresetName("");
              toast(t.savedToast(name));
            }}
            className="shrink-0 rounded-md bg-primary-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-primary-700 disabled:opacity-50"
          >
            <Save className="mr-1 inline h-3.5 w-3.5" /> {t.saveNew}
          </button>
        </div>

        {/* tóm tắt thiết lập hiện tại — những gì sẽ được lưu */}
        <div className="space-y-1.5 rounded-lg bg-neutral-50 p-3 text-xs text-neutral-600 dark:bg-neutral-800/60 dark:text-neutral-300">
          <p>
            <b>{t.sumVoice}</b> {resolveVoice(dub.selection)}
            {dub.enabled ? "" : t.sumVoiceOff}
          </p>
          <p>
            <b>{t.sumAudio}</b> {t.sumBg} {dub.bgVolume}% · {t.sumOrig}{" "}
            {dub.origVoiceVolume}% · {t.sumAi} {dub.aiVolume}% · {t.sumSpeed}{" "}
            {dub.speed.toFixed(2)}x
          </p>
          <p>
            <b>{t.sumBlur}</b>{" "}
            {settings.coverMode === "none"
              ? t.sumBlurNone
              : `${settings.coverMode === "blur" ? t.sumBlurLevel(settings.blurStrength) : t.sumBlurBox} · ${regions.length} ${t.sumRegions}`}
          </p>
          <p>
            <b>{t.sumSub}</b> {settings.font} · {settings.fontSize}px
            {settings.boxed ? t.sumBoxed : ""}
          </p>
          <p>
            <b>{t.sumLogo}</b>{" "}
            {!settings.logoOn
              ? t.sumLogoOff
              : settings.logoType === "image"
                ? `${t.sumLogoImage} · ${settings.logoScale}%`
                : settings.logoText.trim() || t.sumLogoTextUnset}
          </p>
        </div>

        {activePresetName && savedPresets[activePresetName] && (
          <button
            type="button"
            onClick={() => {
              const next = { ...savedPresets };
              delete next[activePresetName];
              setSavedPresets(next);
              storeStudioPresets(next);
              storeLastPresetName(null);
              setActivePresetName(null);
              toast(t.deletedToast, "info");
            }}
            className="flex items-center gap-1.5 text-xs text-red-600 hover:underline dark:text-red-400"
          >
            <Trash2 className="h-3.5 w-3.5" /> {t.deletePreset} &quot;{activePresetName}&quot;
          </button>
        )}

        <p className="text-xs text-neutral-400">{t.presetsHint}</p>
      </div>
    </Modal>
  );
}
