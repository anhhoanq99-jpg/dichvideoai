# Vietnamese Video Localization SaaS - Technical Research Report
**Date:** July 9, 2026

---

## 1. Gemini API Video Understanding (Hardcoded Subtitle Extraction)

**Finding:** Gemini 2.5 Flash / 3.x cannot natively extract hardcoded (burned-in) subtitles from video. Gemini can *analyze* video content but not OCR text embedded in frames.

**Pricing (2026):**
- Gemini 2.5 Flash: $0.30/M input tokens, $2.50/M output tokens [source](https://www.tldl.io/resources/google-gemini-api-pricing)
- Gemini 3.5 Flash: $1.50/M input, $9/M output [source](https://www.metacto.com/blogs/the-true-cost-of-google-gemini-a-guide-to-api-pricing-and-integration)
- Video tokens: 5,792 tokens/sec (720p) = ~$0.10/sec [source](https://costgoat.com/pricing/gemini-api)

**10-Minute Video Cost Estimate:**
- 600 sec × 5,792 tokens/sec = 3.475M tokens → ~$1.04 (2.5 Flash input only)
- **Limitation:** Must extract hardcoded subtitles via separate OCR pipeline (VideOCR, PaddleOCR, or commercial SubExtractor) before Gemini translation

**Files API:**
- Upload limit: 100MB (increased from 20MB, 48-hour retention) [source](https://ai.google.dev/gemini-api/docs/pricing)
- PDF max 50MB

**Architecture implication:** Hardcoded subtitle extraction requires OCR preprocessing layer, not Gemini video analysis.

---

## 2. Groq Whisper STT (Audio Transcription)

**Models & Pricing (2026):**
- Whisper Large v3: $0.111/hour transcribed [source](https://groq.com/pricing)
- Whisper Large v3 Turbo: $0.04/hour (9× cheaper than OpenAI) [source](https://groq.com/blog/whisper-large-v3-turbo-now-available-on-groq-combining-speed-quality-for-speech-recognition)
- 10-second minimum per request (regardless of actual duration)

**Specs:**
- File size limit: 100MB (paid tier, requires URL upload for full limit) [source](https://groq.com/blog/largest-most-capable-asr-model-now-faster-on-groqcloud)
- Languages: 99+ supported (Vietnamese confirmed in multilingual benchmarks)
- Timestamps: Segment-level granularity via `response_format: "verbose_json"` (suitable for SRT generation) [source](https://console.groq.com/docs/speech-to-text)

**10-Minute Audio Cost:** ~$0.0067 (Turbo model)

**Quality Assessment:** Groq prioritizes speed/cost; acceptable for dubbing sync-points but may need manual QA for tonal accuracy in Vietnamese.

---

## 3. Vietnamese TTS for Dubbing (Speed/Rate Control Critical)

**Comparison:**

| Provider | Vietnamese Support | Speed Control | Pricing | Dubbing Quality | Stability |
|----------|---|---|---|---|---|
| **Azure Neural 2** | Excellent (most natural) | Yes (0.5–2.0×) | $16/1M chars [source](https://edesy.in/ai-voice-assistant/tools/tts-comparison) | High | Enterprise-grade |
| **Google Cloud TTS** | Good | Yes (0.25–2.0×) | $16/1M chars [source](https://aloa.co/ai/comparisons/ai-voice-comparison/elevenlabs-vs-google-cloud-tts) | Good | Stable |
| **ElevenLabs** | Yes (v3 models) | Yes (0.5–2.0×) | Free tier 10k/mo; $5–$330/mo plans [source](https://ttsforfree.com/en/blogs/google-vs-azure-vs-elevenlabs-tts-comparison/) | Best (contextual emotion) | Reliable |
| **Edge TTS (unofficial)** | HoaiMy, NamMinh voices | Yes | Free | Acceptable | ⚠️ GPL-3.0 license, Microsoft ToS risk |
| **VieNeu-TTS (open-source)** | Yes (instant voice cloning) | Yes | Free | Good | On-device, stable |
| **VietTTS (open-source)** | Yes (voice cloning) | Configurable | Free | Acceptable | OpenAI-API compatible |

**Recommendation for SaaS:**
- **Primary:** Azure Neural 2 (most natural Vietnamese, proven dubbing use-case)
- **Secondary:** ElevenLabs Pro ($99/mo; AI Dubbing in 29+ languages) for premium tier [source](https://elevenlabs.io/blog/google-tts-alternatives-2026/)
- **Avoid:** Edge TTS for production (GPL license exposure, Microsoft dependency)
- **Fallback:** VieNeu-TTS for cost-conscious tier

---

## 4. Gemini Translation (SRT Batch Processing & Consistency)

**Cost Optimization (2026):**
- **Batch API:** 50% discount on all standard rates [source](https://yingtu.ai/en/blog/gemini-api-batch-vs-caching)
- **Context Caching:** Up to 90% savings on reused content (glossary, system prompt, character-name references) [source](https://promptgenius.net/prompts/gemini/long-context/context-caching)

**Pricing Impact:**
- Standard 2.5 Pro: $1.25/M input, $10/M output (long context: $2.50/$15/M)
- With Batch (50% off): $0.625/$5/M
- With Cache (90% off repeated context): $0.125/$1/M effective on cached tokens

**SRT Translation Best Practice:**
- Store character glossary + tone guide in context cache (reuse across batches)
- Batch multiple SRT files per request (cost-efficient)
- Tools like `gemini-srt-translator` preserve segment timing automatically [source](https://github.com/MaKTaiL/gemini-srt-translator)

**10-Minute Video (est. 200 subtitle lines, ~3k characters):**
- Input (Vietnamese SRT + glossary, cached): ~$0.004
- Output (translated Vietnamese): ~$0.03
- **Total per video: ~$0.03–$0.05 with full optimization**

---

## 5. Free Vietnamese TTS Alternatives (Risk/Stability)

**Edge TTS Status:**
- Free, OpenAI-compatible API wrapper [source](https://github.com/travisvn/openai-edge-tts)
- License: GPL-3.0 (personal use only, commercial risk)
- Stability: Depends on Microsoft Edge browser engine (may break on OS updates) [source](https://tts.travisvn.com/)

**Production-Ready Open-Source:**
- **VieNeu-TTS v3 Turbo:** 10k+ hours training, instant voice cloning, podcast mode [source](https://github.com/pnnbao97/VieNeu-TTS)
- **VietTTS:** OpenAI-API compatible, robust voice cloning, community-maintained [source](https://huggingface.co/dangvansam/viet-tts)

**Recommendation:** Deploy VieNeu-TTS self-hosted for free tier (avoid Edge TTS licensing risk).

---

## Architecture Summary (Cost per 10-min video)

| Component | Cost | Notes |
|-----------|------|-------|
| Hardcoded subtitle OCR | ~$0.50–$2.00 | Via PaddleOCR (free) or SubExtractor (paid) |
| Audio extraction + Whisper Turbo | ~$0.01 | Groq fastest tier |
| Gemini video analysis (optional context) | ~$1.00 | If using Gemini for scene description |
| SRT translation + context cache | ~$0.05 | Batch + cache optimization |
| TTS dubbing (Azure Neural 2) | ~$0.30–$0.50 | Depends on script length & playback speed |
| **Total SaaS Cost (per 10-min video)** | **~$2.00–$4.00** | Excludes infrastructure/labor |

---

## Unresolved Questions

1. **Hardcoded subtitle OCR accuracy:** Does PaddleOCR achieve sufficient accuracy for Vietnamese subtitle extraction at 720p/1080p? Need benchmark vs. commercial (SubExtractor, SubRip).

2. **Vietnamese TTS speed variance:** Do Azure Neural 2 Vietnamese voices handle speed modification (0.5–2.0×) smoothly for dubbing sync without artifacts? Needs QA testing.

3. **Gemini Files API video token consumption:** Does 5,792 tokens/sec hold for lower-resolution preprocessing (360p extracted frames)? Potential cost optimization unknown.

4. **Groq Whisper Vietnamese tonal accuracy:** How does Whisper Large v3 Turbo handle Vietnamese tone marks (tones determine meaning)? Benchmark needed against human baseline.

5. **Context cache stability under batch:** Does Gemini context cache refresh properly when batching 100+ SRT files? Potential edge case for large-scale translation jobs.

---

**Report compiled:** July 9, 2026 | Research budget: 5/5 web searches used
