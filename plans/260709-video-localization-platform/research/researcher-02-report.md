# Video Localization SaaS Stack Research — 260709

**Research Date:** July 9, 2026 | **Sources:** 5 web searches | **Scope:** FFmpeg workflows, BullMQ pipelines, R2 uploads, auth, payments

---

## 1. FFmpeg Subtitle & Audio Workflows

**Subtitle Burning (libass/ASS):**
- FFmpeg requires `--enable-libass` compile flag; `ass` filter limited to ASS subtitle format
- Merge subtitles into video stream via `subtitles` filter (hardsubbing)
- libass: portable ASS subtitle renderer, supports fontconfig for custom fonts

**Region Blurring (Original Hardcoded Subtitles):**
- `boxblur` filter + crop/overlay combos blur specific video regions
- `delogo` filter alternative for masking areas
- Crop region dimensions → apply boxblur → overlay back onto source

**Audio Dubbing (TTS + Ducking):**
- Mix TTS segments at exact timestamps using audio filter chains
- Volume automation or sidechaincompress for ducking (reduce original ≈-12dB during TTS)
- Time-stretching: `atempo` filter (0.5–2.0x limits); `rubberband` for higher fidelity
- Part sizes critical: 10MB+ per multipart chunk minimizes operation count

**Refs:** https://forum.videohelp.com/threads/394576-blurring-subtitles | https://ottverse.com/blur-a-video-using-ffmpeg-boxblur/

---

## 2. BullMQ Multi-Step Job Pipeline

**Flow Architecture (Parent-Child):**
- Each step = independent job with own retries/logs/status
- Parent waits for all children before proceeding (unlimited nesting depth)
- Children run in parallel; execution guarantees order per flow

**Retry & Error Handling:**
- Per-job retry config (attempts + backoff: fixed/exponential)
- `ignore_dependency_on_failure` option: skip failed children, continue parent
- Child results accessible: `get_children_values()`, `get_ignored_children_failures()`

**Progress Reporting:**
- Job events (completed/failed/progress) for SSE/polling to frontend
- Each child job maintains independent status → fine-grained progress tracking
- Video pipeline example: extract → translate → render → dub as 4 sequential parents

**Refs:** https://docs.bullmq.io/guide/flows | https://oneuptime.com/blog/post/2026-01-21-bullmq-flow-producer-pipelines/view

---

## 3. Cloudflare R2 Upload & Pricing

**Presigned URLs + Multipart Upload:**
- S3-compatible presigned URLs grant temporary access (signature + expiry)
- Multipart: break file into 10MB+ chunks → parallel upload/retry/resume
- AWS SDK `@aws-sdk/client-s3` + `@aws-sdk/lib-storage` work as-is with R2
- POST via HTML forms NOT supported; must use SDK

**Direct Browser→R2 (Zero Egress):**
- Presigned URLs enable client-side upload, avoiding server bandwidth
- All R2 egress (Workers API, S3 API, r2.dev) = **FREE** (zero egress charges)

**Pricing (2026):**
- Storage: $0.015/GB/month
- Free tier: 10GB storage, 1M Class A ops, 10M Class B ops/month
- **Each multipart part = Class A operation** → size ≥10MB to optimize cost

**Refs:** https://developers.cloudflare.com/r2/api/s3/presigned-urls/ | https://leanopstech.com/blog/cloudflare-r2-pricing-2026/

---

## 4. Better Auth + Google OAuth + Postgres/Drizzle

**Setup (Next.js App Router):**
- Database Adapter: Drizzle ↔ PostgreSQL, auto-handles user/session/OAuth linking
- `nextCookies()` plugin: HTTP-only cookies (XSS-safe, JavaScript can't access)
- Catch-all route: `app/api/auth/[...all]/route.ts` handles all auth flows

**Authentication Methods:**
- Email/Password: Argon2id hashing (strongest available)
- Google OAuth: social login via OAuth 2.0
- Session lifecycle: managed by adapter

**Refs:** https://better-auth.com/docs/installation | https://medium.com/@telerushikesh61/implementing-authentication-in-next-js-using-better-auth-neon-and-drizzle-orm-e9e3482a4a44

---

## 5. SePay Bank Webhook (Auto-Credit)

**Webhook Flow:**
1. Customer transfer → bank → SePay detects transaction
2. SePay fires webhook to your endpoint with transaction metadata
3. Match transfer content (account/amount) to user → auto-credit balance
4. Webhook contains: transaction ID, amount, account, timestamp

**Implementation:**
- Webhook signature verification (HMAC or similar, verify in docs)
- Idempotency: store processed transaction IDs (prevent double-credit)
- Match transfer remarks/descriptions to user account mapping

**Active Development (2025-2026):**
- SePay Banking API ecosystem expanding; promotions through Q4 2025
- Real-time bank transaction forwarding via webhooks

**Refs:** https://developer.sepay.vn/en/sepay-webhooks/tich-hop-webhook | https://sepay.vn/blog/tich-hop-webhook-ban-giao-dich-ngan-hang-qua-ung-dung-thu-3/

---

## Implementation Priorities

1. **FFmpeg + BullMQ:** Combine in job processor (sandboxed worker threads for CPU-heavy encode)
2. **R2 Presigned:** Frontend upload source video directly (≤ 5GB tested), zero egress cost
3. **Auth:** better-auth Drizzle adapter ready to go; Google OAuth fastest time-to-ship
4. **Payments:** SePay webhook idempotent credit logic; webhook signature verification essential

---

## Unresolved Questions

- FFmpeg audio ducking: exact dB reduction needed for Vietnamese male/female voice intelligibility?
- BullMQ: recommended CPU/memory per worker for simultaneous FFmpeg processes (4K video)?
- R2 multipart: optimal chunk size vs. operations cost tradeoff for videos 500MB–5GB?
- SePay: transaction lookup pattern if webhook arrives out-of-order or delays >5min?
- better-auth: session TTL + refresh token rotation best practice for SaaS?
