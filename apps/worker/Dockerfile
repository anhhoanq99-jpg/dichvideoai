# Production worker image — runs on Linux VPS. FFmpeg needed from Phase 4.
FROM node:22-slim

RUN apt-get update \
  && apt-get install -y --no-install-recommends ffmpeg fonts-noto-core fonts-noto-cjk \
  && rm -rf /var/lib/apt/lists/*

RUN corepack enable && corepack prepare pnpm@11.10.0 --activate

WORKDIR /repo
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml ./
COPY apps/worker/package.json apps/worker/
COPY packages/db/package.json packages/db/
COPY packages/shared/package.json packages/shared/

RUN pnpm install --frozen-lockfile --filter worker...

COPY packages ./packages
COPY apps/worker ./apps/worker
# Vietnamese-complete fonts for libass sub burning (OFL-licensed, bundled in repo)
# Sanity check: ass filter must be compiled in
RUN ffmpeg -hide_banner -filters 2>/dev/null | grep -q " ass " || (echo "ffmpeg missing libass" && exit 1)

EXPOSE 8787
CMD ["pnpm", "--filter", "worker", "start"]
