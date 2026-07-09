# Phase 03 — AI Translation & Subtitle Editor

## Context links

- [plan.md](./plan.md) · [phase-02-upload-extraction.md](./phase-02-upload-extraction.md)
- [researcher-01-report.md](./research/researcher-01-report.md) §4 (Gemini translation batching/caching — numbers plausible)

## Overview

- **Date:** 2026-07-09
- **Description:** Gemini-powered SRT translation to Vietnamese (glossary, batched, context-continuous); subtitle editor UI (bilingual table + synced video preview); SRT/VTT export. After this phase the product delivers standalone value (subtitle files) without video render.
- **Priority:** Critical
- **Implementation status:** Not started
- **Review status:** Not reviewed

## Key Insights

- Translation quality lever = context continuity: batch segments WITH previous translated lines as context; enforce segment-count-preserving structured output (Gemini `responseSchema`) — retries on mismatch beat clever prompts.
- Glossary (tên nhân vật, xưng hô, thuật ngữ) as user-editable per-video field (simple textarea "term=translation" lines). Series-level memory = Phase 7 backlog — DO NOT build now (YAGNI).
- Context caching: min cacheable ~1024–4096 tokens; our per-video glossary+system prompt is usually smaller → **skip caching for MVP**, note as optimization when batch volume arrives (Phase 7).
- Editor is retention feature (brainstorm #1 pipeline step 4): user fixes AI errors pre-render → fewer wasted render credits + fewer complaints.
- Timeline waveform editing = later; table + video seek covers 90% of value (80/20).

## Requirements

**Functional:**
- "Dịch sang tiếng Việt" button on video with original track → translate job → new `subtitleTracks` row kind=`translated`, lang=`vi`.
- Translation style option: `tự nhiên (mặc định)` | `trang trọng` | `sát nghĩa` (maps to prompt instruction).
- Editor: bilingual table (thời gian | gốc | tiếng Việt), inline edit VN column, video preview synced (click row → seek; playback highlights current row), search & replace, undo per-cell (simple: local history), autosave.
- Export SRT + VTT of any track. Import SRT (user has own subs) — small effort, high value.
**Non-functional:** Editor smooth at 2,000 segments (virtualized list); autosave debounce 1.5s, optimistic UI; translation of 10-min video (~150 segments) < 60s.

## Architecture

```
POST /api/videos/:id/translate {style, glossary} → job 'translate' → worker:
  chunks = segments in batches of 60
  for each chunk: prompt = system(style + glossary + video title)
                + last 5 translated segments (continuity)
                + chunk as JSON [{i, text}]
  Gemini 2.5 Flash, responseSchema: array<{i:int, text:string}> — validate ids match, retry ×2 on mismatch
  progress = chunksDone/chunks → job.progress
  persist subtitleTracks(kind=translated) + usageEvents(tokens_in/out)
```

### API routes

| Route | Purpose |
|---|---|
| `POST /api/videos/:id/translate` | {style?, glossary?} → enqueue translate job (store glossary on video row) |
| `GET /api/videos/:id/tracks` | list tracks with segments |
| `PATCH /api/tracks/:id` | {segments} full-array save (version++, optimistic concurrency: reject if client version stale) |
| `GET /api/tracks/:id/export?format=srt\|vtt` | serialize + download (Content-Disposition) |
| `POST /api/videos/:id/tracks/import` | multipart SRT file → parse → track kind=original or translated (user choice) |
| `GET /api/videos/:id/preview-url` | presigned R2 GET (1h) for `<video>` src |

### Serializers (`packages/shared/src/subtitle-io.ts`)

`segmentsToSrt`, `segmentsToVtt`, `parseSrt` — pure functions, unit-tested (ms↔timestamp edge cases, multiline text, BOM).

### Editor UI (`app/(app)/videos/[id]/editor/page.tsx`)

- Left: `<video>` (presigned URL) + track selector + style/glossary panel.
- Right: virtualized table (`@tanstack/react-virtual`); row = index, `mm:ss,ms` in/out, original text (readonly, dimmed), VN `textarea` auto-height.
- Sync: `timeupdate` → binary search active segment → highlight + scroll-into-view (toggleable "Tự cuộn"); row click → `video.currentTime = startMs/1000`.
- Toolbar: "Tìm & thay thế", "Xuất SRT", "Xuất VTT", "Lưu" (+ autosave indicator "Đã lưu ✓").

## Related code files

- **Create (web):** `app/api/videos/[id]/{translate/route.ts, tracks/route.ts, preview-url/route.ts, tracks/import/route.ts}`, `app/api/tracks/[id]/{route.ts, export/route.ts}`, `app/(app)/videos/[id]/editor/page.tsx`, `components/editor/{segment-table.tsx, segment-row.tsx, video-preview.tsx, search-replace.tsx, glossary-input.tsx, track-selector.tsx}`, `hooks/use-editor-state.ts`
- **Create (worker):** `src/processors/translate.ts`, `src/lib/translate.ts` (chunking + prompt + schema validation)
- **Create (shared):** `packages/shared/src/subtitle-io.ts` + tests
- **Modify:** `packages/db` — add `glossary text`, `translationStyle text` to videos (or params jsonb on job; prefer video columns for reuse)

## Implementation Steps

1. `subtitle-io.ts` serializers + unit tests (foundation for export/import/render phases).
2. Translate worker: chunker (60 segments, carry last-5 context), prompt builder (style + glossary injection), Gemini call with `responseSchema` + zod re-validation, id-mismatch retry, usage logging, progress updates.
3. Translate API route + credit-free execution for now (credits enforcement Phase 6; still record `costUsdMicros`).
4. Tracks CRUD routes with version-based optimistic concurrency.
5. Editor page: video preview + presigned URL fetch; virtualized bilingual table; active-row sync.
6. Editing: controlled textareas, dirty tracking, debounced PATCH autosave, conflict toast ("Phiên bản đã thay đổi, tải lại").
7. Search & replace (VN column only, all-or-selected).
8. Export routes + buttons; SRT import with parse-error feedback.
9. QA: 2,000-segment synthetic track perf check; translate a real 10-min video end-to-end, eyeball quality per style option.

## Todo list

- [ ] subtitle-io serializers + tests
- [ ] Translate processor (chunking, continuity context, structured output, retries)
- [ ] Glossary + style persisted on video; prompt injection
- [ ] Translate API route + polling UX ("Đang dịch… 45%")
- [ ] Tracks GET/PATCH with optimistic concurrency
- [ ] Editor: video preview + virtualized bilingual table + sync
- [ ] Autosave + dirty state + conflict handling
- [ ] Search & replace
- [ ] SRT/VTT export + SRT import
- [ ] Perf check 2k segments; real-video quality pass

## Success Criteria

- 10-min video → VN track in <60s, segment count/timestamps preserved 100%.
- Glossary term "Trần Phàm=Trần Phàm" style mappings respected in output (spot check).
- Editor: 60fps scroll at 2k rows; edit → autosave → reload persists.
- Exported SRT opens correctly in VLC (Vietnamese diacritics intact, UTF-8).
- Brainstorm metric: extraction+translation accuracy >90% usable lines on test videos.

## Risk Assessment

- **LLM drops/merges segments** → structured output + id validation + retry; final fallback: translate failing chunk line-by-line.
- **Gemini safety refusals on some content** → catch, mark segments untranslated with flag, surface in editor ("Cần dịch tay") instead of failing whole job.
- **Large tracks in single jsonb column** → fine to ~5k segments (<2MB); revisit only if 4h videos become real (YAGNI).
- **Autosave races** → version check on PATCH; last-write-wins rejected, client refetches.

## Security Considerations

- Ownership checks on track routes (join via video.userId).
- SRT import: parse with size cap (2MB), sanitize — treat text as plain text everywhere (React escapes; never dangerouslySetInnerHTML).
- Presigned preview URLs short-lived (1h), per-request.

## Next steps

Phase 4 render consumes translated track + this editor's "approved" state. Ship Phases 1–3 together as closed beta (SRT-only product).

## Unresolved questions

- Batch size 60 optimal? Tune against quality/latency during implementation.
- Should style/glossary live on user-level presets now? No (YAGNI) — Phase 7 presets.
- Offer Gemini Pro for paid "chất lượng cao" translation tier? Defer to Phase 6 pricing work.
