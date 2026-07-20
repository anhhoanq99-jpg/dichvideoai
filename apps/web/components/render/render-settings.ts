import {
  STYLE_PRESETS,
  type CoverMode,
  type CoverRegion,
  type LogoPosition,
  type SubEffect,
} from "@dichvideo/shared";

/** Toàn bộ thiết lập render người dùng chỉnh trong panel — lưu được theo tên. */
export interface RenderSettings {
  styleId: string;
  aspect: string;
  coverMode: CoverMode;
  /** 1..10 — mức làm mờ vùng che */
  blurStrength: number;
  placeOver: boolean;
  customize: boolean;
  // style overrides
  font: string;
  fontSize: number;
  bold: boolean;
  primaryColor: string;
  outlineColor: string;
  boxed: boolean;
  boxColor: string;
  boxOpacity: number;
  marginV: number;
  /** hiệu ứng chữ: none / fade / pop / reveal / karaoke */
  effect: SubEffect;
  /** màu nhấn cho từ khóa bọc trong *dấu sao* */
  accentColor: string;
  // logo/watermark của user (chữ hoặc hình ảnh)
  logoOn: boolean;
  logoType: "text" | "image";
  logoText: string;
  logoPosition: LogoPosition;
  logoSize: number;
  logoColor: string;
  logoOpacity: number;
  /** key R2 của logo ảnh đã upload */
  logoImageKey: string | null;
  /** url xem trước logo ảnh (presigned 1h — chỉ dùng trong phiên) */
  logoImageUrl: string | null;
  /** % chiều rộng video (3..60) */
  logoScale: number;
  /** vị trí tự do 0..1 do user kéo trên preview — null = theo góc logoPosition */
  logoFx: number | null;
  logoFy: number | null;
}

/** Các trường style lấy từ preset kiểu phụ đề (dùng khi đổi preset). */
export function styleFieldsFromPreset(styleId: string): Partial<RenderSettings> {
  const preset = STYLE_PRESETS.find((p) => p.id === styleId);
  if (!preset) return {};
  return {
    styleId,
    font: preset.font,
    fontSize: preset.size,
    bold: preset.bold,
    primaryColor: preset.primary,
    outlineColor: preset.outline,
    boxed: preset.borderStyle === 3,
    boxColor: preset.back ?? "#000000",
    boxOpacity: preset.backOpacity ?? 67,
    marginV: preset.marginV,
  };
}

export const DEFAULT_RENDER_SETTINGS: RenderSettings = {
  styleId: STYLE_PRESETS[0].id,
  aspect: "keep",
  coverMode: "blur",
  blurStrength: 5,
  placeOver: true,
  // studio hiện thẳng bảng tùy chỉnh chi tiết nên mặc định bật
  customize: true,
  font: STYLE_PRESETS[0].font,
  fontSize: STYLE_PRESETS[0].size,
  bold: STYLE_PRESETS[0].bold,
  primaryColor: STYLE_PRESETS[0].primary,
  outlineColor: STYLE_PRESETS[0].outline,
  boxed: STYLE_PRESETS[0].borderStyle === 3,
  boxColor: "#000000",
  boxOpacity: 67,
  marginV: STYLE_PRESETS[0].marginV,
  effect: "none",
  accentColor: "#FFD400",
  logoOn: false,
  logoType: "text",
  logoText: "",
  logoPosition: "tr",
  logoSize: 28,
  logoColor: "#FFFFFF",
  logoOpacity: 80,
  logoImageKey: null,
  logoImageUrl: null,
  logoScale: 15,
  logoFx: null,
  logoFy: null,
};

/**
 * Dải che mặc định — bám đáy khung hình, nơi phụ đề gốc hay nằm.
 * Để ở đây (không phải trong cover-modal) vì studio dùng nó lúc khởi tạo state:
 * nếu để trong modal thì modal luôn bị kéo vào bundle chính, không tách tải động được.
 */
export const DEFAULT_BAND: CoverRegion = { x: 0.02, y: 0.78, w: 0.96, h: 0.16 };

/** Vùng che thấp nhất trên khung hình — phụ đề Việt sẽ đè vào đúng chỗ này. */
export function lowestRegion(regions: CoverRegion[]): CoverRegion | null {
  if (regions.length === 0) return null;
  return regions.reduce((a, b) => (a.y + a.h >= b.y + b.h ? a : b));
}

