export interface SubtitleStyle {
  /** must exist in worker fonts/ bundle — see RENDER_FONTS */
  font: string;
  /** #RRGGBB — màu nhấn từ khóa *dấu sao* (mặc định ACCENT_HIGHLIGHT_COLOR) */
  accent?: string;
  size: number;
  bold: boolean;
  /** #RRGGBB */
  primary: string;
  outline: string;
  /** #RRGGBB — combined with backOpacity into #RRGGBBAA */
  back?: string;
  /** 0..100 — độ đục của hộp nền (chỉ dùng khi borderStyle = 3; mặc định 67) */
  backOpacity?: number;
  /** 1 = outline+shadow, 3 = opaque/translucent box */
  borderStyle: 1 | 3;
  /** vertical margin from bottom, in PlayRes pixels */
  marginV: number;
  /** horizontal margins (PlayRes px) — control wrap width + horizontal center */
  marginL?: number;
  marginR?: number;
}

export interface StylePreset extends SubtitleStyle {
  id: string;
  name: string;
}

/** Fonts bundled in apps/worker/fonts (all OFL, full Vietnamese support). */
export const RENDER_FONTS = [
  "Be Vietnam Pro",
  "Montserrat",
  "Noto Sans",
  "Anton",
  "Oswald",
  "Baloo 2",
  "Bungee",
  "Paytone One",
  "Lobster",
  "Patrick Hand",
] as const;

/**
 * Hiệu ứng chữ phụ đề (áp cả preview lẫn bản xuất qua ASS tags):
 * fade = hiện dần, pop = phóng nhẹ khi vào, karaoke = màu chạy theo giọng đọc,
 * reveal = nói đến đâu chữ hiện đến đó (kiểu video TikTok).
 */
export const SUB_EFFECT_IDS = ["none", "fade", "pop", "reveal", "karaoke"] as const;
export type SubEffect = (typeof SUB_EFFECT_IDS)[number];

/** Màu "chưa đọc tới" của chế độ karaoke — chữ đổ dần từ màu này sang màu chính. */
export const KARAOKE_BASE_COLOR = "#C9C9C9";

/** Màu nhấn mặc định cho từ khóa quan trọng (bọc trong *dấu sao* ở bản dịch). */
export const ACCENT_HIGHLIGHT_COLOR = "#FFD400";

export const STYLE_PRESETS: StylePreset[] = [
  {
    id: "white-outline",
    name: "Trắng viền đen",
    font: "Be Vietnam Pro",
    size: 48,
    bold: false,
    primary: "#FFFFFF",
    outline: "#000000",
    borderStyle: 1,
    marginV: 40,
  },
  {
    id: "yellow-drama",
    name: "Vàng phim bộ",
    font: "Be Vietnam Pro",
    size: 50,
    bold: true,
    primary: "#FFE94A",
    outline: "#1A1A1A",
    borderStyle: 1,
    marginV: 40,
  },
  {
    id: "boxed",
    name: "Hộp mờ",
    font: "Be Vietnam Pro",
    size: 46,
    bold: false,
    primary: "#FFFFFF",
    outline: "#000000",
    back: "#000000",
    backOpacity: 67,
    borderStyle: 3,
    marginV: 40,
  },
  {
    id: "solid-box",
    name: "Ô kín (che chữ gốc)",
    font: "Be Vietnam Pro",
    size: 48,
    bold: true,
    primary: "#FFFFFF",
    outline: "#000000",
    back: "#101010",
    backOpacity: 100,
    borderStyle: 3,
    marginV: 36,
  },
  // ---- Mẫu bổ sung: đều ưu tiên DỄ ĐỌC (chữ sáng + viền/hộp tối tương phản cao) ----
  {
    id: "tiktok-bold",
    name: "TikTok đậm",
    font: "Anton",
    size: 54,
    // Anton vốn đã rất đậm — bật bold nữa sẽ bị bôi nhòe (libass làm đậm giả)
    bold: false,
    primary: "#FFFFFF",
    outline: "#000000",
    borderStyle: 1,
    marginV: 44,
  },
  {
    id: "cinema-clean",
    name: "Điện ảnh sạch",
    font: "Montserrat",
    size: 46,
    bold: true,
    primary: "#FFFFFF",
    outline: "#0A0A0A",
    borderStyle: 1,
    marginV: 44,
  },
  {
    id: "soft-box",
    name: "Hộp tối dịu",
    font: "Noto Sans",
    size: 46,
    bold: false,
    primary: "#FFFFFF",
    outline: "#000000",
    back: "#000000",
    backOpacity: 55,
    borderStyle: 3,
    marginV: 40,
  },
  {
    id: "coral-brand",
    name: "Cam nổi bật",
    font: "Baloo 2",
    size: 50,
    bold: true,
    primary: "#FFFFFF",
    outline: "#EE5631",
    borderStyle: 1,
    marginV: 42,
  },
  {
    id: "news-oswald",
    name: "Bản tin",
    font: "Oswald",
    size: 48,
    bold: false,
    primary: "#FFFFFF",
    outline: "#000000",
    back: "#111111",
    backOpacity: 75,
    borderStyle: 3,
    marginV: 38,
  },
  {
    id: "mint-pop",
    name: "Xanh mint",
    font: "Paytone One",
    size: 48,
    bold: false,
    primary: "#9BF6C8",
    outline: "#0B2E1F",
    borderStyle: 1,
    marginV: 42,
  },
];

