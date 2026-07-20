import { EDGE_VOICE_IDS } from "./edge-voices";

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

/**
 * Giọng ElevenLabs (premade, id công khai) — cần ELEVENLABS_API_KEY riêng,
 * gói free ~10.000 credits/tháng (~10 phút audio). Đọc tiếng Việt qua model
 * multilingual (giọng gốc tiếng Anh nên có chút accent).
 */
// 14 giọng đã kiểm chứng chạy được trên gói FREE (13/07/2026); các giọng
// premade khác (Rachel, Josh, Domi...) ElevenLabs khóa sau gói trả phí.
export const ELEVEN_VOICES = [
  // ---- Nam ----
  { id: "eleven:pNInz6obpgDQGcFmaJgB", name: "Adam — nam trầm ấm", gender: "M" },
  { id: "eleven:ErXwobaYiN019PkySvjV", name: "Antoni — nam ấm áp", gender: "M" },
  { id: "eleven:VR6AewLTigWG4xSOukaG", name: "Arnold — nam mạnh mẽ", gender: "M" },
  { id: "eleven:nPczCjzI2devNBz1zQrb", name: "Brian — nam trầm tĩnh", gender: "M" },
  { id: "eleven:N2lVS1w4EtoT3dr4eOWO", name: "Callum — nam khàn cá tính", gender: "M" },
  { id: "eleven:IKne3meq5aSn9XLyUdCD", name: "Charlie — nam tự nhiên", gender: "M" },
  { id: "eleven:onwK4e9ZLuTAKqWW03F9", name: "Daniel — nam đọc tin", gender: "M" },
  { id: "eleven:JBFqnCBsd6RMkjVDRZzb", name: "George — nam ấm trầm", gender: "M" },
  { id: "eleven:SOYHLrjzK2X1ezoPC6cr", name: "Harry — nam trẻ khỏe", gender: "M" },
  { id: "eleven:TX3LPaxmHKxFdv7VOQHJ", name: "Liam — nam rõ ràng", gender: "M" },
  // ---- Nữ ----
  { id: "eleven:Xb7hH8MSUJpSbSDYk0k2", name: "Alice — nữ đọc tin", gender: "F" },
  { id: "eleven:pFZP5JQG7iQjIQuC4Bku", name: "Lily — nữ ấm áp", gender: "F" },
  { id: "eleven:XrExE9yKIg1WjnnlVkGX", name: "Matilda — nữ thân thiện", gender: "F" },
  { id: "eleven:EXAVITQu4vr4xnSDxMaL", name: "Sarah — nữ nhẹ nhàng", gender: "F" },
] as const;

export const ELEVEN_VOICE_IDS = new Set<string>(ELEVEN_VOICES.map((v) => v.id));

/** "eleven:pNIn..." → voice_id thật gửi cho API ElevenLabs. */
export function elevenVoiceId(id: string): string | null {
  return id.startsWith("eleven:") ? id.slice("eleven:".length) : null;
}

/**
 * Giọng Google Cloud TTS tiếng Việt — cần GOOGLE_TTS_API_KEY riêng.
 * Free hằng tháng: Chirp3-HD/Neural2/Wavenet ~1 triệu ký tự, Standard 4 triệu.
 * Chirp3-HD là thế hệ mới nhất, tự nhiên nhất (đã verify synth + speakingRate 15/07/2026).
 */
