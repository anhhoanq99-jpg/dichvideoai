// Cấu hình pm2 cho worker trên VPS (Linux).
//
//   cd apps/worker && pm2 start ecosystem.config.cjs
//
// Worker chạy TRỰC TIẾP file .ts qua tsx (không có bước build), y như script
// "start". Env nạp bằng dotenv đọc ".env" ở gốc repo (../../.env) — đặt .env ở
// gốc repo giống hệt môi trường dev là đủ, KHÔNG cần khai lại env ở đây.
//
// ⚠️ CHỈ CHẠY MỘT worker trên toàn hệ thống. Trước khi start cái này, PHẢI tắt
// worker pm2 trên máy Windows (pm2 stop dichvideo-worker) — hai worker song song
// tranh job trên cùng một Redis, sinh lỗi khó hiểu (vd yt-dlp exit 3221225794).
module.exports = {
  apps: [
    {
      name: "dichvideo-worker",
      cwd: __dirname, // apps/worker
      script: "pnpm",
      args: "start",
      interpreter: "none", // exec pnpm trực tiếp, không bọc qua node
      autorestart: true,
      // render ffmpeg + tải video 2GB có thể ăn RAM; quá ngưỡng thì pm2 restart
      max_memory_restart: "1500M",
      // job dài (render/dub/import tới 20 phút) — đừng để pm2 coi là "phút đầu đã chết"
      min_uptime: "30s",
      max_restarts: 10,
      env: {
        NODE_ENV: "production",
      },
    },
  ],
};
