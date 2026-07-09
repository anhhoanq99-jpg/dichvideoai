# Phase 02 — Upload & Subtitle Extraction (R2, STT, OCR spike)

## Context links

- [plan.md](./plan.md) · [phase-01-foundation.md](./phase-01-foundation.md)
- [researcher-01-report.md](./research/researcher-01-report.md) — **§1 Gemini claims UNVERIFIED, see Key Insights** · [researcher-02-report.md](./research/researcher-02-report.md) §3 (R2)

## Overview

- **Date:** 2026-07-09
- **Description:** Browser → R2 presigned multipart upload; ffprobe metadata job; STT extraction (Groq Whisper → segments); Gemini video OCR **spike** + swappable extraction service interface; extraction UI.
- **Priority:** Critical
- **Implementation status:** Code complete 2026-07-09 (commit 6a2e536). Typecheck + build + lint pass. FFmpeg installed on dev machine (winget, FFMPEG_DIR in .env). BLOCKED on user-provided keys: R2 (account+bucket+token), GROQ_API_KEY, GEMINI_API_KEY. Spike NOT yet run (needs GEMINI_API_KEY + sample hardsub videos) — OCR path unverified until gate passes.
- **Review status:** Not reviewed

## Key Insights

- **Corrections to researcher-01 (treat its §1 as wrong until spike proves otherwise):**
  - Competitor gensubai.com demonstrably uses Gemini 2.5 Flash / 3 Pro as hardsub OCR engine (per-minute pricing) → "Gemini cannot read hardcoded subtitles" is likely false.
  - Official docs: video ≈ **263 tokens/sec default, ~66 tokens/sec at low `mediaResolution`** — NOT 5,792 tok/s. 10-min video ≈ 158k tokens default / ~40k low → **~$0.01–0.05 input on 2.5 Flash**, not $1+.
  - Files API limit ≈ **2GB/file** (not 100MB), 48h retention — fits our ≤2GB upload cap.
- Therefore: build extraction behind `SubtitleExtractor` interface; **spike task is a gate**, PaddleOCR is the fallback implementation slot (not built unless spike fails).
- Groq Whisper: `whisper-large-v3-turbo`, $0.04/h, 100MB file limit, `verbose_json` gives segment timestamps (researcher-01 §2 — these numbers plausible, still print actual usage). 16kHz mono FLAC keeps 60-min audio well under 100MB.
- R2: multipart parts ≥10MB (each part = Class A op); presigned URLs from server; browser uploads direct = zero egress + no server bandwidth (researcher-02 §3).

## Requirements

**Functional:**
- Upload MP4/MOV/MKV/WebM ≤2GB, ≤60 min (MVP caps); drag-drop UI with per-part progress, retry failed parts, cancel.
- After upload: auto probe (duration/resolution); user picks extraction method: "Nhận dạng giọng nói (STT)" or "Đọc phụ đề gắn cứng (OCR)" + source language hint.
- Result: `subtitleTracks` row kind=`original` with timed segments; visible in UI as list.
**Non-functional:** Upload 1GB reliably on flaky connection (part retry); job progress visible (poll `GET /api/jobs/:id` every 2s — SSE comes Phase 4); all provider calls logged to `usageEvents` with cost.

## Architecture

```
Browser ──(1) POST /api/videos──────────────▶ web: create video row + createMultipartUpload
Browser ──(2) PUT parts (presigned) ────────▶ R2 (direct, parallel ≤4, 10–50MB parts)
Browser ──(3) POST /api/videos/:id/complete ▶ web: completeMultipartUpload → enqueue 'probe'
Worker  ──(4) probe: ffprobe R2 object ─────▶ update videos (duration/width/height) → status 'uploaded'
Browser ──(5) POST /api/videos/:id/extract ─▶ web: create job row → enqueue 'stt'|'ocr'
Worker  ──(6) extractor.extract() ──────────▶ Groq | Gemini → segments → subtitleTracks + usageEvents
```

