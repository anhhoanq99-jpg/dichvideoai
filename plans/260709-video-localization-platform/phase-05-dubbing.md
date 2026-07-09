# Phase 05 — Vietnamese AI Dubbing (TTS, Timing Fit, Mix, Mux)

## Context links

- [plan.md](./plan.md) · [phase-04-render.md](./phase-04-render.md)
- [researcher-01-report.md](./research/researcher-01-report.md) §3/§5 (TTS comparison) · [researcher-02-report.md](./research/researcher-02-report.md) §1 (atempo/ducking)

## Overview

- **Date:** 2026-07-09
- **Description:** Provider-agnostic TTS interface; Azure Neural vi-VN default provider; per-segment synthesis with duration fitting (SSML rate + atempo); assemble dub track; replace or duck-mix original audio; mux with rendered video. Completes user's core flow.
- **Priority:** High
- **Implementation status:** Not started
- **Review status:** Not reviewed

## Key Insights

- **TTS decision (per corrected research):** Azure Neural vi-VN primary (`vi-VN-HoaiMyNeural` female, `vi-VN-NamMinhNeural` male; $16/1M chars; SSML `prosody rate` support; enterprise stability). Edge TTS rejected — unofficial API, ToS/licensing risk for commercial SaaS. VieNeu-TTS self-host rejected for launch — GPU ops burden. **Honest free tier = subtitle-only, NO free dubbing.** Dubbing is paid/credits feature from day 1.
- Interface makes provider swap trivial (ElevenLabs premium tier later, VieNeu if volume justifies GPU).
- Timing fit strategy (quality order): (1) estimate chars/sec → set SSML rate hint pre-synthesis; (2) if result still > slot: `atempo` speedup capped 1.3× (beyond = chipmunk); (3) allow overflow into following silence gap up to 500ms; (4) still over → flag segment in result for user review. Brainstorm metric: <300ms drift/sentence.
- Two mix modes: `replace` (thay toàn bộ audio — typical use) and `duck` (giữ nền, giảm khi thoại). Duck MVP = constant original volume 0.15 + dub overlay; sidechaincompress = nice-to-have later.
- Synthesis cache by `hash(text+voice+rate)` — skip for MVP (YAGNI), but re-dub after small edits will hurt; note as first optimization.

## Requirements

**Functional:**
- Dub dialog: voice picker (2 voices MVP, preview sample audio), mode `replace`|`duck`, target = translated track (post-edit).
- Job output: dubbed MP4 in outputs list (muxed with rendered video if exists, else source video).
- Segments that failed fit flagged; UI lists them ("5 câu bị lệch thời gian — sửa ngắn lại rồi lồng tiếng lại").
**Non-functional:** Per-sentence timing drift <300ms for ≥95% segments; 10-min dub job <10 min wall time (synthesis concurrency 4); every synth call → usageEvents (chars, cost).

## Architecture

```
POST /api/videos/:id/dub {trackId, voiceId, mode, baseOutputJobId?}
 → job 'dub' → worker:
   1. load segments; base video = rendered output (if chosen) else source
   2. for each segment (p-limit 4):
        rateHint = clamp(chars / (slotSec * CHARS_PER_SEC_VI≈14), 0.9, 1.25)
        audio = tts.synthesize(text, voice, {rate: rateHint})   // 24kHz mono wav/mp3
        if dur > slot: ffmpeg atempo=min(dur/slot, 1.3) → re-measure
        if still > slot+500ms gap: flag segment
   3. assemble: silent base track length=videoDur; overlay each segment at startMs
      ffmpeg: [seg_i]adelay=startMs|startMs[di]; amix all — batches of 30 inputs to avoid arg limits,
      then concat/amix batch outputs → dub.wav, loudnorm I=-16
   4. mix:
      replace: -map video -map dub
      duck:    [0:a]volume=0.15[bg];[bg][dub]amix=inputs=2:duration=first[a]
   5. mux: -c:v copy (video untouched) -c:a aac -b:a 192k → upload R2 outputs/
   progress: synthesized/total 0–70%, assemble 70–90%, mux 90–100% (reuse Phase 4 SSE)
```

### TTS interface (`apps/worker/src/tts/`)

```ts
export interface TtsProvider {
  readonly id: 'azure' /* | 'elevenlabs' | 'vieneu' later */;
  listVoices(): VoiceInfo[];   // static for MVP
  synthesize(req: { text: string; voiceId: string; rate?: number }):
    Promise<{ audio: Buffer; format: 'wav'; durationMs: number; charsBilled: number }>;
}
```

