# Phase 04 — Video Render: Cover Original Hardsub + Burn Vietnamese Subs

## Context links

- [plan.md](./plan.md) · [phase-03-translation-editor.md](./phase-03-translation-editor.md)
- [researcher-02-report.md](./research/researcher-02-report.md) §1 (FFmpeg blur/libass), §2 (BullMQ progress)

## Overview

- **Date:** 2026-07-09
- **Description:** FFmpeg render pipeline: blur/box-cover original hardsub region, burn styled Vietnamese subs (libass/ASS), aspect presets (16:9/9:16/1:1), SSE progress, download from R2. "Video ra video" milestone.
- **Priority:** High
- **Implementation status:** Not started
- **Review status:** Not reviewed

## Key Insights

- Blur/box cover is accepted MVP quality (competitor does same); AI inpainting = GPU cost, explicitly deferred (brainstorm #1 risk 3).
- Trick that beats plain blur visually: place VN sub **on top of** the covered region → covered area mostly hidden behind new sub box.
- libass needs fonts on worker: bundle Vietnamese-complete fonts in image (Be Vietnam Pro, Noto Sans, Montserrat — check OFL licenses) + `fontsdir=` param; never rely on system fonts.
- FFmpeg `-progress pipe:1` emits `out_time_ms` → progress % = out_time/duration → Redis pub/sub → web SSE.
- SSE on Vercel: streaming works but bounded by function `maxDuration` — set 300s and auto-reconnect client (`EventSource` reconnects natively); fallback = existing polling.
- Region selection: user draws rect on video frame in editor; store normalized coords (0–1) → resolution-independent.

## Requirements

**Functional:**
- Render dialog: cover region (draw/none), cover mode `blur`|`box` (box color), sub style preset (3 built-ins MVP: "Trắng viền đen", "Vàng phim bộ", "Hộp mờ"), custom overrides (font size, màu chữ, vị trí dọc), aspect preset `giữ nguyên`|`16:9`|`9:16`|`1:1`.
- Render job → output MP4 (H.264 + AAC) to R2 `outputs/` → download button; output listed on video page with expiry note ("Tự xóa sau 7 ngày").
- Live progress bar via SSE with polling fallback.
**Non-functional:** Render ≤2× video duration on 4-vCPU VPS (1080p, preset veryfast); one FFmpeg process per worker concurrency slot (BullMQ concurrency = min(2, cores/2)); deterministic re-render (same inputs → same command).

## Architecture

```
POST /api/videos/:id/render {trackId, cover?, style, aspect}
  → job 'render' → worker:
    1. download source from R2 → tmp
    2. build subs.ass from segments + style (packages/shared ass-builder)
    3. build filtergraph (below), spawn ffmpeg with -progress pipe:1
    4. parse progress → publish redis channel job:{id}:progress + update jobs.progress (throttled 1/s)
    5. upload out.mp4 → R2 outputs/{userId}/{videoId}/{jobId}.mp4 → job.result {r2Key, sizeBytes}
GET /api/jobs/:id/stream  → SSE: subscribe redis channel, forward events, heartbeat 15s
```

### FFmpeg command sketches

Cover (blur) + burn, 16:9 pass-through — region denormalized to pixels (X,Y,W,H, even numbers):

```
ffmpeg -y -i src.mp4 -filter_complex "\
[0:v]crop=W:H:X:Y,boxblur=luma_radius=12:luma_power=2[blr];\
[0:v][blr]overlay=X:Y[cov];\
[cov]ass=subs.ass:fontsdir=/app/fonts[v]" \
-map "[v]" -map 0:a? -c:v libx264 -preset veryfast -crf 20 -c:a copy \
-movflags +faststart -progress pipe:1 out.mp4
```

Box mode: replace crop/blur/overlay with `drawbox=x=X:y=Y:w=W:h=H:color=0x101010@1:t=fill`.

9:16 vertical (blur-pad background, source centered):

```
[cov]split[a][b];
[a]scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,boxblur=20:5[bg];
[b]scale=1080:-2[fg];
[bg][fg]overlay=(W-w)/2:(H-h)/2[framed];
[framed]ass=subs.ass:fontsdir=/app/fonts[v]
```

1:1 same pattern with 1080:1080. ASS PlayResX/PlayResY must match output resolution; sub position styles computed against output aspect.

### ASS builder (`packages/shared/src/ass-builder.ts`)

Pure function `buildAss(segments, style, playRes)`. Style → `[V4+ Styles]` line: Fontname, Fontsize, PrimaryColour (&HAABBGGRR), OutlineColour, BorderStyle (1=outline, 3=box), Outline, Shadow, Alignment (2=bottom-center), MarginV. Escape `{`, `}`, `\n`→`\N`.

### Style presets (`packages/shared/src/render-presets.ts`)

```ts
{ id:'white-outline', name:'Trắng viền đen', font:'Be Vietnam Pro', size:48, primary:'#FFFFFF', outline:'#000000', borderStyle:1 }
{ id:'yellow-drama',  name:'Vàng phim bộ',   font:'Be Vietnam Pro', size:50, primary:'#FFE94A', outline:'#1A1A1A', borderStyle:1 }
{ id:'boxed',         name:'Hộp mờ',          font:'Be Vietnam Pro', size:46, primary:'#FFFFFF', back:'#000000AA',  borderStyle:3 }
```

## Related code files

- **Create (web):** `app/api/videos/[id]/render/route.ts`, `app/api/jobs/[id]/stream/route.ts` (SSE), `components/render/{render-dialog.tsx, region-selector.tsx, style-picker.tsx, aspect-picker.tsx, render-progress.tsx}`, `app/(app)/videos/[id]/page.tsx` (outputs section + download)
- **Create (worker):** `src/processors/render.ts`, `src/lib/{ffmpeg-run.ts (spawn+progress parse), filtergraph.ts}`, `fonts/` (bundled OFL fonts), Dockerfile update (COPY fonts, verify `ffmpeg -filters | grep ass`)
- **Create (shared):** `src/{ass-builder.ts, render-presets.ts}` + tests
- **Modify:** `packages/db` — jobs.result already jsonb (r2Key); optional `renderPresets` user table = NO (YAGNI, Phase 7)

## Implementation Steps

1. ASS builder + unit tests (colors, escaping, alignment, PlayRes math).
2. `ffmpeg-run.ts`: spawn wrapper — args array (never shell string), stdout `-progress` parser, stderr ring buffer for error reporting, timeout kill (2.5× duration), exit-code mapping.
3. `filtergraph.ts`: compose cover + aspect + ass steps; unit-test generated graphs for each combination (cover×3 modes incl. none, aspect×4).
4. Render processor: download → build ass → run → upload → result; cleanup tmp in finally; usageEvents (metric: encode_sec, cost 0 API but tracks compute).
5. Verify Docker image: ffmpeg with libass, fonts render Vietnamese diacritics (golden-frame screenshot test with `ffmpeg -ss ... -frames:v 1`).
6. SSE route: Redis subscribe, `text/event-stream`, heartbeat, close on job terminal state; client `useJobStream` hook wrapping EventSource with polling fallback.
7. Region selector UI: paused video frame + drag rect overlay (canvas), normalized coords, "Xem trước vùng che" preview via CSS overlay.
8. Render dialog wiring + outputs list + presigned download ("Tải video").
9. E2E: hardsub sample → cover+burn+9:16 → visually verify; measure render time vs 2× duration budget.

## Todo list

- [ ] ass-builder + render-presets + tests
- [ ] ffmpeg spawn wrapper with progress parse + timeout
- [ ] filtergraph composer + tests
- [ ] Render processor end-to-end (R2 in → R2 out)
- [ ] Worker image: libass + Vietnamese fonts verified
- [ ] SSE endpoint + Redis pub/sub + client hook w/ fallback
- [ ] Region selector UI (normalized rect)
- [ ] Render dialog (cover/style/aspect) + progress + download UI
- [ ] E2E render matrix (3 covers × 4 aspects spot checks)
- [ ] Render-time budget measurement on target VPS size

## Success Criteria

- Output video: original sub unreadable, VN sub burned with correct diacritics/style/position, A/V in sync.
- 10-min 1080p render < 20 min on 4-vCPU VPS; progress bar updates ≤2s latency.
- All 3 aspect conversions produce correct framing; faststart flag set (streams in browser).
- Failed render surfaces meaningful VN message + stderr tail in job.error; tmp files cleaned.

## Risk Assessment

- **CPU saturation multi-job** → BullMQ concurrency cap + `-threads` limit; queue naturally backpressures. Scale = add VPS worker (stateless by design).
- **Region coords wrong after aspect change** → apply cover BEFORE aspect scaling (source coordinate space) — enforced by filtergraph order + tests.
- **Font missing glyphs** → golden-frame test with full Vietnamese pangram in CI/dev checklist.
- **SSE drops on proxies** → heartbeat comments + EventSource auto-reconnect + polling fallback already required.
- **Odd-dimension crop errors** → round region to even numbers, clamp to frame bounds.

## Security Considerations

- Never interpolate user input into shell — spawn with args array; style values whitelisted/clamped (font from bundled list only, sizes 20–120, colors regex).
- ASS text escaped (prevents ASS override-tag injection `{\...}` from subtitle text).
- Output keys namespaced by userId; download via presigned GET only; ownership check on job/stream routes.
- Job stream: authenticate SSE request (same session cookie), authorize job ownership.

## Next steps

Phase 5 dubbing builds on this worker infra (same download/upload/progress patterns); dub muxes against rendered output when present.

## Unresolved questions

- CRF/preset final choice (20/veryfast vs 21/faster) — decide from quality/time measurements on VPS.
- Offer "crop out sub region" mode (cut bottom strip) as 3rd cover option? Cheap to add later if users ask.
- Watermark on free-tier renders ("Made with …")? Product decision for Phase 6.
