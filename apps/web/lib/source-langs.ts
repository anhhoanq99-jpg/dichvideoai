import type { Lang } from "@/lib/i18n";

/**
 * Ngôn ngữ GỐC của video — mã ISO-639-1 truyền cho Whisper (STT) và Gemini (OCR).
 * Dùng chung cho trang upload + panel trích xuất; "" = tự nhận diện.
 */
const LANGS: { value: string; native: string; vi: string; en: string }[] = [
  { value: "zh", native: "中文", vi: "Trung", en: "Chinese" },
  { value: "en", native: "English", vi: "Anh", en: "English" },
  { value: "ja", native: "日本語", vi: "Nhật", en: "Japanese" },
  { value: "ko", native: "한국어", vi: "Hàn", en: "Korean" },
  { value: "th", native: "ไทย", vi: "Thái", en: "Thai" },
  { value: "vi", native: "Tiếng Việt", vi: "Việt", en: "Vietnamese" },
  { value: "id", native: "Bahasa Indonesia", vi: "Indonesia", en: "Indonesian" },
  { value: "ms", native: "Bahasa Melayu", vi: "Malaysia", en: "Malay" },
  { value: "tl", native: "Filipino", vi: "Philippines", en: "Filipino" },
  { value: "km", native: "ខ្មែរ", vi: "Campuchia", en: "Khmer" },
  { value: "lo", native: "ລາວ", vi: "Lào", en: "Lao" },
  { value: "fr", native: "Français", vi: "Pháp", en: "French" },
  { value: "de", native: "Deutsch", vi: "Đức", en: "German" },
  { value: "es", native: "Español", vi: "Tây Ban Nha", en: "Spanish" },
  { value: "pt", native: "Português", vi: "Bồ Đào Nha", en: "Portuguese" },
  { value: "it", native: "Italiano", vi: "Ý", en: "Italian" },
  { value: "ru", native: "Русский", vi: "Nga", en: "Russian" },
  { value: "uk", native: "Українська", vi: "Ukraina", en: "Ukrainian" },
  { value: "ar", native: "العربية", vi: "Ả Rập", en: "Arabic" },
  { value: "hi", native: "हिन्दी", vi: "Hindi (Ấn Độ)", en: "Hindi" },
  { value: "tr", native: "Türkçe", vi: "Thổ Nhĩ Kỳ", en: "Turkish" },
  { value: "nl", native: "Nederlands", vi: "Hà Lan", en: "Dutch" },
  { value: "pl", native: "Polski", vi: "Ba Lan", en: "Polish" },
];

/** Danh sách option cho <select> ngôn ngữ gốc, kèm "Tự nhận diện" đứng đầu. */
export function sourceLangOptions(lang: Lang): { value: string; label: string }[] {
  return [
    { value: "", label: lang === "vi" ? "Tự nhận diện" : "Auto-detect" },
    ...LANGS.map((l) => ({
      value: l.value,
      label: `${l.native} (${lang === "vi" ? l.vi : l.en})`,
    })),
  ];
}
