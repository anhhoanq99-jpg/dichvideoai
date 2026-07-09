export interface SubtitleStyle {
  /** must exist in worker fonts/ bundle — see RENDER_FONTS */
  font: string;
  size: number;
  bold: boolean;
  /** #RRGGBB */
  primary: string;
  outline: string;
  /** #RRGGBB — combined with backOpacity into #RRGGBBAA */
  back?: string;
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
] as const;

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
    borderStyle: 3,
    marginV: 36,
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
}

export interface RenderParams extends StyleOverrides {
  trackId: string;
  styleId: string;
  aspect: AspectId;
  coverMode: CoverMode;
  /** manual cover regions — blurred/boxed for the whole duration */
  regions?: CoverRegion[];
  /**
   * Normalized (0..1, source space) box where subtitles render: text centers
   * horizontally inside it, bottom-anchored at its lower edge, wraps to its
   * width. Overrides marginV when present.
   */
  subBox?: CoverRegion;
}
