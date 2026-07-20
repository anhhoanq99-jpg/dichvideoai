export const VIDEO_STATUSES = [
  "uploading",
  "uploaded",
  "processing",
  "ready",
  "failed",
] as const;
export type VideoStatus = (typeof VIDEO_STATUSES)[number];

export const JOB_STATUSES = [
  "queued",
  "active",
  "done",
  "failed",
  "cancelled",
] as const;
export type JobStatus = (typeof JOB_STATUSES)[number];

export interface SubtitleSegment {
  /** 0-based index */
  i: number;
  startMs: number;
  endMs: number;
  text: string;
  /**
   * Normalized (0..1) bounding box of the ORIGINAL on-screen text in the
   * source frame. Present only for OCR-extracted tracks — enables auto-cover
   * and replace-placement rendering.
   */
  box?: { x: number; y: number; w: number; h: number };
  /**
   * Vị trí RIÊNG của dòng này (0..1 theo khung xuất), ghi đè vị trí chung.
   * Điểm neo = GIỮA-DƯỚI của khối chữ (khớp alignment 2 của ASS).
   * Dùng khi cần đặt chữ đè lên đúng chỗ chữ nước ngoài trong hình.
   */
  pos?: { x: number; y: number };
  /** Cỡ chữ RIÊNG của dòng này (px theo PlayRes), ghi đè cỡ chung. */
  size?: number;
}

// ---- Upload constraints (MVP caps — Phase 2) ----
export const UPLOAD_MAX_BYTES = 2 * 1024 * 1024 * 1024; // 2GB
export const UPLOAD_MAX_DURATION_SEC = 60 * 60; // 60 min
export const UPLOAD_PART_SIZE = 20 * 1024 * 1024; // 20MB parts (R2: each part = Class A op, keep >=10MB)
export const UPLOAD_ALLOWED_TYPES: Record<string, string> = {
  "video/mp4": "mp4",
  "video/quicktime": "mov",
  "video/x-matroska": "mkv",
  "video/webm": "webm",
};

export const EXTRACT_METHODS = ["stt", "ocr"] as const;
export type ExtractMethod = (typeof EXTRACT_METHODS)[number];
