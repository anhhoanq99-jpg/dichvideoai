# Phase 01 — Foundation: Monorepo, DB, Auth, Queue, UI Shell

## Context links

- [plan.md](./plan.md) · [scout-01-report.md](./scout/scout-01-report.md) · [researcher-02-report.md](./research/researcher-02-report.md)
- Brainstorms: `docs/brainstorm-video-translate-platform.md`, `docs/brainstorm-02-batch-localization-workflow.md`

## Overview

- **Date:** 2026-07-09
- **Description:** Restructure to pnpm monorepo; Postgres + Drizzle schema (incl. credits ledger + cost tracking day 1); better-auth Google login; Redis + BullMQ scaffold; validated env config; dark/light dashboard shell in Vietnamese.
- **Priority:** Critical (everything depends on it)
- **Implementation status:** DONE 2026-07-09. Dev infra = option B cloud (Neon Postgres ap-southeast-1 + Upstash Redis TLS) instead of local Docker (WSL2 unavailable on dev machine). Migration applied (9 tables). Smoke test PASSED: ledger grant → BullMQ enqueue → worker → job `done` → ledger invariant holds (`apps/worker/src/dev/smoke.ts`). Google OAuth creds configured in .env; browser login pending user verification.
- **Review status:** Not reviewed

## Key Insights

