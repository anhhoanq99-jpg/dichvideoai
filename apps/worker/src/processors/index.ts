import type { Job } from "bullmq";
import type { JobPayload, JobType } from "@dichvideo/shared";
import { logger } from "../logger";

type Processor = (job: Job<JobPayload>) => Promise<unknown>;

/**
 * Phase 1: every processor is a logged no-op so the full
 * web → Redis → worker → Postgres loop can be smoke-tested.
 * Real implementations land in Phases 2-5.
 */
const noop =
  (type: JobType): Processor =>
  async (job) => {
    logger.info({ type, jobId: job.data.jobId, videoId: job.data.videoId }, "processing (noop)");
    await job.updateProgress(100);
    return { ok: true, type };
  };

export const processors: Record<JobType, Processor> = {
  probe: noop("probe"),
  stt: noop("stt"),
  ocr: noop("ocr"),
  translate: noop("translate"),
  render: noop("render"),
  dub: noop("dub"),
};
