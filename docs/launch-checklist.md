# Checklist ra mắt — Dịch Video AI

> Cập nhật 2026-07-10. Làm theo thứ tự. Mục ⚠️ là BẮT BUỘC trước khi công khai.

## 1. SePay (nạp tiền tự động) — bạn tự làm, ~15 phút

1. Đăng ký tài khoản tại sepay.vn, liên kết tài khoản ngân hàng nhận tiền.
2. Vào mục Webhooks → tạo webhook mới:
   - URL: `https://<domain-cua-ban>/api/webhooks/sepay`
   - Kiểu xác thực: **API Key**, đặt một chuỗi ngẫu nhiên dài (chính là `SEPAY_WEBHOOK_KEY`)
   - Sự kiện: giao dịch **tiền vào**
3. Điền vào `.env` (cả Vercel lẫn VPS): `SEPAY_WEBHOOK_KEY`, `SEPAY_BANK` (vd `BIDV`), `SEPAY_ACCOUNT` (số TK).
4. Test: chuyển 10.000đ vào tài khoản với nội dung là mã `DVxxxxxxxx` trên trang /credits → số dư phải +10.000 credits trong ~1 phút.

Ghi chú kỹ thuật: webhook đối chiếu mã `DV<8 ký tự đầu userId>` trong nội dung CK, idempotent theo id giao dịch, tự cộng % thưởng theo mức nạp.

## 2. ⚠️ Đổi TOÀN BỘ API key (các key hiện tại đã lộ trong quá trình dev)

| Dịch vụ | Nơi đổi | Việc cần làm |
|---|---|---|
| Google OAuth | console.cloud.google.com/apis/credentials | Tạo client secret mới, thêm redirect URI domain thật |
| Neon Postgres | console.neon.tech → Roles | Reset password, lấy connection string mới |
| Upstash Redis | console.upstash.com | Reset token database |
| Cloudflare R2 | dash.cloudflare.com → R2 → API tokens | Thu hồi token cũ (kể cả token `cfat_` từng dán trong chat), tạo cặp key mới; tạo bucket `dichvideo-prod` + CORS (AllowedOrigins = domain thật, ExposeHeaders = ETag) |
| Groq | console.groq.com/keys | Revoke key cũ, tạo key mới |
| Gemini | aistudio.google.com/apikey | Tạo key mới, **nâng lên paid tier** (bắt buộc để lồng tiếng cao cấp không bị nghẽn 3 req/phút) → đặt `GEMINI_TTS_RPM=60` |
| BETTER_AUTH_SECRET | tự sinh | `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"` |

## 3. Deploy

### 3a. Web → Vercel (~20 phút)
1. Push repo lên GitHub (private). `.env` đã gitignore — kiểm tra lại lần cuối `git log --stat` không dính secret.
2. Vercel → New Project → import repo, Root Directory: `apps/web`, framework Next.js (Vercel tự nhận monorepo pnpm).
3. Điền toàn bộ biến môi trường (theo `.env.example`), `BETTER_AUTH_URL=https://<domain>`.
4. Gắn domain, cập nhật Google OAuth redirect URI + R2 CORS theo domain mới.

### 3b. Worker → VPS Linux (~30 phút, khuyến nghị 2 vCPU/4GB, Ubuntu 22+)
```bash
# cài nền
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo bash - && sudo apt install -y nodejs ffmpeg yt-dlp
corepack enable && corepack prepare pnpm@latest --activate
# lấy code + cài deps
git clone <repo> && cd web_dichvideo && pnpm install
# cấu hình: tạo .env ở gốc repo theo .env.example (FFMPEG_DIR để trống)
# chạy bằng pm2
npm i -g pm2
cd apps/worker
pm2 start "node_modules/.bin/tsx src/index.ts" --name dichvideo-worker
pm2 save && pm2 startup
# kiểm tra
curl localhost:8787   # {"ok":true,...}
```
Worker chỉ cần chiều đi (kết nối ra Neon/Upstash/R2) — không cần mở port công khai, không cần domain.

### 3c. Database
```bash
pnpm --filter @dichvideo/db push   # áp schema lên Neon prod (hoặc migrate nếu đã chuyển sang migrations)
```

## 4. Sau khi deploy — kiểm tra đầu-cuối

- [ ] Đăng nhập Google trên domain thật → nhận 10.000 credits tặng
- [ ] Upload 1 video ngắn → pipeline tự chạy tới bản dịch → render + lồng tiếng OK
- [ ] Credits bị trừ đúng bảng giá, job lỗi được hoàn
- [ ] Nạp thử 10.000đ qua SePay → credits tự cộng
- [ ] Trang /dieu-khoan, /bao-mat hiển thị; footer có link
- [ ] Xem landing trên điện thoại thật

## 5. Việc nên làm sớm sau ra mắt

- Cron dọn file R2 outputs quá 7 ngày (hiện mới ghi chú trong ToS — cần job dọn thật)
- Rate-limit các API route công khai (upload, tts-preview)
- Trang admin xem usage_events / doanh thu
- Backup định kỳ Neon (có sẵn PITR trên gói trả phí)
