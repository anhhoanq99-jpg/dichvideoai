#!/usr/bin/env bash
# =============================================================================
# Cài worker Dịch Video AI lên VPS Ubuntu 22+ (khuyến nghị 2 vCPU / 4GB RAM)
# Chạy: bash scripts/vps-worker-setup.sh   (sau khi đã git clone repo và cd vào)
# Yêu cầu trước khi chạy: file .env ở gốc repo đã điền key PROD
#   (FFMPEG_DIR và YTDLP_PATH để trống — Linux dùng PATH sẵn)
# =============================================================================
set -euo pipefail

echo "== 1/5 Cài Node 22, ffmpeg, yt-dlp =="
if ! command -v node >/dev/null || [[ "$(node -v | cut -c2-3)" -lt 22 ]]; then
  curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
  sudo apt-get install -y nodejs
fi
sudo apt-get install -y ffmpeg yt-dlp

echo "== 2/5 Bật pnpm qua corepack =="
sudo corepack enable
corepack prepare pnpm@10 --activate || corepack prepare pnpm@latest --activate

echo "== 3/5 Cài dependencies =="
pnpm install --frozen-lockfile

echo "== 4/5 Kiểm tra .env =="
if [[ ! -f .env ]]; then
  echo "❌ Chưa có file .env ở gốc repo — copy từ .env.example và điền key PROD rồi chạy lại."
  exit 1
fi
grep -q "DATABASE_URL=postgresql" .env || { echo "❌ .env thiếu DATABASE_URL"; exit 1; }
grep -q "REDIS_URL=rediss" .env || { echo "❌ .env thiếu REDIS_URL (phải là rediss:// TLS)"; exit 1; }

echo "== 5/5 Chạy worker bằng pm2 (tự khởi động lại khi reboot/crash) =="
sudo npm i -g pm2
cd apps/worker
pm2 delete dichvideo-worker 2>/dev/null || true
pm2 start "node_modules/.bin/tsx src/index.ts" --name dichvideo-worker --time
pm2 save
sudo env PATH=$PATH pm2 startup systemd -u "$USER" --hp "$HOME" | tail -1 | sudo bash || true

echo ""
echo "✅ Xong. Kiểm tra:"
echo "   pm2 logs dichvideo-worker --lines 20   # phải thấy 'worker up', port 8787"
echo "   curl -s localhost:8787                 # phải trả {\"ok\":true,...}"
