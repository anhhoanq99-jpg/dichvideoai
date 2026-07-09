import type { ExtractResult, SubtitleExtractor } from "./types";

/**
 * Fallback slot — implemented ONLY if the Gemini OCR spike fails its gate
 * (see plans/260709-video-localization-platform/phase-02-upload-extraction.md).
 */
export class PaddleOcrExtractor implements SubtitleExtractor {
  readonly id = "paddle-ocr" as const;

  extract(): Promise<ExtractResult> {
    throw new Error(
      "PaddleOcrExtractor chưa được triển khai — chỉ build nếu spike Gemini OCR thất bại",
    );
  }
}
