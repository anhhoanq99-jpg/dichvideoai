"use client";

import { useCallback, useRef, useState } from "react";
import { UPLOAD_PART_SIZE, type TranslationStyleId } from "@dichvideo/shared";

export type UploadState =
  | { phase: "idle" }
  | { phase: "uploading"; pct: number }
  | { phase: "done"; videoId: string }
  | { phase: "error"; message: string };

interface InitResponse {
  videoId: string;
  key: string;
  uploadId: string;
}

const PARALLEL = 4;
const PART_RETRIES = 3;

async function putPartWithRetry(
  url: string,
  blob: Blob,
  signal: AbortSignal,
): Promise<string> {
  let lastErr: unknown;
  for (let attempt = 0; attempt < PART_RETRIES; attempt++) {
    try {
      const res = await fetch(url, { method: "PUT", body: blob, signal });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const etag = res.headers.get("ETag");
      if (!etag) throw new Error("Thiếu ETag trong phản hồi R2");
      return etag;
    } catch (err) {
      if (signal.aborted) throw err;
      lastErr = err;
      await new Promise((r) => setTimeout(r, 1000 * 2 ** attempt));
    }
  }
  throw lastErr;
}

export interface PipelineSettings {
  method: "ocr" | "stt";
  sourceLang?: string;
  /** false = chỉ trích xuất phụ đề, không dịch */
  translate?: boolean;
  targetLang?: string;
  style: TranslationStyleId;
  glossary?: string;
  /** trọn gói: dịch xong tự render + lồng tiếng ra video hoàn chỉnh */
  finish?: { render: boolean; dub: boolean; voice?: string };
}

export function useMultipartUpload() {
  const [state, setState] = useState<UploadState>({ phase: "idle" });
  const abortRef = useRef<AbortController | null>(null);
  const uploadInfoRef = useRef<InitResponse | null>(null);

  const cancel = useCallback(async () => {
    abortRef.current?.abort();
    const info = uploadInfoRef.current;
    if (info) {
      await fetch(`/api/videos/${info.videoId}/abort`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ uploadId: info.uploadId }),
      }).catch(() => {});
    }
    setState({ phase: "idle" });
  }, []);

  /** Resolves with videoId on success, null on error/cancel. */
  const upload = useCallback(async (file: File, pipeline?: PipelineSettings) => {
    const abort = new AbortController();
    abortRef.current = abort;
    setState({ phase: "uploading", pct: 0 });

    try {
      // 1. init
      const initRes = await fetch("/api/videos", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          name: file.name,
          sizeBytes: file.size,
          contentType: file.type,
        }),
        signal: abort.signal,
      });
      if (!initRes.ok) {
        const { error } = await initRes.json();
        throw new Error(error ?? "Không khởi tạo được upload");
      }
      const info: InitResponse = await initRes.json();
      uploadInfoRef.current = info;

      // 2. slice into parts
      const partCount = Math.ceil(file.size / UPLOAD_PART_SIZE);
      const parts: { partNumber: number; etag: string }[] = [];
      let uploadedBytes = 0;

      // fetch presigned URLs in batches, upload PARALLEL at a time
      let next = 1;
      const workers = Array.from(
        { length: Math.min(PARALLEL, partCount) },
        async () => {
          while (next <= partCount) {
            const partNumber = next++;
            const urlRes = await fetch(`/api/videos/${info.videoId}/upload-parts`, {
              method: "POST",
              headers: { "content-type": "application/json" },
              body: JSON.stringify({ uploadId: info.uploadId, partNumbers: [partNumber] }),
              signal: abort.signal,
            });
            if (!urlRes.ok) throw new Error("Không lấy được URL upload");
            const { urls } = await urlRes.json();
            const blob = file.slice(
              (partNumber - 1) * UPLOAD_PART_SIZE,
              Math.min(partNumber * UPLOAD_PART_SIZE, file.size),
            );
            const etag = await putPartWithRetry(urls[0].url, blob, abort.signal);
            parts.push({ partNumber, etag });
            uploadedBytes += blob.size;
            setState({
              phase: "uploading",
              pct: Math.round((uploadedBytes / file.size) * 100),
            });
          }
        },
      );
      await Promise.all(workers);

      // 3. complete
      const doneRes = await fetch(`/api/videos/${info.videoId}/complete`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          uploadId: info.uploadId,
          parts,
          ...(pipeline ? { pipeline } : {}),
        }),
        signal: abort.signal,
      });
      if (!doneRes.ok) {
        const { error } = await doneRes.json();
        throw new Error(error ?? "Không hoàn tất được upload");
      }

      setState({ phase: "done", videoId: info.videoId });
      uploadInfoRef.current = null;
      return info.videoId;
    } catch (err) {
      if (abort.signal.aborted) return null; // user cancelled — state handled in cancel()
      setState({
        phase: "error",
        message: err instanceof Error ? err.message : "Lỗi không xác định",
      });
      return null;
    }
  }, []);

  return { state, upload, cancel };
}