- Current code = fresh Next.js 16 skeleton in `landing-page/` (misleading name), NOT a git repo. Restructure now is cheap; later is expensive.
- **Monorepo justification:** web (Vercel) and worker (VPS) are separate deploy targets but must share DB schema + job payload types. Two repos = drift; one app = can't deploy separately. pnpm workspaces solves it. **No Turborepo** — 2 apps, `pnpm --filter` scripts suffice (KISS); add later only if build orchestration hurts.
- Credits ledger from day 1 even though free — measures cost/user before pricing (brainstorm #1 risk 2).
- Managed Redis (Upstash/Redis Cloud, standard protocol + TLS) so both Vercel and VPS reach it without exposing VPS ports. BullMQ on Upstash requires `maxRetriesPerRequest: null`.
- better-auth: Drizzle adapter + `nextCookies()` plugin + catch-all route (researcher-02 §4).

## Requirements

**Functional:** Google sign-in/out; authenticated dashboard shell; theme toggle persists; local dev stack via docker compose.
**Non-functional:** All env vars zod-validated at boot (fail fast); schema migrations via drizzle-kit; TypeScript strict; ESLint passes in all packages.

## Architecture

```
web_dichvideo/  (git init here, root)
├── pnpm-workspace.yaml          # packages: apps/*, packages/*
├── package.json                 # root scripts: dev, build, db:generate, db:migrate, lint
├── docker-compose.dev.yml       # postgres:17, redis:7 (local dev only)
├── .env.example
├── apps/
│   ├── web/                     # moved from landing-page/ (Next.js 16)
│   └── worker/                  # Node 22 + BullMQ + FFmpeg processors (skeleton this phase)
└── packages/
    ├── db/                      # Drizzle schema + client + migrations
    └── shared/                  # types, queue names, job payload contracts, zod env, credit constants
```

Data flow: web enqueues BullMQ job (Redis) → worker processes → worker updates Postgres job row → web reads status.

### Drizzle schema sketch (`packages/db/src/schema/`)

```ts
// better-auth tables: user, session, account, verification — generate via `npx @better-auth/cli generate`
// add to user: creditBalance int default 0

videos: { id uuid pk, userId fk, r2Key text, originalName text,
  status text $enum('uploading','uploaded','processing','ready','failed'),
  durationSec int, width int, height int, sizeBytes bigint,
  sourceLang text, uploadIp text /* audit trail */, createdAt, deletedAt }

subtitleTracks: { id uuid pk, videoId fk, kind $enum('original','translated'), lang text,
  segments jsonb /* [{i, startMs, endMs, text}] */, version int default 1, createdAt, updatedAt }

jobs: { id uuid pk, videoId fk, userId fk,
  type $enum('probe','stt','ocr','translate','render','dub'),
  status $enum('queued','active','done','failed','cancelled'),
  progress int default 0, error text, params jsonb, result jsonb,
  creditsCharged int default 0, costUsdMicros bigint default 0,
  createdAt, startedAt, finishedAt }

usageEvents: { id uuid pk, jobId fk, provider text /* groq|gemini|azure-tts|r2 */,
  metric text /* tokens_in|tokens_out|audio_sec|chars */, quantity bigint,
  costUsdMicros bigint, createdAt }   // per-API-call cost audit

creditLedger: { id uuid pk, userId fk, delta int /* +topup, -charge */,
  reason $enum('signup_trial','topup','job_charge','job_refund','admin_adjust'),
  refType text, refId uuid, balanceAfter int, createdAt }  // append-only, never update/delete
```

Ledger rule: insert ledger row + update `user.creditBalance` in same transaction; balance must equal SUM(delta).

### Queue scaffold (`packages/shared/src/queue.ts`)

```ts
export const QUEUES = { pipeline: 'video-pipeline' } as const;  // single queue, named jobs by type (KISS)
export type JobPayload = { jobId: string; videoId: string; userId: string; params: Record<string, unknown> };
```

Worker skeleton: connects Redis, registers no-op processor per job type, logs, updates job row status. Graceful shutdown (SIGTERM → close worker).

### Env (`packages/shared/src/env.ts`, zod)

`DATABASE_URL, REDIS_URL, BETTER_AUTH_SECRET, BETTER_AUTH_URL, GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET, GROQ_API_KEY, GEMINI_API_KEY` (+ later: AZURE_TTS_KEY/REGION, SEPAY_*). Separate web/worker schemas — each validates only what it uses.

## Related code files

- **Move:** `landing-page/*` → `apps/web/*` (update `@/*` alias paths unchanged; fix package name)
- **Create:** `pnpm-workspace.yaml`, root `package.json`, `docker-compose.dev.yml`, `.env.example`, `.gitignore`
- **Create:** `packages/db/{package.json, drizzle.config.ts, src/schema/*.ts, src/index.ts}`
- **Create:** `packages/shared/{package.json, src/{env.ts, queue.ts, types.ts, credits.ts}}`
- **Create:** `apps/worker/{package.json, tsconfig.json, src/{index.ts, processors/*.ts}, Dockerfile}`
- **Create (web):** `apps/web/lib/auth.ts`, `apps/web/lib/auth-client.ts`, `apps/web/app/api/auth/[...all]/route.ts`, `apps/web/app/(app)/dashboard/page.tsx`, `apps/web/app/(app)/layout.tsx` (sidebar shell), `apps/web/app/(marketing)/login/page.tsx`, `apps/web/components/{app-sidebar.tsx, theme-toggle.tsx, user-menu.tsx}`
- **Delete:** `landing-page/` after move

## Implementation Steps

1. `git init` at workspace root; commit current state first (safety).
2. Create `pnpm-workspace.yaml` + root `package.json`; move `landing-page/` → `apps/web/`; verify `pnpm --filter web dev` serves :3000.
3. Scaffold `packages/shared`: zod env module, queue constants, shared types. `packages/db`: Drizzle + pg driver.
4. `docker-compose.dev.yml` (postgres:17-alpine, redis:7-alpine, volumes, healthchecks). Document `pnpm db:migrate` flow.
5. better-auth in web: config with Drizzle adapter + Google provider + `nextCookies()`; run CLI generate → merge auth tables into `packages/db` schema; catch-all route; session helper for server components.
6. Write app tables (videos, subtitleTracks, jobs, usageEvents, creditLedger); generate + run migration. Add `grantSignupCredits(userId)` hook on user creation (amount constant in `shared/credits.ts`, e.g. trial = 50 credits — calibrate Phase 6).
7. Scaffold `apps/worker`: BullMQ Worker on `video-pipeline` queue, dispatch by job name, no-op handlers, pino logging, healthcheck HTTP endpoint (`/healthz`), Dockerfile (node:22-slim + ffmpeg via apt).
8. UI shell: install shadcn/ui; `(app)` layout — sidebar (Trang chủ / Video của tôi / Nạp credits), topbar with theme toggle + user avatar menu ("Đăng xuất"); login page ("Đăng nhập với Google"); route protection via middleware/session check redirect to `/login`.
9. E2E smoke: sign in with Google → dashboard renders → enqueue test job from a dev-only route → worker logs it → job row `done`.

## Todo list

- [ ] git init + initial commit
- [ ] pnpm workspace + move landing-page → apps/web
- [ ] packages/shared (env zod, queue constants, types)
- [ ] packages/db (Drizzle config + full schema + migrations)
- [ ] docker-compose.dev.yml (Postgres + Redis)
- [ ] better-auth Google + Drizzle adapter + routes
- [ ] Signup trial-credit grant + ledger transaction helper
- [ ] apps/worker skeleton (BullMQ + Dockerfile + healthz)
- [ ] Dashboard shell UI (VN copy, dark/light) + auth guard
- [ ] Smoke test full loop (login → enqueue → worker → DB)

## Success Criteria

- `pnpm dev` runs web + worker + docker deps; Google login works end-to-end.
- Dev-only test job flows web → Redis → worker → Postgres status `done`.
- Ledger invariant holds (balance == SUM delta) under a small script test.
- Theme toggle works, no hydration warnings; all UI copy Vietnamese.
- Fresh clone → `.env` from example → running in <15 min (README at root).

## Risk Assessment

- **Move breaks Next config/paths** → verify dev build immediately after move, before any new code.
- **Upstash/BullMQ incompatibility** → dev uses local Redis; test managed Redis early (Phase 1 smoke against Upstash once). Fallback: Redis Cloud.
- **better-auth schema drift vs Drizzle** → always regenerate via CLI, never hand-edit auth tables.

## Security Considerations

- `BETTER_AUTH_SECRET` strong random; cookies HTTP-only (nextCookies plugin default).
- No secrets in repo; `.env.example` placeholders only.
- Redis + Postgres password-protected even in dev compose.
- Store `uploadIp` on videos for audit trail (legal requirement from brainstorm #2).

## Next steps

Phase 2 (upload & extraction) — depends on: R2 bucket provisioned, Groq + Gemini API keys obtained.

## Unresolved questions

- Managed Postgres choice for prod (Neon vs Supabase vs VPS-hosted) — decide in Phase 6 deploy; dev unaffected.
- Trial credit amount — placeholder 50; calibrate with real cost data in Phase 6.