### API routes (apps/web)

| Route | Purpose |
|---|---|
| `POST /api/videos` | validate {name, sizeBytes, type}; enforce caps + per-user quota; create row (status=uploading); return {videoId, key, uploadId} |
| `POST /api/videos/:id/upload-parts` | body {partNumbers[]} → presigned part URLs (expiry 1h) |
| `POST /api/videos/:id/complete` | body {parts:[{partNumber,etag}]} → complete multipart → enqueue probe |
| `POST /api/videos/:id/abort` | abortMultipartUpload + mark failed |
| `GET /api/videos` / `GET /api/videos/:id` | list/detail (own videos only) |
| `POST /api/videos/:id/extract` | {method:'stt'\|'ocr', sourceLang?} → job row + enqueue |
| `GET /api/jobs/:id` | {status, progress, error} for polling |

### Extraction service interface (apps/worker/src/extractors/)

```ts
export type Segment = { i: number; startMs: number; endMs: number; text: string };
export interface SubtitleExtractor {
  readonly id: 'groq-whisper' | 'gemini-video-ocr' | 'paddle-ocr';
  extract(input: { localPath: string; durationSec: number; sourceLang?: string },
          onProgress: (pct: number) => void): Promise<{ segments: Segment[]; usage: UsageEvent[] }>;
}
```

- **GroqWhisperExtractor:** `ffmpeg -i in.mp4 -vn -ac 1 -ar 16000 -c:a flac audio.flac` → Groq `verbose_json` → map segments (merge <300ms gaps, split >7s lines).
- **GeminiVideoOcrExtractor:** upload file via Files API (≤2GB) → `generateContent` with `mediaResolution: LOW` first, prompt: extract on-screen burned subtitles with start/end timestamps, JSON array output via responseSchema; chunk video >30 min into parts with `videoMetadata` start/end offsets; normalize timestamps.
- **PaddleOcrExtractor:** stub only (throws NotImplemented) — build ONLY if spike fails gate.

### Spike task (MANDATORY, before committing to Gemini OCR — timebox 1 day)

Script `apps/worker/scripts/spike-gemini-ocr.ts`:
1. Inputs: 2–3 real sample videos (1 Chinese hardsub, 1 English hardsub, ~5–10 min each).
2. Run Gemini 2.5 Flash at LOW and default mediaResolution; capture: subtitle text accuracy (manual eyeball vs ground truth), timestamp drift, `usageMetadata` actual token counts, wall time, failures.
3. Compare quickly vs PaddleOCR CLI on same videos (frame-sample 1fps) — rough accuracy only.
4. **Gate:** Gemini viable if ≥90% line accuracy, timestamps within ±1s, cost ≤ $0.10/10min. Record results in `plans/260709-video-localization-platform/reports/spike-gemini-ocr.md`. If fail → implement PaddleOcrExtractor (self-host, frame sampling + dedupe) as primary; interface makes swap trivial.

## Related code files

- **Create (web):** `app/api/videos/route.ts`, `app/api/videos/[id]/{route.ts, upload-parts/route.ts, complete/route.ts, abort/route.ts, extract/route.ts}`, `app/api/jobs/[id]/route.ts`, `lib/r2.ts` (S3Client for R2), `app/(app)/videos/{page.tsx, [id]/page.tsx, upload/page.tsx}`, `components/upload/{dropzone.tsx, upload-progress.tsx}`, `components/videos/{video-card.tsx, extract-method-dialog.tsx}`, `hooks/use-multipart-upload.ts`, `hooks/use-job-poll.ts`
- **Create (worker):** `src/processors/{probe.ts, stt.ts, ocr.ts}`, `src/extractors/{types.ts, groq-whisper.ts, gemini-video-ocr.ts, paddle-ocr.ts(stub)}`, `src/lib/{r2.ts, ffmpeg.ts, gemini.ts, groq.ts, usage.ts}`, `scripts/spike-gemini-ocr.ts`
- **Modify:** `packages/shared/src/{types.ts, queue.ts}` (Segment type, job param types)

