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
  // Tên hiển thị là tên VIỆT dễ nhớ, không phải tên Hy Lạp của Google
  // (Aoede/Laomedeia/Zubenelgenubi... khách không tài nào nhớ nổi giọng nào là
  // giọng nào). Id vẫn giữ nguyên tên thật của Google — chỉ nhãn đổi.
  { id: "gcloud:vi-VN-Chirp3-HD-Aoede", name: "Lan Chi — nữ nhẹ nhàng", gender: "F" },
  { id: "gcloud:vi-VN-Chirp3-HD-Achernar", name: "Ánh Tuyết — nữ trong trẻo", gender: "F" },
  { id: "gcloud:vi-VN-Chirp3-HD-Autonoe", name: "Bích Ngọc — nữ ấm áp", gender: "F" },
  { id: "gcloud:vi-VN-Chirp3-HD-Callirrhoe", name: "Cẩm Tú — nữ thư thái", gender: "F" },
  { id: "gcloud:vi-VN-Chirp3-HD-Despina", name: "Diệu Hương — nữ mượt mà", gender: "F" },
  { id: "gcloud:vi-VN-Chirp3-HD-Erinome", name: "Hà My — nữ tươi tắn", gender: "F" },
  { id: "gcloud:vi-VN-Chirp3-HD-Gacrux", name: "Kim Oanh — nữ chững chạc", gender: "F" },
  { id: "gcloud:vi-VN-Chirp3-HD-Kore", name: "Phương Thảo — nữ rõ ràng", gender: "F" },
  { id: "gcloud:vi-VN-Chirp3-HD-Laomedeia", name: "Quỳnh Như — nữ trẻ trung", gender: "F" },
  { id: "gcloud:vi-VN-Chirp3-HD-Leda", name: "Thanh Mai — nữ dịu dàng", gender: "F" },
  { id: "gcloud:vi-VN-Chirp3-HD-Pulcherrima", name: "Tuyết Nhi — nữ sinh động", gender: "F" },
  { id: "gcloud:vi-VN-Chirp3-HD-Sulafat", name: "Vân Anh — nữ truyền cảm", gender: "F" },
  { id: "gcloud:vi-VN-Chirp3-HD-Vindemiatrix", name: "Xuân Hoa — nữ điềm đạm", gender: "F" },
  { id: "gcloud:vi-VN-Chirp3-HD-Zephyr", name: "Yến Vy — nữ tươi sáng", gender: "F" },
  { id: "gcloud:vi-VN-Chirp3-HD-Achird", name: "Anh Tuấn — nam thân thiện", gender: "M" },
  { id: "gcloud:vi-VN-Chirp3-HD-Algenib", name: "Bá Long — nam trầm ấm", gender: "M" },
  { id: "gcloud:vi-VN-Chirp3-HD-Algieba", name: "Công Danh — nam mượt", gender: "M" },
  { id: "gcloud:vi-VN-Chirp3-HD-Alnilam", name: "Duy Khánh — nam chắc khỏe", gender: "M" },
  { id: "gcloud:vi-VN-Chirp3-HD-Charon", name: "Hữu Nghĩa — nam đọc tin", gender: "M" },
  { id: "gcloud:vi-VN-Chirp3-HD-Enceladus", name: "Khắc Minh — nam thủ thỉ", gender: "M" },
  { id: "gcloud:vi-VN-Chirp3-HD-Fenrir", name: "Lâm Phong — nam mạnh mẽ", gender: "M" },
  { id: "gcloud:vi-VN-Chirp3-HD-Iapetus", name: "Mạnh Hùng — nam trầm", gender: "M" },
  { id: "gcloud:vi-VN-Chirp3-HD-Orus", name: "Ngọc Sơn — nam dứt khoát", gender: "M" },
  { id: "gcloud:vi-VN-Chirp3-HD-Puck", name: "Phi Hùng — nam sôi nổi", gender: "M" },
  { id: "gcloud:vi-VN-Chirp3-HD-Rasalgethi", name: "Quốc Bảo — nam kể chuyện", gender: "M" },
  { id: "gcloud:vi-VN-Chirp3-HD-Sadachbia", name: "Sỹ Nguyên — nam trẻ trung", gender: "M" },
  { id: "gcloud:vi-VN-Chirp3-HD-Sadaltager", name: "Tấn Phát — nam điềm tĩnh", gender: "M" },
  { id: "gcloud:vi-VN-Chirp3-HD-Schedar", name: "Trung Kiên — nam nghiêm túc", gender: "M" },
  { id: "gcloud:vi-VN-Chirp3-HD-Umbriel", name: "Vĩnh Phúc — nam nhẹ nhàng", gender: "M" },
  { id: "gcloud:vi-VN-Chirp3-HD-Zubenelgenubi", name: "Xuân Trường — nam gần gũi", gender: "M" },
  // ---- Neural2 ----
  { id: "gcloud:vi-VN-Neural2-A", name: "Hồng Đào — nữ (bản thường)", gender: "F" },
  { id: "gcloud:vi-VN-Neural2-D", name: "Đình Toàn — nam (bản thường)", gender: "M" },
  // ---- Wavenet / Standard ----
  { id: "gcloud:vi-VN-Wavenet-A", name: "Thu Hà — nữ tự nhiên", gender: "F" },
  { id: "gcloud:vi-VN-Wavenet-B", name: "Việt Hoàng — nam tự nhiên", gender: "M" },
  { id: "gcloud:vi-VN-Wavenet-C", name: "Mỹ Linh — nữ trầm", gender: "F" },
  { id: "gcloud:vi-VN-Wavenet-D", name: "Trọng Nhân — nam trầm", gender: "M" },
  { id: "gcloud:vi-VN-Standard-A", name: "Bảo Ngân — nữ (cơ bản)", gender: "F" },
  { id: "gcloud:vi-VN-Standard-B", name: "Gia Huy — nam (cơ bản)", gender: "M" },
  { id: "gcloud:vi-VN-Standard-C", name: "Kiều Trang — nữ (cơ bản)", gender: "F" },
  { id: "gcloud:vi-VN-Standard-D", name: "Nhật Minh — nam (cơ bản)", gender: "M" },
] as const;

