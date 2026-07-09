# Plan — Vietnamese AI Video Localization SaaS ("Việt hóa & lồng tiếng video AI")

> Date: 2026-07-09 · Status: Planning complete, implementation not started · Progress: 0%

## Goal

Commercial SaaS for VN market: user uploads video → extract subtitles (STT audio / OCR hardsub) → AI-translate to Vietnamese → edit in subtitle editor → render (cover original hardsub + burn styled VN subs) → optional VN AI dubbing → download. Credits + SePay monetization. Vietnamese UI, dark/light, Linear/Vercel-quality.

## Locked decisions (do not re-litigate)

- **Upload-only.** No video-URL/yt-dlp ingestion — permanently out of scope.
- **No "reup" positioning.** No logo/watermark removal, no Content-ID evasion. Neutral localization tool; ToS puts content responsibility on user.
- Stack: Next.js 16 App Router + TS + Tailwind 4 + Framer Motion · Node worker + BullMQ + Redis · Postgres + Drizzle · better-auth (Google) · Cloudflare R2 (presigned multipart) · FFmpeg on Linux VPS · Groq Whisper (STT) · Gemini (OCR spike + translate) · TTS behind provider interface (Azure Neural vi-VN default; NO free dubbing tier — free tier = subtitle-only).
- Repo: pnpm monorepo `apps/web` + `apps/worker` + `packages/db` + `packages/shared` (restructure in Phase 1). No Turborepo (2 apps, plain pnpm filters suffice — KISS).
- Batch studio / series memory / OAuth publishing / admin = backlog (Phase 7 outline only).

## Phases

| # | Phase | File | Status | Progress |
|---|-------|------|--------|----------|
| 1 | Foundation (monorepo, DB, auth, queue, UI shell) | [phase-01-foundation.md](./phase-01-foundation.md) | Done — smoke test passed on Neon+Upstash (option B, no Docker); pending: user verifies Google login in browser | 95% |
| 2 | Upload & extraction (R2, STT, OCR spike) | [phase-02-upload-extraction.md](./phase-02-upload-extraction.md) | Not started | 0% |
| 3 | Translation & subtitle editor | [phase-03-translation-editor.md](./phase-03-translation-editor.md) | Not started | 0% |
| 4 | Render (cover + burn subs, FFmpeg) | [phase-04-render.md](./phase-04-render.md) | Not started | 0% |
| 5 | Dubbing (TTS, timing fit, mix, mux) | [phase-05-dubbing.md](./phase-05-dubbing.md) | Not started | 0% |
| 6 | Monetization & launch (credits, SePay, ToS, deploy) | [phase-06-monetization-launch.md](./phase-06-monetization-launch.md) | Not started | 0% |
| 7 | Backlog outline (batch, series memory, publish, admin) | [phase-07-backlog.md](./phase-07-backlog.md) | Backlog | — |

Each phase independently shippable. 1→2→3 gives usable product (SRT out). 4 = "video ra video". 5 = full core. 6 = revenue.

## Key risks

1. **Gemini hardsub OCR unverified** — researcher-01 claims contradicted by competitor evidence + official docs. Phase 2 includes mandatory spike (benchmark Gemini vs PaddleOCR on real videos, verify token cost). Extraction behind swappable interface.
2. **Variable API cost per minute is real** — credits ledger + `usage_events` cost tracking from Phase 1 day 1; deduct-before-run, refund-on-fail.
3. **Dubbing quality (timing/voice)** decides retention — atempo fit + review-before-render flow; benchmark Azure vi-VN voices early in Phase 5.
4. **Legal**: ToS + upload audit trail mandatory before charging money (Phase 6).
5. **FFmpeg needs real Linux box** — worker on VPS; web on Vercel; managed Redis/Postgres so nothing on VPS is publicly exposed except SSH.

## Cost model summary (per 10-min video, corrected numbers — verify in spikes)

| Component | Est. cost |
|---|---|
| STT (Groq Whisper turbo, $0.04/h) | ~$0.007 |
| OCR (Gemini 2.5 Flash, ~263 tok/s default / ~66 low-res → 40k–160k input tokens) | ~$0.01–0.05 (spike verifies) |
| Translate (Gemini Flash, batched) | ~$0.03–0.05 |
| TTS dub (Azure $16/1M chars, ~7k chars) | ~$0.11 |
| R2 + worker compute | ~$0.01–0.05 |
| **Total** | **~$0.2–0.3** → price ≥ 3–5× in credits |

## Unresolved questions

See per-phase files. Global: final credit pricing (Phase 6 calibration), Gemini OCR viability (Phase 2 spike gate).