## Implementation Steps

1. `lib/r2.ts` both sides: `@aws-sdk/client-s3` configured for R2 endpoint; helpers createMultipart/presignPart/complete/abort/presignGet.
2. Upload API routes with zod body validation; key scheme `uploads/{userId}/{videoId}/source.{ext}`.
3. `use-multipart-upload` hook: slice file (20MB parts), 4 parallel PUTs, per-part retry ×3 exponential, aggregate progress, abort support. Upload page UI (dropzone, progress bar, "Hủy").
4. Worker probe processor: stream R2 → temp file (`/tmp/jobs/{jobId}/`) → `ffprobe -print_format json -show_format -show_streams` → update video row; reject audio-less files for STT path later. Always cleanup temp dir in `finally`.
5. **Run spike** (step order deliberate: before building full OCR processor). Write gate report.
6. GroqWhisperExtractor + stt processor: download → extract audio → Groq SDK → segments → insert `subtitleTracks` (kind=original) + usageEvents (audio_sec × rate) → job done.
7. GeminiVideoOcrExtractor per spike-winning config (or PaddleOCR if gate failed) + ocr processor, same persistence path.
8. Videos UI: list page, detail page showing status timeline + extracted segments preview; extract-method dialog (VN copy: "Chọn cách trích xuất phụ đề").
9. Retention: R2 lifecycle rule note (configure 7-day expiry on `outputs/` prefix later; `uploads/` 14 days) — document in README, apply in Phase 6 deploy.

## Todo list

- [ ] R2 client helpers (web + worker)
- [ ] Upload API routes (init/parts/complete/abort) + quota caps
- [ ] Multipart upload hook + upload UI
- [ ] Probe processor (ffprobe) + temp-file lifecycle
- [ ] **Spike: Gemini video OCR benchmark + gate report**
- [ ] Extractor interface + GroqWhisperExtractor + stt processor
- [ ] Gemini OCR extractor (or PaddleOCR per gate) + ocr processor
- [ ] usageEvents cost logging on every provider call
- [ ] Videos list/detail UI + extraction dialog + job polling
- [ ] Failure paths: abort upload, job fail surfaces VN error message

## Success Criteria

- 1GB file uploads reliably; interrupted part retries succeed; abort cleans up multipart.
- 10-min speech video → STT segments in <3 min, timestamps usable.
- Spike report exists with real token counts + accuracy numbers; OCR engine decision recorded.
- Hardsub video → OCR segments ≥90% line accuracy (per chosen engine).
- Every job row has `costUsdMicros` > 0 populated from usageEvents.

## Risk Assessment

- **Gemini OCR fails gate** → PaddleOCR fallback path pre-designed (interface); accept +2–3 days.
- **Groq 100MB limit** on very long audio → 16kHz mono FLAC keeps 60min ≈ 30–60MB; if over, split audio at silence and offset timestamps.
- **Worker disk fill** from temp files → per-job temp dir + finally-cleanup + startup sweep of orphans.
- **Presigned URL abuse** → short expiry (1h), key bound to authenticated videoId, size validated at init + verified by probe.

## Security Considerations

- All video routes check session + ownership (userId on row) — no IDOR.
- Content-Type/extension whitelist; sizeBytes cap enforced server-side (client value untrusted — probe re-verifies).
- R2 bucket private; access only via presigned URLs; no public listing.
- Log uploadIp on video creation (audit trail).

## Next steps

Phase 3 translation & editor — consumes `subtitleTracks` kind=original produced here.

## Unresolved questions

- Gemini OCR accuracy/cost — answered by spike (gate).
- Whisper Vietnamese/Chinese source accuracy on noisy audio — collect during dogfooding; may need language-hint UI default.
- Exact per-user upload quota for free tier (placeholder: 3 videos, 15 min total) — finalize Phase 6.
