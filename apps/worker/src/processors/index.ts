import type { Job } from "bullmq";
import type { JobPayload, JobType } from "@dichvideo/shared";
import { probeProcessor } from "./probe";
import { ocrProcessor, sttProcessor } from "./extract";
import { translateProcessor } from "./translate";
import { renderProcessor } from "./render";
import { dubProcessor } from "./dub";

type Processor = (job: Job<JobPayload>) => Promise<unknown>;

export const processors: Record<JobType, Processor> = {
  probe: probeProcessor,
  stt: sttProcessor,
  ocr: ocrProcessor,
  translate: translateProcessor,
  render: renderProcessor,
  dub: dubProcessor,
};
