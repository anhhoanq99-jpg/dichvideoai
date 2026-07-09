import type { Job } from "bullmq";
import type { JobPayload, JobType } from "@dichvideo/shared";
import { logger } from "../logger";
import { probeProcessor } from "./probe";
import { ocrProcessor, sttProcessor } from "./extract";

type Processor = (job: Job<JobPayload>) => Promise<unknown>;

/** Phases 3-5 replace the remaining no-ops (translate/render/dub). */
const noop =
  (type: JobType): Processor =>
  async (job) => {
    logger.info({ type, jobId: job.data.jobId }, "processing (noop)");
    await job.updateProgress(100);
    return { ok: true, type };
  };

export const processors: Record<JobType, Processor> = {
  probe: probeProcessor,
  stt: sttProcessor,
  ocr: ocrProcessor,
  translate: noop("translate"),
  render: noop("render"),
  dub: noop("dub"),
};
