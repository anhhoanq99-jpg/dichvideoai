/** Giọng lồng tiếng — Edge TTS (miễn phí). Provider trả phí thêm sau. */
export const DUB_VOICES = [
  {
    id: "vi-VN-HoaiMyNeural",
    name: "Hoài My — Nữ miền Bắc",
    gender: "female" as const,
    provider: "edge" as const,
  },
  {
    id: "vi-VN-NamMinhNeural",
    name: "Nam Minh — Nam miền Bắc",
    gender: "male" as const,
    provider: "edge" as const,
  },
] as const;

export type DubVoiceId = (typeof DUB_VOICES)[number]["id"];

export const DUB_VOICE_IDS = DUB_VOICES.map((v) => v.id) as [
  DubVoiceId,
  ...DubVoiceId[],
];

/**
 * Giọng cao cấp — Gemini TTS (đa ngôn ngữ, đọc tiếng Việt tự nhiên, diễn cảm).
 * id có tiền tố "gemini:"; tên hiển thị là tên Việt tự đặt của sản phẩm.
 */
export const GEMINI_VOICES = [
  { id: "gemini:Kore", name: "Khánh Vy — nữ chững chạc", gender: "F" },
  { id: "gemini:Zephyr", name: "Mai Anh — nữ tươi sáng", gender: "F" },
  { id: "gemini:Leda", name: "Thu Trang — nữ trẻ trung", gender: "F" },
  { id: "gemini:Aoede", name: "Hồng Nhung — nữ nhẹ nhàng", gender: "F" },
  { id: "gemini:Callirrhoe", name: "Thanh Hà — nữ thư thái", gender: "F" },
  { id: "gemini:Despina", name: "Ngọc Lan — nữ mượt mà", gender: "F" },
  { id: "gemini:Achernar", name: "Bảo Châu — nữ trong trẻo", gender: "F" },
  { id: "gemini:Vindemiatrix", name: "Diệu Linh — nữ dịu dàng", gender: "F" },
  { id: "gemini:Puck", name: "Minh Khang — nam sôi nổi", gender: "M" },
  { id: "gemini:Charon", name: "Quang Huy — nam đọc tin", gender: "M" },
  { id: "gemini:Fenrir", name: "Tuấn Kiệt — nam mạnh mẽ", gender: "M" },
  { id: "gemini:Orus", name: "Đức Anh — nam dứt khoát", gender: "M" },
  { id: "gemini:Enceladus", name: "Hoàng Nam — nam thủ thỉ", gender: "M" },
  { id: "gemini:Iapetus", name: "Thành Trung — nam trầm ấm", gender: "M" },
  { id: "gemini:Alnilam", name: "Việt Dũng — nam chắc khỏe", gender: "M" },
  { id: "gemini:Rasalgethi", name: "Gia Bảo — nam kể chuyện", gender: "M" },
] as const;

export const GEMINI_VOICE_IDS = new Set<string>(GEMINI_VOICES.map((v) => v.id));

/** "gemini:Kore" → "Kore" (tên voice thật gửi cho API). */
export function geminiVoiceName(id: string): string | null {
  return id.startsWith("gemini:") ? id.slice("gemini:".length) : null;
}

export interface DubParams {
  trackId: string;
  /** id giọng Edge TTS bất kỳ trong EDGE_VOICES (322 giọng, đủ mọi quốc gia) */
  voice: string;
  /** 0.8 .. 1.3 — tốc độ đọc cơ bản (trước khi ép khớp thời lượng) */
  speed: number;
  /** 0 .. 200 (%) — âm lượng giọng AI */
  aiVolume: number;
  /** 0 .. 100 (%) — âm lượng audio gốc giữ lại (nhạc nền); 0 = tắt tiếng gốc */
  bgVolume: number;
}
