# Phase 07 — Backlog Outline (Post-Launch, No Detail By Design)

## Context links

- [plan.md](./plan.md) · `docs/brainstorm-02-batch-localization-workflow.md` §3 (Phase 5–6 original roadmap)

## Overview

- **Date:** 2026-07-09
- **Description:** Outline-only backlog: batch localization studio, series glossary memory, OAuth publishing, admin panel. Deliberately not planned in detail — prioritize by paying-user signal after Phase 6 launch (YAGNI).
- **Priority:** Low (post-revenue)
- **Implementation status:** Backlog
- **Review status:** N/A

## Key Insights

- Architecture already supports these: stateless workers scale horizontally, single-queue design extends to priority/groups, ledger handles batch pre-charging, tracks schema extends to series scope.
- Feature boundaries remain locked: NO yt-dlp ingestion, NO watermark removal, NO Content-ID evasion — applies to every backlog item.

## Requirements (outline only)

1. **Batch Localization Studio** — 10–50 videos/batch; pipeline auto-runs end-to-end; per-item progress/cancel/retry; bilingual review table with bulk edit + batch approve before render; pre-charge whole batch, refund per failed item. New tables: `projects`, `batches`, `batchItems`. BullMQ: flows (parent-child), per-user concurrency limit, priority for paid tiers. Gemini context caching becomes worthwhile here (shared glossary across batch).
2. **Series Glossary Memory** — `seriesGlossaries` table scoped to project; auto-accumulate confirmed name/pronoun translations from episode N into context for N+1; differentiator vs competitor ("dịch tập sau nhớ tập trước").
3. **OAuth Publishing** — YouTube Data API upload to user's OWN channel (title/description/tags translated), schedule + status; TikTok Content Posting API evaluated after. Only user-authorized channels (legal boundary).
4. **Admin Panel** — user/credit management, unmatched-payment reconcile UI, job monitor + requeue, cost/margin dashboards (queries exist since Phase 1), copyright complaint handling workflow, repeat-infringer flagging.
5. **Smaller candidates:** user render/style/voice presets, synthesis cache (re-dub cost), ElevenLabs premium voices, Gemini Pro translation tier, subtitle timeline editor, watermark on free renders.

## Architecture

Deltas only: `projects/batches/batchItems/seriesGlossaries` tables; BullMQ FlowProducer; Gemini context caching; YouTube OAuth scopes via better-auth account linking. No new infra class needed until GPU features (inpainting/self-host TTS) — separate decision then.

## Related code files

N/A — planned when scheduled.

## Implementation Steps

1. After 4–6 weeks of Phase 6 revenue data: rank items by paying-user demand.
2. Write full phase plan (this template) for top item only.

## Todo list

- [ ] Post-launch prioritization review (revenue + user interviews)
- [ ] Detailed plan for chosen item

## Success Criteria

Backlog item promoted only with evidence (≥N paying users requesting / margin case).

## Risk Assessment

- Building batch before single-video quality is proven = wasted effort — gate on retention metrics.
- YouTube API quota (uploads cost 1600 units, default 10k/day ≈ 6 uploads) — quota increase application needed before publishing feature viable.

## Security Considerations

- OAuth tokens (YouTube) = high-value secrets: encrypted at rest, minimal scopes, revocation UI.
- Admin panel: role-based access, audit log on every mutation.

## Next steps

None until Phase 6 ships.

## Unresolved questions

- All — by design. Prioritization data does not exist yet.
