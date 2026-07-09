# Phase 06 — Monetization & Launch (Credits, SePay, Legal, Deploy)

## Context links

- [plan.md](./plan.md) · [phase-01-foundation.md](./phase-01-foundation.md) (ledger schema) · [researcher-02-report.md](./research/researcher-02-report.md) §5 (SePay webhook)
- Brainstorm #2 §3 (legal requirements before charging) — `docs/brainstorm-02-batch-localization-workflow.md`

## Overview

- **Date:** 2026-07-09
- **Description:** Enforce credits on all paid jobs (deduct-before-run, refund-on-fail); SePay bank-transfer top-up with idempotent webhook; trial limits; ToS/Privacy (Vietnamese); final landing page copy (localization positioning); production deploy (Vercel web + VPS worker + managed Postgres/Redis).
- **Priority:** Critical (revenue + legal gate)
- **Implementation status:** Not started
- **Review status:** Not reviewed

## Key Insights

- Ledger + cost tracking exist since Phase 1 → this phase adds *enforcement* + *top-up*, and calibrates pricing from real `usageEvents` data (margin per job must be positive — brainstorm #1 metric).
- Deduct-before-run (hard limit) prevents cost run-away (brainstorm #2 risk 4); refund on fail keeps trust.
- SePay: webhook fires on bank transfer; match via unique order code in transfer memo; **idempotency by SePay transaction id unique constraint** (researcher-02 §5). Use `payment-integration` skill (SePay section) during implementation.
- Legal gate before charging (brainstorm #2): ToS with user content-rights commitment, copyright complaint process, repeat-infringer lockout, upload audit trail (uploadIp already stored).
- Landing positioning: "Việt hóa & lồng tiếng video AI" — never "reup". Marketing targets creators/distributors localizing content they have rights to.

## Requirements

**Functional:**
- Credit pricing per job type (per video-minute, constants): STT 2 / OCR 5 / translate 2 / render 3 / dub 10 credits/min (PLACEHOLDERS — calibrate: credit ≈ 1 VND-equivalent unit so cost×3–5 margin holds).
- Estimate shown before every job ("Cần ~120 credits · Số dư: 500"); insufficient → top-up prompt.
- Top-up packages: 50k / 120k / 300k VND (bonus % on larger); VietQR code + transfer memo `DV{orderCode}`; auto-credit on webhook; order status page live-updates (poll).
- Trial: signup grant (subtitle-only scope: enough for ~2 videos STT+translate; dubbing never free).
- Pages: `/pricing` (bảng giá), `/terms`, `/privacy`, `/contact` + copyright complaint email.
- Landing final: hero, feature sections (trích xuất → dịch → che sub → lồng tiếng), demo video, pricing, FAQ, SEO meta — Vietnamese, dark/light.
**Non-functional:** Webhook idempotent under retries/duplicates; credit ops serializable (no negative balance under concurrency); deploy reproducible (documented runbook); backups (Postgres daily).

## Architecture

### Credits enforcement (`packages/shared/src/credits.ts` + `apps/web/lib/billing.ts`)

```ts
estimateCredits(type, durationSec): number   // ceil(minutes) × rate
// on job create (single tx, SELECT ... FOR UPDATE on user row):
//   balance >= cost ? insert ledger(delta:-cost, reason:'job_charge', refId:jobId) + update balance + create job
//   : 402 { error:'INSUFFICIENT_CREDITS', needed, balance }
// worker on job failed/cancelled → web internal refund path? NO — worker writes directly to DB:
//   insert ledger(delta:+cost, reason:'job_refund', refId:jobId) + update balance (same tx as job status)
//   idempotent: unique index (reason, refId) partial WHERE reason IN ('job_charge','job_refund')
```

### SePay flow

```
tables:
paymentOrders { id, userId, code text unique /* e.g. DV8F3K21 */, amountVnd int, credits int,
  status $enum('pending','paid','expired'), sepayTxnId text unique, createdAt, paidAt }

POST /api/payments/orders {packageId} → create pending order → return {code, amountVnd, qrUrl}
   qrUrl = https://qr.sepay.vn/img?acc={ACC}&bank={BANK}&amount={amount}&des=DV{code}
POST /api/webhooks/sepay  (SePay → us)
   1. verify Authorization: Apikey {SEPAY_WEBHOOK_KEY}
   2. parse {id, transferAmount, content, ...}; extract order code via /DV([A-Z0-9]{6,})/
   3. tx: insert sepayTxnId (unique — dup ⇒ return 200 no-op);
      match order (pending, amount ≥ amountVnd) → status paid → ledger(+credits, reason:'topup', refId:orderId) → balance
   4. no match → store in unmatchedTransactions table for manual reconcile; always 200
GET /api/payments/orders/:id → status (client polls 3s on top-up page)
```

### Deploy topology

```
Vercel        → apps/web (Next.js), env via dashboard
Neon          → Postgres (managed, branching for staging, PITR backups)
Upstash/Redis Cloud → Redis (TLS; BullMQ maxRetriesPerRequest:null)
VPS (Hetzner/Vultr 4vCPU/8GB, Ubuntu 24.04) → apps/worker via docker compose;
   outbound-only (R2, Neon, Redis, AI APIs); inbound = SSH only (firewall)
R2            → bucket + lifecycle: uploads/ 14d, outputs/ 7d
Deploy: web = git push (Vercel); worker = GH Action builds image → ghcr → ssh compose pull+up (or manual script MVP — KISS)
```

## Related code files

- **Create (web):** `app/api/payments/{orders/route.ts, orders/[id]/route.ts}`, `app/api/webhooks/sepay/route.ts`, `app/(app)/billing/page.tsx` (số dư, lịch sử ledger, nạp), `components/billing/{package-cards.tsx, qr-panel.tsx, ledger-table.tsx, credit-estimate.tsx}`, `app/(marketing)/{pricing,terms,privacy,contact}/page.tsx`, landing sections `components/marketing/*`
- **Create (shared):** finalized `credits.ts` rates + packages
- **Modify:** all job-create routes (extract/translate/render/dub) → estimate + deduct guard; worker processors → refund on fail; `packages/db` + migration (paymentOrders, unmatchedTransactions, partial unique index on ledger)
- **Create (ops):** `apps/worker/docker-compose.prod.yml`, `docs/deploy-runbook.md`, `.github/workflows/ci.yml` (lint+build+test)

## Implementation Steps

1. Calibrate rates: pull `usageEvents` real costs from Phases 2–5 dogfooding → set credit rates with 3–5× margin; document math in `reports/pricing-calibration.md`.
2. Enforcement: billing helper (tx + row lock), wire into 5 job routes; refund path in worker error handler; idempotency indexes; concurrency test (parallel job spam cannot go negative).
3. Trial grant finalized (amount from calibration); free-tier caps (3 videos, 15 phút tổng, no dub) enforced at job create.
4. SePay: orders API + webhook (invoke `payment-integration` skill for exact payload fields/signature) + unmatched-txn fallback + billing UI with QR + polling; expire pending orders after 24h (cron/BullMQ repeatable job).
5. Sandbox-test webhook end-to-end (SePay test tools / manual curl with real payload shape) incl. duplicate delivery + wrong amount + no-match cases.
6. Legal pages (VN): ToS — user warrants content rights, prohibited use list, complaint process (dmca@… email), termination for repeat infringement; Privacy — data retention (video 7–14d), Google login data. Get human review before launch.
7. Landing final: copy per positioning ("Việt hóa video nước ngoài trong vài phút — phụ đề & lồng tiếng AI"), demo video, pricing table, FAQ, OG/SEO meta, sitemap.
8. Deploy: provision Neon/Upstash/R2 lifecycle/VPS; secrets management; deploy runbook; smoke prod E2E (upload→dub→download→top-up with real 10k VND transfer).
9. Observability MVP: worker pino → file/loki-lite? KISS = pino to journald + Vercel logs + UptimeRobot on /healthz + daily cost query (SQL) — no APM yet.

## Todo list

- [ ] Pricing calibration from real usageEvents (report)
- [ ] Deduct-before-run tx + refund-on-fail + idempotency indexes
- [ ] Concurrency safety test (no negative balance)
- [ ] Free-tier caps + trial grant final
- [ ] paymentOrders schema + orders API + QR top-up UI
- [ ] SePay webhook (idempotent, unmatched fallback, expiry job)
- [ ] Webhook abuse/duplicate/mismatch tests
- [ ] ToS + Privacy + complaint process pages (VN)
- [ ] Landing page final (copy, demo, pricing, SEO)
- [ ] Prod provisioning + deploy runbook + CI
- [ ] Prod smoke E2E incl. real bank transfer
- [ ] Uptime + daily cost monitoring queries

## Success Criteria

- Real transfer → credits within 30s, exactly once, even with duplicated webhook delivery.
- Failed job auto-refunds; ledger always balances (audit script in CI).
- Every job's margin visible: `creditsCharged(VND value) − costUsdMicros(→VND)` > 0 on dashboard query.
- Legal pages live; account cannot run paid job below balance; free tier cannot dub.
- Prod E2E: full flow works from clean account; brainstorm #1 metric "nạp credits tự động end-to-end" met.

## Risk Assessment

- **Webhook spoofing** → API-key header check + amount/order matching; never credit from client-side signal.
- **User transfers wrong amount/memo** → unmatchedTransactions + manual reconcile UI note (admin panel is Phase 7; interim = SQL).
- **Pricing wrong (negative margin)** → calibration step gated on real usage data; rates in one constants file = 1-line change.
- **Vercel function limits (upload init, SSE)** → uploads go direct to R2 (no body through Vercel); SSE bounded + polling fallback (Phase 4 design).
- **Single VPS worker = SPOF** → acceptable at launch; queue persists in Redis, jobs resume on restart; runbook covers re-provision <1h.

## Security Considerations

- Webhook route: constant-time key compare, rate limit, log raw payloads (PII-safe) for dispute audit.
- Ledger append-only; no API mutates balance except tx helpers; admin adjustments logged with reason.
- Secrets only in Vercel env / VPS env file (chmod 600); rotate SePay key capability documented.
- ToS/Privacy legally reviewed by a human before accepting payments.

## Next steps

Launch closed beta → collect margin + quality data → Phase 7 backlog prioritization by revenue signal.

## Unresolved questions

- SePay exact webhook auth mechanism (Apikey header vs none) — confirm against current SePay docs during implementation (skill has details).
- Company/legal entity for payment receipt + invoicing (hóa đơn) requirements — user/business decision.
- Final package sizes & bonus % — marketing decision at calibration time.
- VAT handling on top-ups — needs accountant input before scale.
