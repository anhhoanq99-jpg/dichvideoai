import type { RenderSettings } from "@/components/render/render-settings";
import type { DubConfig } from "./export-modal";

/** Preset studio: gói trọn phụ đề + làm mờ + logo + lồng tiếng — lưu theo tên. */
export interface StudioPreset {
  settings: RenderSettings;
  dub: DubConfig;
}

const PRESETS_KEY = "dichvideo:studio-presets";
const LAST_USED_KEY = "dichvideo:studio-last-preset";

export function loadStudioPresets(): Record<string, StudioPreset> {
  try {
    const raw = localStorage.getItem(PRESETS_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {}; // preset hỏng → bỏ qua
  }
}

export function storeStudioPresets(presets: Record<string, StudioPreset>) {
  localStorage.setItem(PRESETS_KEY, JSON.stringify(presets));
}

/** Tên preset dùng gần nhất — tự áp lại khi mở studio lần sau. */
export function loadLastPresetName(): string | null {
  try {
    return localStorage.getItem(LAST_USED_KEY);
  } catch {
    return null;
  }
}

export function storeLastPresetName(name: string | null) {
  if (name) localStorage.setItem(LAST_USED_KEY, name);
  else localStorage.removeItem(LAST_USED_KEY);
}
