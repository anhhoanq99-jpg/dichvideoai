export interface SubtitleStyle {
  /** must exist in worker fonts/ bundle */
  font: string;
  size: number;
  /** #RRGGBB */
  primary: string;
  outline: string;
  /** #RRGGBBAA for boxed background */
  back?: string;
  /** 1 = outline+shadow, 3 = opaque/translucent box */
  borderStyle: 1 | 3;
  /** vertical margin from bottom, in PlayRes pixels */
  marginV: number;
}

export interface StylePreset extends SubtitleStyle {
  id: string;
  name: string;
}

export const STYLE_PRESETS: StylePreset[] = [
  {
    id: "white-outline",
    name: "Trắng viền đen",
    font: "Be Vietnam Pro",
    size: 48,
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
    primary: "#FFFFFF",
    outline: "#000000",
    back: "#000000AA",
    borderStyle: 3,
    marginV: 40,
  },
];

export const ASPECT_PRESETS = [
  { id: "keep", name: "Giữ nguyên" },
  { id: "16:9", name: "16:9 (YouTube)", w: 1920, h: 1080 },
  { id: "9:16", name: "9:16 (TikTok/Reels)", w: 1080, h: 1920 },
  { id: "1:1", name: "1:1 (Vuông)", w: 1080, h: 1080 },
] as const;

export type AspectId = (typeof ASPECT_PRESETS)[number]["id"];

export const COVER_MODES = ["none", "blur", "box", "auto"] as const;
export type CoverMode = (typeof COVER_MODES)[number];

export const PLACEMENTS = ["bottom", "replace"] as const;
/** bottom = fixed bottom-center subs; replace = position each VN line over the original text box */
export type Placement = (typeof PLACEMENTS)[number];

/** Normalized (0..1) rectangle in SOURCE video coordinate space. */
export interface CoverRegion {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface RenderParams {
  trackId: string;
  styleId: string;
  /** clamped overrides */
  fontSize?: number;
  marginV?: number;
  /** #RRGGBB override for text color */
  primaryColor?: string;
  /** #RRGGBB or #RRGGBBAA override for box background (boxed/replace styles) */
  boxColor?: string;
  aspect: AspectId;
  coverMode: CoverMode;
  region?: CoverRegion;
  /** replace requires aspect="keep" and an OCR track with boxes */
  placement?: Placement;
}