export const GCLOUD_VOICES = [
  // ---- Chirp3-HD: tự nhiên nhất ----
  { id: "gcloud:vi-VN-Chirp3-HD-Aoede", name: "Google HD Aoede — nữ", gender: "F" },
  { id: "gcloud:vi-VN-Chirp3-HD-Achernar", name: "Google HD Achernar — nữ", gender: "F" },
  { id: "gcloud:vi-VN-Chirp3-HD-Autonoe", name: "Google HD Autonoe — nữ", gender: "F" },
  { id: "gcloud:vi-VN-Chirp3-HD-Callirrhoe", name: "Google HD Callirrhoe — nữ", gender: "F" },
  { id: "gcloud:vi-VN-Chirp3-HD-Despina", name: "Google HD Despina — nữ", gender: "F" },
  { id: "gcloud:vi-VN-Chirp3-HD-Erinome", name: "Google HD Erinome — nữ", gender: "F" },
  { id: "gcloud:vi-VN-Chirp3-HD-Gacrux", name: "Google HD Gacrux — nữ", gender: "F" },
  { id: "gcloud:vi-VN-Chirp3-HD-Kore", name: "Google HD Kore — nữ", gender: "F" },
  { id: "gcloud:vi-VN-Chirp3-HD-Laomedeia", name: "Google HD Laomedeia — nữ", gender: "F" },
  { id: "gcloud:vi-VN-Chirp3-HD-Leda", name: "Google HD Leda — nữ", gender: "F" },
  { id: "gcloud:vi-VN-Chirp3-HD-Pulcherrima", name: "Google HD Pulcherrima — nữ", gender: "F" },
  { id: "gcloud:vi-VN-Chirp3-HD-Sulafat", name: "Google HD Sulafat — nữ", gender: "F" },
  { id: "gcloud:vi-VN-Chirp3-HD-Vindemiatrix", name: "Google HD Vindemiatrix — nữ", gender: "F" },
  { id: "gcloud:vi-VN-Chirp3-HD-Zephyr", name: "Google HD Zephyr — nữ", gender: "F" },
  { id: "gcloud:vi-VN-Chirp3-HD-Achird", name: "Google HD Achird — nam", gender: "M" },
  { id: "gcloud:vi-VN-Chirp3-HD-Algenib", name: "Google HD Algenib — nam", gender: "M" },
  { id: "gcloud:vi-VN-Chirp3-HD-Algieba", name: "Google HD Algieba — nam", gender: "M" },
  { id: "gcloud:vi-VN-Chirp3-HD-Alnilam", name: "Google HD Alnilam — nam", gender: "M" },
  { id: "gcloud:vi-VN-Chirp3-HD-Charon", name: "Google HD Charon — nam", gender: "M" },
  { id: "gcloud:vi-VN-Chirp3-HD-Enceladus", name: "Google HD Enceladus — nam", gender: "M" },
  { id: "gcloud:vi-VN-Chirp3-HD-Fenrir", name: "Google HD Fenrir — nam", gender: "M" },
  { id: "gcloud:vi-VN-Chirp3-HD-Iapetus", name: "Google HD Iapetus — nam", gender: "M" },
  { id: "gcloud:vi-VN-Chirp3-HD-Orus", name: "Google HD Orus — nam", gender: "M" },
  { id: "gcloud:vi-VN-Chirp3-HD-Puck", name: "Google HD Puck — nam", gender: "M" },
  { id: "gcloud:vi-VN-Chirp3-HD-Rasalgethi", name: "Google HD Rasalgethi — nam", gender: "M" },
  { id: "gcloud:vi-VN-Chirp3-HD-Sadachbia", name: "Google HD Sadachbia — nam", gender: "M" },
  { id: "gcloud:vi-VN-Chirp3-HD-Sadaltager", name: "Google HD Sadaltager — nam", gender: "M" },
  { id: "gcloud:vi-VN-Chirp3-HD-Schedar", name: "Google HD Schedar — nam", gender: "M" },
  { id: "gcloud:vi-VN-Chirp3-HD-Umbriel", name: "Google HD Umbriel — nam", gender: "M" },
  { id: "gcloud:vi-VN-Chirp3-HD-Zubenelgenubi", name: "Google HD Zubenelgenubi — nam", gender: "M" },
  // ---- Neural2 ----
  { id: "gcloud:vi-VN-Neural2-A", name: "Google Neural2 A — nữ", gender: "F" },
  { id: "gcloud:vi-VN-Neural2-D", name: "Google Neural2 D — nam", gender: "M" },
  // ---- Wavenet / Standard ----
  { id: "gcloud:vi-VN-Wavenet-A", name: "Google Wavenet A — nữ tự nhiên", gender: "F" },
  { id: "gcloud:vi-VN-Wavenet-B", name: "Google Wavenet B — nam tự nhiên", gender: "M" },
  { id: "gcloud:vi-VN-Wavenet-C", name: "Google Wavenet C — nữ trầm", gender: "F" },
  { id: "gcloud:vi-VN-Wavenet-D", name: "Google Wavenet D — nam trầm", gender: "M" },
  { id: "gcloud:vi-VN-Standard-A", name: "Google Standard A — nữ", gender: "F" },
  { id: "gcloud:vi-VN-Standard-B", name: "Google Standard B — nam", gender: "M" },
  { id: "gcloud:vi-VN-Standard-C", name: "Google Standard C — nữ", gender: "F" },
  { id: "gcloud:vi-VN-Standard-D", name: "Google Standard D — nam", gender: "M" },
] as const;

export const GCLOUD_VOICE_IDS = new Set<string>(GCLOUD_VOICES.map((v) => v.id));

/** "gcloud:vi-VN-Wavenet-A" → tên voice thật gửi cho Google Cloud TTS. */
export function gcloudVoiceName(id: string): string | null {
  return id.startsWith("gcloud:") ? id.slice("gcloud:".length) : null;
}

