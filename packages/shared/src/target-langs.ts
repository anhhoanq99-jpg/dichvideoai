/** Ngôn ngữ đích cho dịch phụ đề — dịch được mọi chiều, không chỉ sang tiếng Việt. */
export const TARGET_LANGS = [
  { id: "vi", name: "Tiếng Việt" },
  { id: "en", name: "English (Tiếng Anh)" },
  { id: "zh", name: "中文 (Tiếng Trung)" },
  { id: "ja", name: "日本語 (Tiếng Nhật)" },
  { id: "ko", name: "한국어 (Tiếng Hàn)" },
  { id: "th", name: "ไทย (Tiếng Thái)" },
  { id: "id", name: "Bahasa Indonesia" },
  { id: "fr", name: "Français (Tiếng Pháp)" },
  { id: "de", name: "Deutsch (Tiếng Đức)" },
  { id: "es", name: "Español (Tiếng Tây Ban Nha)" },
  { id: "pt", name: "Português (Tiếng Bồ Đào Nha)" },
  { id: "ru", name: "Русский (Tiếng Nga)" },
  { id: "hi", name: "हिन्दी (Tiếng Hindi)" },
  { id: "ar", name: "العربية (Tiếng Ả Rập)" },
] as const;

export type TargetLangId = (typeof TARGET_LANGS)[number]["id"];

export const TARGET_LANG_IDS = TARGET_LANGS.map((l) => l.id) as [
  TargetLangId,
  ...TargetLangId[],
];

export function targetLangName(id: string): string {
  return TARGET_LANGS.find((l) => l.id === id)?.name ?? id;
}
