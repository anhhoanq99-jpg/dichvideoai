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

export interface DubParams {
  trackId: string;
  voice: DubVoiceId;
  /** 0.8 .. 1.3 — tốc độ đọc cơ bản (trước khi ép khớp thời lượng) */
  speed: number;
  /** 0 .. 200 (%) — âm lượng giọng AI */
  aiVolume: number;
  /** 0 .. 100 (%) — âm lượng audio gốc giữ lại (nhạc nền); 0 = tắt tiếng gốc */
  bgVolume: number;
}