export const GCLOUD_VOICE_IDS = new Set<string>(GCLOUD_VOICES.map((v) => v.id));

/** "gcloud:vi-VN-Wavenet-A" → tên voice thật gửi cho Google Cloud TTS. */
export function gcloudVoiceName(id: string): string | null {
  return id.startsWith("gcloud:") ? id.slice("gcloud:".length) : null;
}

export type VoiceProvider = "edge" | "gemini" | "eleven" | "gcloud";

/** Provider của một id giọng (theo tiền tố) — mặc định edge (không tiền tố). */
export function voiceProvider(id: string): VoiceProvider {
  if (id.startsWith("gemini:")) return "gemini";
  if (id.startsWith("eleven:")) return "eleven";
  if (id.startsWith("gcloud:")) return "gcloud";
  return "edge";
}

/**
 * Giọng Edge tiếng Việt tương đương (CÙNG GIỚI TÍNH) để hạ cấp khi nguồn trả
 * phí hết hạn mức. Edge miễn phí không giới hạn nên luôn là lưới an toàn cuối.
 * Không tra được giới tính thì lấy giọng nữ (Hoài My) làm mặc định.
 */
export function edgeFallbackVoice(voiceId: string): string {
  const all = [...GEMINI_VOICES, ...ELEVEN_VOICES, ...GCLOUD_VOICES];
  const found = all.find((v) => v.id === voiceId);
  const male = DUB_VOICES.find((v) => v.gender === "male")!.id;
  const female = DUB_VOICES.find((v) => v.gender === "female")!.id;
  return found?.gender === "M" ? male : female;
}

/**
 * Giọng được phép đọc văn bản TÙY Ý mà không tính xu — chỉ nguồn có hạn mức
 * rộng hoặc miễn phí hẳn: edge (miễn phí) và gcloud (1-4tr ký tự/tháng).
 *
 * ElevenLabs và Gemini CỐ TÌNH không nằm đây: tính tiền theo ký tự, nên cho đọc
 * tự do là ai đăng ký một tài khoản cũng tiêu được tiền thật của mình không giới hạn.
 * Dùng chung cho /api/tts-preview và /api/voice-clone/speak — hai chỗ này mà lệch
 * tiêu chí thì chỗ lỏng hơn thành lỗ hổng.
 */
export function hasWideTtsQuota(id: string): boolean {
  const p = voiceProvider(id);
  return p === "edge" || p === "gcloud";
}

/**
 * Giọng tính giá CAO CẤP khi lồng tiếng — nguồn tính tiền theo từng ký tự.
 *
 * Trước đây "cao cấp" nghĩa là "đúng Gemini", và định nghĩa đó bị chép lại ở 4
 * nơi (worker trừ xu, 2 chỗ hiển thị giá, route tạo job). Hệ quả: lồng tiếng
 * bằng ElevenLabs — nguồn ĐẮT NHẤT — lại bị tính đúng bằng giá Edge miễn phí.
 * Gom về một hàm để không nơi nào lệch nơi nào nữa.
 *
 */
export function isPremiumVoice(id: string): boolean {
  const p = voiceProvider(id);
  return p === "gemini" || p === "eleven";
}

/** Id giọng thuộc một trong các catalog đã hỗ trợ — dùng validate mọi API. */
export function isValidVoiceId(id: string): boolean {
  return (
    EDGE_VOICE_IDS.has(id) ||
    GEMINI_VOICE_IDS.has(id) ||
    ELEVEN_VOICE_IDS.has(id) ||
    GCLOUD_VOICE_IDS.has(id)
  );
}

export interface DubParams {
  trackId: string;
  /** giọng chính (Giọng 1) — mọi dòng không gán nhân vật đều đọc bằng giọng này */
  voice: string;
  /**
   * Giọng 2 và 3 cho lồng tiếng NHIỀU NHÂN VẬT. Dòng nào có `speaker = 1|2`
   * thì đọc bằng giọng tương ứng; thiếu giọng đó thì rơi về giọng chính.
   */
  voices?: string[];
  /** lồng tiếng lên file khác video gốc (vd: bản đã render phụ đề) */
  sourceR2Key?: string;
  /** 0.8 .. 1.3 — tốc độ đọc cơ bản (trước khi ép khớp thời lượng) */
  speed: number;
  /**
   * -10 .. 10 — cao độ giọng đọc (0 = giữ nguyên). Số âm là trầm hơn, số dương
   * là cao hơn. CHỈ Google Cloud và Edge nhận tham số này; các nguồn khác bỏ qua.
   */
  pitch?: number;
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