/**
 * Giọng FPT.AI — tiếng Việt BẢN ĐỊA, đủ 3 miền. Đây là nhóm giọng quen tai
 * khán giả Việt trong video review/thuyết minh. Cần FPT_TTS_API_KEY.
 * API trả LINK mp3 chưa sẵn sàng ngay (chờ 5s–2 phút) nên worker phải poll.
 */
export const FPT_VOICES = [
  { id: "fpt:banmai", name: "Ban Mai — nữ Bắc (thuyết minh)", gender: "F" as const },
  { id: "fpt:thuminh", name: "Thu Minh — nữ Bắc", gender: "F" as const },
  { id: "fpt:leminh", name: "Lê Minh — nam Bắc (review)", gender: "M" as const },
  { id: "fpt:giahuy", name: "Gia Huy — nam Trung", gender: "M" as const },
  { id: "fpt:myan", name: "Mỹ An — nữ Trung", gender: "F" as const },
  { id: "fpt:lannhi", name: "Lan Nhi — nữ Nam", gender: "F" as const },
  { id: "fpt:linhsan", name: "Linh San — nữ Nam", gender: "F" as const },
] as const;

export const FPT_VOICE_IDS = new Set<string>(FPT_VOICES.map((v) => v.id));

export function fptVoiceName(id: string): string | null {
  return id.startsWith("fpt:") ? id.slice("fpt:".length) : null;
}

/**
 * Giọng Viettel AI — tiếng Việt bản địa, hạn mức miễn phí rất rộng
 * (~500.000 ký tự/ngày). Cần VIETTEL_TTS_TOKEN.
 * API trả THẲNG file wav nên hợp pipeline đọc từng câu hơn FPT.
 *
 * CHỈ liệt kê id đã XÁC NHẬN trong tài liệu Viettel. Danh sách đầy đủ phải lấy
 * từ chính API của họ (cần token) — chạy `npx tsx scripts/list-tts-voices.ts`
 * rồi dán kết quả vào đây. KHÔNG đoán id: đoán sai thì khách chọn giọng xong
 * job lồng tiếng fail, mà lỗi chỉ lộ ra lúc đã trừ xu.
 */
export const VIETTEL_VOICES = [
  { id: "viettel:doanngocle", name: "Đoàn Ngọc Lê — nam", gender: "M" as const },
] as const;

export const VIETTEL_VOICE_IDS = new Set<string>(VIETTEL_VOICES.map((v) => v.id));

export function viettelVoiceName(id: string): string | null {
  return id.startsWith("viettel:") ? id.slice("viettel:".length) : null;
}

export type VoiceProvider =
  | "edge"
  | "gemini"
  | "eleven"
  | "gcloud"
  | "fpt"
  | "viettel";

/** Provider của một id giọng (theo tiền tố) — mặc định edge (không tiền tố). */
export function voiceProvider(id: string): VoiceProvider {
  if (id.startsWith("gemini:")) return "gemini";
  if (id.startsWith("eleven:")) return "eleven";
  if (id.startsWith("gcloud:")) return "gcloud";
  if (id.startsWith("fpt:")) return "fpt";
  if (id.startsWith("viettel:")) return "viettel";
  return "edge";
}

/** Id giọng thuộc một trong các catalog đã hỗ trợ — dùng validate mọi API. */
export function isValidVoiceId(id: string): boolean {
  return (
    EDGE_VOICE_IDS.has(id) ||
    GEMINI_VOICE_IDS.has(id) ||
    ELEVEN_VOICE_IDS.has(id) ||
    GCLOUD_VOICE_IDS.has(id) ||
    FPT_VOICE_IDS.has(id) ||
    VIETTEL_VOICE_IDS.has(id)
  );
}

export interface DubParams {
  trackId: string;
  /** id giọng Edge TTS bất kỳ trong EDGE_VOICES (322 giọng, đủ mọi quốc gia) */
  voice: string;
  /** lồng tiếng lên file khác video gốc (vd: bản đã render phụ đề) */
  sourceR2Key?: string;
  /** 0.8 .. 1.3 — tốc độ đọc cơ bản (trước khi ép khớp thời lượng) */
  speed: number;
  /** 0 .. 200 (%) — âm lượng giọng AI */
  aiVolume: number;
  /** 0 .. 100 (%) — âm lượng audio gốc GIỮA các câu thoại (nhạc nền); 0 = tắt */
  bgVolume: number;
  /**
   * 0 .. 100 (%) — âm lượng audio gốc TRONG lúc AI đọc (hạ giọng nói gốc
   * xuống để không chồng tiếng). Bỏ trống = dùng bgVolume (không hạ thêm).
   */
  origVoiceVolume?: number;
}