export const ASPECT_PRESETS = [
  { id: "keep", name: "Giữ nguyên" },
  { id: "16:9", name: "16:9 (YouTube)", w: 1920, h: 1080 },
  { id: "9:16", name: "9:16 (TikTok/Reels)", w: 1080, h: 1920 },
  { id: "1:1", name: "1:1 (Vuông)", w: 1080, h: 1080 },
] as const;

export type AspectId = (typeof ASPECT_PRESETS)[number]["id"];

export const COVER_MODES = ["none", "blur", "box"] as const;
export type CoverMode = (typeof COVER_MODES)[number];

export const MAX_COVER_REGIONS = 10;

/** Normalized (0..1) rectangle in SOURCE video coordinate space. */
export interface CoverRegion {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface StyleOverrides {
  font?: string;
  fontSize?: number;
  bold?: boolean;
  /** #RRGGBB */
  primaryColor?: string;
  outlineColor?: string;
  boxColor?: string;
  /** 0..100 — opacity of the text background box */
  boxOpacity?: number;
  /** use an opaque/translucent box behind the text instead of outline */
  boxed?: boolean;
  /** vertical margin from bottom (PlayRes px) */
  marginV?: number;
  /** hiệu ứng chữ: fade / pop / reveal / karaoke (mặc định none) */
  effect?: SubEffect;
  /** #RRGGBB — màu nhấn cho từ bọc trong *dấu sao* */
  accentColor?: string;
}

export const LOGO_POSITIONS = [
  { id: "tl", name: "Góc trên — trái" },
  { id: "tr", name: "Góc trên — phải" },
  { id: "bl", name: "Góc dưới — trái" },
  { id: "br", name: "Góc dưới — phải" },
] as const;
export type LogoPosition = (typeof LOGO_POSITIONS)[number]["id"];

/** Watermark chữ CỦA NGƯỜI DÙNG chèn thêm vào video (tên kênh...). */
export interface LogoParams {
  text: string;
  position: LogoPosition;
  /** px theo chiều cao video xuất */
  fontSize: number;
  /** #RRGGBB */
  color: string;
  /** 0..100 */
  opacity: number;
  /** vị trí tự do 0..1 (phần của khoảng trống còn lại) — ghi đè position góc */
  fx?: number;
  fy?: number;
}

/** Watermark HÌNH ẢNH (PNG/JPG user upload lên R2) chèn vào video. */
export interface LogoImageParams {
  /** key R2 của file logo đã upload (logos/{userId}/...) */
  r2Key: string;
  position: LogoPosition;
  /** % chiều rộng video xuất (3..60) */
  scalePct: number;
  /** 0..100 */
  opacity: number;
  /** vị trí tự do 0..1 (phần của khoảng trống còn lại) — ghi đè position góc */
  fx?: number;
  fy?: number;
}

export interface RenderParams extends StyleOverrides {
  trackId: string;
  styleId: string;
  aspect: AspectId;
  coverMode: CoverMode;
  /** manual cover regions — blurred/boxed for the whole duration */
  regions?: CoverRegion[];
  /** 1..10 — mức làm mờ vùng che (mặc định 5) */
  blurStrength?: number;
  /**
   * Normalized (0..1, source space) box where subtitles render: text centers
   * horizontally inside it, bottom-anchored at its lower edge, wraps to its
   * width. Overrides marginV when present.
   */
  subBox?: CoverRegion;
  /** watermark chữ của người dùng chèn lên video */
  logo?: LogoParams;
  /** watermark hình ảnh (thay cho logo chữ) */
  logoImage?: LogoImageParams;
}
