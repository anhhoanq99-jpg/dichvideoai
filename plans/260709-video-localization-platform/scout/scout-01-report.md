# Scout Report 01 — Codebase Current State

> Date: 2026-07-09. No `codebase-summary.md`/`code-standards.md`/`system-architecture.md`/`project-overview-pdr.md` exist — project is greenfield. All current code created 2026-07-09 in this session; state known fully, no scout agent needed.

## Workspace layout (`c:\Users\Admin\web_dichvideo`)

```
web_dichvideo/
├── docs/
│   ├── brainstorm-video-translate-platform.md      # brainstorm #1: architecture, stack, 5 phases
│   └── brainstorm-02-batch-localization-workflow.md # brainstorm #2: batch workflow, feature boundaries
├── plans/260709-video-localization-platform/        # this plan
└── landing-page/                                    # fresh Next.js app (only code)
```

## landing-page/ state

- Next.js 16.2.10 (Turbopack, App Router), React 19.2.4, TypeScript 5.9.3, Tailwind CSS 4.3.2 (@tailwindcss/postcss, no tailwind.config — v4 CSS-first via `app/globals.css`), ESLint, alias `@/*`
- Deps installed: framer-motion 12.42.2, lucide-react 1.23.0, next-themes 0.4.6, clsx 2.1.1, tailwind-merge 3.6.0
- Files:
  - `app/layout.tsx` — root layout, Geist fonts, ThemeProvider (next-themes, attribute="class", system default), suppressHydrationWarning
  - `app/(marketing)/page.tsx` — route `/`, renders `<Hero/>` placeholder
  - `app/globals.css` — default create-next-app Tailwind v4 setup
  - `components/hero.tsx` — placeholder hero (framer-motion + lucide Rocket icon)
  - `components/theme-provider.tsx` — next-themes wrapper
  - `lib/utils.ts` — `cn()` (clsx + tailwind-merge)
- Verified working: `npm run dev` → 200 on :3000
- NOT a git repository yet (neither workspace root nor landing-page — create-next-app may have inited git in landing-page; verify before first commit)
- No backend, no DB, no env files, no tests, no CI

## Key decisions already locked (from docs/, do not re-litigate)

- Positioning: "video localization" NOT "reup"; excluded features: link/yt-dlp ingestion (user confirmed drop), logo/watermark removal, Content-ID evasion
- Stack: API-first (Gemini video OCR + translate, Groq Whisper STT, Edge TTS free tier + premium TTS), Node worker + BullMQ + Redis, Postgres, Cloudflare R2, better-auth Google login, SePay credits, FFmpeg on VPS worker
- UI: dark + light mode, Linear/Vercel-style, better than gensubai.com
- Roadmap skeleton: P1 extract+translate → P2 render (blur/burn) → P3 dubbing → P4 credits/SePay → P5 batch studio → P6 publish OAuth

## Constraints for planner

- Vietnamese-market product; UI copy in Vietnamese
- Fresh skeleton = no legacy patterns to follow; plan defines code standards
- Windows dev machine (user), production worker will need Linux VPS (FFmpeg)
- `landing-page/` name is legacy of setup task — planner should decide: rename vs monorepo layout (apps/web + apps/worker) — recommend deciding early, cheap now, expensive later