AzureTtsProvider: `microsoft-cognitiveservices-speech-sdk` or plain REST (`/cognitiveservices/v1`, SSML body, `X-Microsoft-OutputFormat: riff-24khz-16bit-mono-pcm`). REST preferred — fewer deps (KISS). Retry 429 with backoff; region + key from env.

### Mux command sketch (replace mode)

```
ffmpeg -y -i rendered.mp4 -i dub.wav -map 0:v -map 1:a -c:v copy -c:a aac -b:a 192k \
 -movflags +faststart -shortest out_dubbed.mp4
```

## Related code files

- **Create (web):** `app/api/videos/[id]/dub/route.ts`, `components/dub/{dub-dialog.tsx, voice-picker.tsx, flagged-segments.tsx}`, video page outputs section update
- **Create (worker):** `src/processors/dub.ts`, `src/tts/{types.ts, azure.ts}`, `src/lib/{audio-assemble.ts, audio-fit.ts}`
- **Create (shared):** voice catalog constants (id, name VN label "Hoài My — Nữ miền Bắc", gender, sampleUrl)
- **Modify:** `packages/shared/src/queue.ts` (dub params type), `.env.example` (+AZURE_TTS_KEY, AZURE_TTS_REGION)

## Implementation Steps

1. **Benchmark first (timebox 0.5 day):** synth 10 real translated sentences with both Azure vi-VN voices at rates 0.9/1.0/1.25; verify no artifacts, measure chars/sec Vietnamese speech (calibrate CHARS_PER_SEC_VI). Record in `reports/spike-azure-tts.md`.
2. AzureTtsProvider (REST + SSML builder, escape XML in text) + retry/backoff + usage logging.
3. `audio-fit.ts`: measure wav duration (parse header — no ffprobe roundtrip), atempo step via ffmpeg, flag logic.
4. `audio-assemble.ts`: batched adelay/amix graph builder, loudnorm pass, unit-test graph strings; verify no clipping on overlapping segments (amix normalize).
5. Dub processor: orchestrate synth (p-limit 4) → fit → assemble → mix mode → mux → upload; progress mapping; flagged segments into job.result.
6. Dub API route + dialog UI (voice preview via static samples on R2, mode radio, base output select) + flagged-segments panel post-job.
7. E2E: 10-min translated video → dub replace mode → check sync at start/middle/end; duck mode listen test.
8. Measure cost: chars total × rate vs usageEvents — confirm ~$0.10–0.15/10min.

## Todo list

- [ ] Azure vi-VN voice benchmark + CHARS_PER_SEC_VI calibration (report)
- [ ] TtsProvider interface + AzureTtsProvider (REST, SSML, retries)
- [ ] audio-fit (duration measure, atempo cap, flag rules)
- [ ] audio-assemble (batched adelay/amix + loudnorm) + tests
- [ ] Dub processor + progress + flagged results
- [ ] Dub API route + credits placeholder hook
- [ ] Dub dialog UI + voice previews + mode select
- [ ] Flagged segments review UI
- [ ] E2E sync validation (<300ms/95%) + cost confirmation

## Success Criteria

- Dubbed output: speech starts within 300ms of segment start for ≥95% segments on test video.
- No audio artifacts at rate ≤1.25 + atempo ≤1.3 (human listen check).
- Replace + duck modes both produce loudness-consistent output (loudnorm I=-16).
- Flagged segments correctly identify overruns; re-dub after edit works.
- usageEvents chars/cost matches Azure portal billing within 5%.

## Risk Assessment

- **Azure vi-VN rate control artifacts** (researcher-01 open question) → benchmark step 1 is the gate; if artifacts, rely on atempo-only (audio-domain) and narrow rate to 0.95–1.1.
- **Long TTS jobs hit provider rate limits** → p-limit 4 + backoff; segment count 150/10min is modest.
- **amix argument explosion (500+ segments)** → batching (30 inputs/pass) designed in from start.
- **Cost surprise on re-dubs** → note synthesis cache as first fast-follow; UI warns credits before re-dub.
- **Original audio contains music users want (duck mode expectations)** → set expectation in UI copy: "Chế độ giữ nền giảm âm lượng gốc toàn bộ".

## Security Considerations

- SSML injection: XML-escape all user text; voice/rate whitelisted+clamped server-side.
- Azure key server-side only (worker env), never exposed to client.
- Ownership checks on dub route + base output reference (must belong to same video/user).

## Next steps

Phase 6: put credits enforcement in front of all paid jobs (dub especially), SePay top-up, launch.

## Unresolved questions

- Final default voice + whether to add 2 more voices at launch (marketing wants variety; cost = none, catalog only).
- Duck default level 0.15 vs sidechaincompress — pick after listen tests.
- Per-segment voice assignment (multi-speaker) — backlog; is single-voice MVP acceptable to target users? Validate in beta.
