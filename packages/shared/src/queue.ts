export const QUEUES = {
  pipeline: "video-pipeline",
} as const;

export const JOB_TYPES = [
  "import",
  "probe",
  "stt",
  "ocr",
  "translate",
  "render",
  "dub",
] as const;

export type JobType = (typeof JOB_TYPES)[number];

export interface JobPayload {
  /** DB row id in `jobs` table */
  jobId: string;
  videoId: string;
  userId: string;
  params: Record<string, unknown>;
}
