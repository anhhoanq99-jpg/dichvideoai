# Dựng worker trên VPS (chuyển khỏi máy cá nhân)

> Mục tiêu: chuyển `dichvideo-worker` từ pm2 trên máy Windows sang một VPS Linux
> để máy tắt không làm chết dịch vụ. Worker CPU-thuần (ffmpeg libx264, không GPU),
> đã gỡ Python/torch nên chỉ cần: **Node 20 + pnpm + ffmpeg + yt-dlp + pm2**.
>
> ⚠️ **CHỈ CHẠY MỘT worker.** Bước cắt chuyển (mục 7) phải tắt worker cũ trên
> máy Windows, nếu không hai worker tranh job trên cùng Redis → lỗi khó hiểu.

## 0. Cấu hình VPS nên mua

| Thông số | Mức khuyến nghị | Ghi chú |
|---|---|---|
| Nhà cung cấp | **Hetzner Cloud CPX31** (~€14/th) | 4 vCPU AMD **dedicated** — render ăn CPU thật |
| Rẻ hơn | Contabo VPS S (~$6/th, 4 vCPU/8GB) | CPU shared, render chậm hơn nhưng vẫn dùng tốt ở quy mô hiện tại |
| vCPU / RAM | **4 vCPU / 8 GB** | 2 job render song song + dư cho import |
| Ổ cứng | **≥ 80 GB SSD** | video tạm tải về trước khi đẩy R2 |
| OS | **Ubuntu 24.04 LTS** | checklist này viết theo Ubuntu |
| Vị trí | **Singapore** | gần VN → tải link nhanh hơn |
| Đăng nhập | **SSH key** (đừng dùng mật khẩu) | |

Khi tạo VPS: chọn Ubuntu 24.04, thêm SSH key, ghi lại **IP**.

---

## 1. Đăng nhập + tài khoản triển khai

```bash
ssh root@<IP-VPS>

# Tạo user thường (đừng chạy worker bằng root)
adduser deploy
usermod -aG sudo deploy
rsync --archive --chown=deploy:deploy ~/.ssh /home/deploy   # copy SSH key sang
exit

ssh deploy@<IP-VPS>   # từ giờ đăng nhập bằng deploy
```

## 2. Cập nhật + gói nền

```bash
sudo apt update && sudo apt upgrade -y
sudo apt install -y git curl ffmpeg python3 python3-pip

ffmpeg -version   # xác nhận có ffmpeg + ffprobe (cùng gói)
```

> Worker gọi `ffmpeg`/`ffprobe` trần trên PATH (không đặt `FFMPEG_DIR` như bên
> Windows). Gói `ffmpeg` của Ubuntu đã kèm libx264 — đủ dùng.

## 3. yt-dlp (tải video từ link)

Dùng bản binary chính chủ (mới hơn bản apt, ít lỗi upstream):

```bash
sudo curl -L https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp -o /usr/local/bin/yt-dlp
sudo chmod a+rx /usr/local/bin/yt-dlp
yt-dlp --version   # xác nhận PATH thấy được
```

> Worker gọi `yt-dlp` trần trên PATH (không đặt `YTDLP_PATH`). Tự cập nhật sau
> này: `sudo yt-dlp -U`.

## 4. Node 20 + pnpm + pm2

```bash
# Node 20 LTS qua nodesource
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
node -v    # v20.x

# pnpm đúng phiên bản repo (packageManager: pnpm@11.10.0) qua corepack
sudo corepack enable
corepack prepare pnpm@11.10.0 --activate
pnpm -v    # 11.10.0

# pm2 toàn cục
sudo npm install -g pm2
```

## 5. Lấy mã nguồn + cài phụ thuộc

```bash
cd ~
git clone https://github.com/anhhoanq99-jpg/dichvideoai.git
cd dichvideoai
pnpm install         # cài cả monorepo (worker + shared + db)
pnpm --filter worker typecheck   # kiểm nhanh mọi thứ resolve được
```

## 6. File `.env` ở GỐC repo

Worker nạp env bằng dotenv đọc `.env` ở gốc repo. Tạo `~/dichvideoai/.env`:

```bash
nano ~/dichvideoai/.env
```

Copy TOÀN BỘ `.env` production từ máy Windows sang, **NHƯNG BỎ 3 dòng chỉ dành
cho Windows** (Linux tự tìm binary trên PATH):

- ❌ Bỏ `FFMPEG_DIR=...`
- ❌ Bỏ `YTDLP_PATH=...`
- ⚠️ `YTDLP_COOKIES=...` — chỉ giữ nếu bạn có copy file `cookies.txt` lên VPS
  (cần cho link Douyin). Nếu chưa có thì bỏ dòng này; import Douyin sẽ báo lỗi
  hướng dẫn, các nguồn khác vẫn chạy.

Các key BẮT BUỘC giữ (worker cần): `DATABASE_URL`, `REDIS_URL`, `GEMINI_API_KEY`
(+ `GEMINI_API_KEYS` nếu xoay vòng key), `GROQ_API_KEY`, `ELEVENLABS_API_KEY`,
`GOOGLE_TTS_API_KEY`, `WORKER_HEALTH_PORT`.

> `.env` đã nằm trong `.gitignore` — không lo commit nhầm.

## 7. Cắt chuyển — TẮT worker cũ TRƯỚC

Đây là bước sống còn: chỉ được có MỘT worker chạy.

```powershell
# TRÊN MÁY WINDOWS (PowerShell):
pm2 stop dichvideo-worker
pm2 save
```

```bash
# TRÊN VPS — chờ máy Windows tắt xong mới start:
cd ~/dichvideoai/apps/worker
pm2 start ecosystem.config.cjs
pm2 save
pm2 startup    # in ra 1 lệnh sudo — copy chạy lại để worker tự lên sau reboot
```

## 8. Xác minh

```bash
pm2 status                     # dichvideo-worker = online
pm2 logs dichvideo-worker      # thấy log "worker started" / lắng nghe queue
curl http://localhost:$WORKER_HEALTH_PORT/health   # nếu có health endpoint
```

Kiểm tra đầu-cuối thật: lên web production upload/dán link 1 video ngắn → theo
dõi `pm2 logs` thấy job chạy → video ra `ready`. Nếu OK, worker đã sống trên VPS.

## 9. Vận hành về sau

```bash
# Cập nhật code sau khi push main:
cd ~/dichvideoai && git pull && pnpm install
pm2 restart dichvideo-worker

pm2 monit          # xem CPU/RAM realtime
sudo yt-dlp -U     # cập nhật yt-dlp khi nguồn đổi (thỉnh thoảng)
```

### Cạm bẫy
- **Hai worker song song** = tranh job, lỗi `yt-dlp exit 3221225794`. Luôn kiểm
  `pm2 status` cả hai máy, chỉ một nơi `online`.
- Worker KHÔNG có bước build — chạy `.ts` trực tiếp qua tsx. `git pull` +
  `pm2 restart` là đủ, không cần compile.
- Máy Windows sau khi cắt chuyển: để `pm2 stop` là được; đừng `pm2 delete` vội
  nếu muốn giữ đường lùi. Khi chắc chắn VPS ổn mới dọn.
