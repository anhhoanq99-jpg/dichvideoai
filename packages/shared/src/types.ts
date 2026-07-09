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
