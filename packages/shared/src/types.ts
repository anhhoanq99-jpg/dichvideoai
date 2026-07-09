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
