# HANDOFF — SubVideo AI (Việt hóa & lồng tiếng video AI)

> Cập nhật: **2026-07-31**. Đọc file này + `CLAUDE.md` + `apps/web/AGENTS.md` trước khi làm.
> Đủ để AI/dev mới tiếp tục ngay.

---

## 0. ĐỌC TRƯỚC TIÊN — 2 việc đang CHẶN, cần USER làm

### 0.1 🔴 Worker VPS chưa `git pull` — **gấp nhất**

Rất nhiều bản vá session này nằm ở worker và **chưa có hiệu lực**: tự dọn job mồ côi, Gemini dịch,
giữ tên riêng khi dịch, bậc máy dịch, sửa song song lồng tiếng.

```powershell
# Remote Desktop (mstsc) vào 103.249.201.118 → PowerShell:
cd $env:USERPROFILE\dichvideoai; git pull; pm2 restart dichvideo-worker
pm2 logs dichvideo-worker --lines 40   # cần thấy "worker up", không crash-loop
```

Không cần `pnpm install` (không thêm thư viện mới).

### 0.2 🔴 `GMAIL_USER` / `GMAIL_APP_PASSWORD` trên Vercel là **CHUỖI RỖNG**

Đây là lý do email không bao giờ tới. `vercel env ls` thấy tên biến nên tưởng đã cấu hình, nhưng
kéo giá trị về thì cả hai chỉ có 2 ký tự `""`. Đã xác minh bằng SMTP thật:
`LOI SMTP: Missing credentials for "PLAIN"`.

Sửa: vercel.com → project **dichvideoai** → Settings → Environment Variables → Edit **cả hai**
(dán `subdubaiglobal@gmail.com` và App Password 16 ký tự **đã bỏ dấu cách**) → `vercel --prod --yes`.

App Password: myaccount.google.com/apppasswords (phải bật 2FA trước).

---

## 1. Mục tiêu tổng thể

SaaS **Việt hóa & lồng tiếng video bằng AI** (đối thủ gensubai.com). Luồng: upload/dán link →
trích phụ đề (OCR/STT) → dịch văn nói → studio chỉnh sửa → xuất MP4 (kèm lồng tiếng).
**ĐÃ LÊN PRODUCTION, thu tiền thật.** Giai đoạn: **thương mại hoá + ổn định hoá** — vá lỗ hổng
tiền bạc, tối ưu tốc độ, chuẩn bị chạy quảng cáo rộng.

---

## 2. Hạ tầng (ĐANG CHẠY THẬT)

- ⚡ **VÙNG CHẠY = `sin1` (Singapore)** — `apps/web/vercel.json`. Trước không có file này nên Vercel
  dùng `iad1` (Mỹ) trong khi DB Neon ở `ap-southeast-1`: mỗi truy vấn một vòng Mỹ↔Singapore ~200ms.
  Đo thật từ VN: TTFB `/login` **669ms → 160ms**. ⚠️ `preferredRegion` của Next KHÔNG dùng được —
  trên Vercel nó chỉ ăn khi `runtime = 'edge'`, mà app cần Node runtime. Kiểm bằng
  `vercel inspect <url>` → xem `[sin1]`.
- **Web**: https://subvideoai.com · Vercel project **`dichvideoai`** (scope `wc-s-projects5`),
  root `apps/web`. `vercel.app` + `www` → 308 về apex (`apps/web/proxy.ts`).
- **Repo**: GitHub `anhhoanq99-jpg/dichvideoai`, push `main` → auto-deploy (~1–2 phút).
- **Worker**: pm2 `dichvideo-worker` trên **VPS Windows Server 2022** `103.249.201.118`
  (3 nhân/6GB). `concurrency: 2`. Tự sống lại sau reboot bằng Scheduled Task `pm2-resurrect`.
  ffmpeg+yt-dlp ở `C:\tools\bin`. Dựng lại: `apps/worker/DEPLOY-VPS-WINDOWS.md`.
- **DB** Neon Postgres (`ap-southeast-1`) · **Redis** Upstash · **R2** Cloudflare (`dichvideo-prod`).
- Env prod trên Vercel; `.env` gốc repo = dev (KHÔNG có `GMAIL_*`).

---

## 3. ĐÃ HOÀN THÀNH session này (mới → cũ)

| Commit | Nội dung |
|---|---|
| `5f308fd` ⏸ | **Xác minh email** — code hoàn chỉnh nhưng **đã bị `ff12404` revert** (lỡ push khi SMTP còn hỏng). Lấy lại bằng `git revert --no-edit ff12404`. Gồm: `lib/auth.ts` `requireEmailVerification` + `emailVerification{sendOnSignUp,sendOnSignIn,autoSignInAfterVerification}` + `grantSignupCredits`, `lib/email.ts` `sendVerifyEmail`, `login-card.tsx` lời nhắc kiểm hộp thư |
| `fcdaa75` | **Dòng bản quyền ở MỌI trang** — `components/copyright-line.tsx` dùng chung; `site-footer.tsx`, `(app)/layout.tsx`, 3 thẻ auth |
| `0b66335` | **Chữ mẫu trong bảng Kiểu phụ đề** — `subtitle-sample.tsx` + `subtitle-text-style.ts` (công thức tô chữ dùng chung với khung xem trước, không thể lệch) |
| `6ccd956` | Vá 3 lỗ hổng luồng tiền tìm được khi rà soát |
| `98edec6` | **Lồng tiếng: song song theo số nhân THẬT** — `dub.ts` `fitConcurrency()` (trước gõ cứng 6 với chú thích "máy 12 nhân", VPS chỉ 3 nhân) + log thời gian từng chặng (tts/ép clip/mux) |
| `e8871a1` | **Bậc máy dịch + bật lại Gemini** — `google-translate.ts` (`hasFreeTranslateQuota` chặn cứng trong 500k ký tự/tháng, vượt thì hạ xuống AI), phong cách `google`, `translateMachinePerLine`, `TRANSLATE_PROVIDER` mặc định gemini |
| `cb97ffc` | **Dịch: giữ tên riêng + xưng hô đúng thời đại** — `translate.ts` (luật cứng giữ tên riêng, phiên Hán-Việt; xưng hô theo thời đại), `buildStoryBrief` bắt trả BẢNG TÊN RIÊNG, `translation-style-prompts.ts` sửa ví dụ gây hiểu nhầm |
| `7dd1ac3` | Đổi câu mô tả hero, thêm "Affiliate" |
| `cf61138` | **Chuyển vùng chạy sang `sin1`** — `apps/web/vercel.json` |
| `b158dfb` | **Tự dọn job mồ côi + video treo** — `worker/lib/reconcile.ts` (`reconcileOrphanJobs`, `reconcileStuckVideos`), chạy lúc worker khởi động + mỗi 6h; `scripts/reconcile-orphans.ts` chạy tay |
| `772df3d` | **Hạn lưu file 5 ngày, gom về một hằng số** — `packages/shared/src/storage.ts` `OUTPUT_RETENTION_DAYS`, sửa 7 chỗ gõ cứng |
| `21fa058` | **22 test cho luồng tiền** — `packages/shared/src/credits.test.ts` (trước đây 0 test) |
| `5a1d932` | Tách `studio-toolbar.tsx`; preview chỉ tải **1 bộ font** thay vì 10 |
| `4a2e990` | Tách `render-preview` 904→710 dòng: `preview-geometry.ts`, `preview-controls.tsx`, `accented-words.tsx`, `hooks/use-logo-gesture.ts` |
| `79bca2b` | **Xoá code chết + gom 4 enum khai báo hai lần** — xoá 9 script chẩn đoán, `scripts/README.md`, DB schema lấy enum từ `shared`, migration `0005` xoá bảng `cloned_voices` |
| `14c3829` | **Bảng giá 3 bậc lồng tiếng** — `dubTierOf()` thay `isPremiumVoice`, thêm `dubGCloudPerMin`, đổi mặc định giọng sang Edge, ghi nhận chi phí gcloud thật |
| `bef3713`/`39a08eb` | **Gỡ hẳn tính năng nhân bản giọng**, giữ công cụ Đọc văn bản |
| `952fce3` | **Vá lỗ hổng freemium luồng một chạm** — `worker/lib/trial.ts`, `probe.ts` chặn >5 phút, `translate.ts` truyền cờ `watermark`, `dub.ts` burn watermark |

**Migration**: `0000`→`0005`. Đã chạy `0005` trên prod (xoá `cloned_voices`).
Verify: 107 cột · 5 enum · 24 index · 26 ràng buộc — **khớp**.
**Test**: 114/114 pass. Lệnh trong `CLAUDE.md`.

---

## 4. ĐANG LÀM DỞ — dừng ở đâu, bước tiếp theo

### Xác minh email — code đã viết xong nhưng **ĐANG BỊ REVERT trên main**

Commit gốc `5f308fd`, đã bị `ff12404` revert (lỡ push nhầm khi SMTP còn hỏng, đảo lại ngay).
**Lấy code về**: `git revert --no-edit ff12404` (revert của revert) — KHÔNG phải viết lại từ đầu.

**Đã xong**: toàn bộ code + typecheck + lint + build + 114 test pass.

**Đang chặn**: `GMAIL_*` trên Vercel là chuỗi rỗng (mục 0.2) nên **chưa xác minh được email gửi
tới hay không**. Push mà SMTP hỏng thì khách mới không đăng ký bằng email được (đăng nhập Google
vẫn chạy vì Google đã xác minh sẵn).

**Các bước tiếp theo, đúng thứ tự:**

1. USER sửa 2 env + `vercel --prod --yes`
2. Kiểm SMTP thật (đừng tin giao diện — `/forgot-password` LUÔN hiện "Đã gửi email!"):
   `vercel env pull apps/web/.env.vercel-test --environment production` → viết script nodemailer
   `verify()` + `sendMail()` chạy từ `apps/web` → **xoá file env ngay sau khi chạy**
3. Thư tới được → **đánh dấu 6 tài khoản cũ là đã xác minh** trước khi push, nếu không họ bị khoá
   ngay lần đăng nhập tới mà không tự xác minh lại được:
   `subdubaiglobal@` · `quan@` · `huyen.pth116@` · `test@` (8.930 xu) · `long@` (2.320 xu) · `chris@`
   ```sql
   UPDATE "user" SET email_verified = true WHERE email_verified = false;
   ```
4. `git push origin main`
5. Vá chỗ **nuốt lỗi im lặng**: mailer hỏng mà giao diện vẫn báo thành công chính là lý do không ai
   phát hiện suốt 2 ngày. Nên log lỗi gửi mail + có cảnh báo ở trang Quản trị.

Nếu Gmail vẫn không gửi được → chuyển `lib/email.ts` sang **Resend** (3.000 thư/tháng free, chỉ cần
API key, không cần 2FA/App Password, tin cậy hơn cho gửi tự động).

---

## 5. QUYẾT ĐỊNH quan trọng (BẤT BIẾN — đừng phá)

### Tiền bạc
- **Chống cộng xu trùng bằng RÀNG BUỘC DB** `credit_ledger_ref_uidx UNIQUE (ref_type, ref_id, reason)`.
  `applyCreditDelta` ghi ledger TRƯỚC, đổi số dư SAU; trùng → trả `null`. **Cách DUY NHẤT đổi số dư.**
- **Giá lồng tiếng BA bậc**, tra bằng `dubTierOf(voiceId)` — khai báo đúng một chỗ:
  `basic` Edge 500 xu/phút (chi phí 0) · `hd` Google 1.200 (chi phí ~700) · `premium` Gemini/ElevenLabs
  8.000 (chi phí ~7.000). **Đã sai 3 lần** ở đúng chỗ này (Gemini → ElevenLabs → Google Cloud) —
  thêm nguồn giọng mới mà quên gắn bậc = bán dưới giá vốn, không ai báo động.
- **Giá dịch HAI bậc**, tra bằng `translateTierOf(style)`: `ai` 5 xu/dòng · `machine` 3 xu/dòng.
  ⚠️ **Máy dịch KHÔNG rẻ hơn AI** — Google tính $20/1M ký tự ≈ 13đ/dòng, **đắt hơn Gemini ~9 lần**.
  Nó chỉ rẻ nhờ 500.000 ký tự/tháng miễn phí; worker chặn cứng bằng `hasFreeTranslateQuota()`,
  vượt là tự hạ xuống dịch AI. **Gỡ cái chặn đó = lỗ ngay.**
- **Credit ĐÃ NẠP không bao giờ hết hạn.** Chỉ credit tặng hết hạn 7 ngày với tài khoản chưa nạp.
- **Luồng tiền phải có test** — `packages/shared/src/credits.test.ts` fail nếu giá tụt dưới giá vốn.

### Freemium
- **Tài khoản DÙNG THỬ = chưa từng nạp** (`hasPaidTopup`). Watermark + chặn video >5 phút +
  credit tặng hết hạn 7 ngày. Đã nạp → mở hết.
- **Rào dùng thử đặt ở CẢ HAI TẦNG — web VÀ worker.** Luồng một chạm do worker tự nối job
  (`lib/chain.ts`) nên KHÔNG đi qua route web. Chốt thật: `probe.ts` (chặn >5 phút) + `translate.ts`
  (gắn cờ `watermark`). Thêm bước mới vào pipeline PHẢI hỏi lại `hasPaidTopup` ở worker.
- **Mọi bản xuất của tài khoản dùng thử đều có watermark**, kể cả lồng tiếng không qua render.

### AI
- **Dịch: Gemini là CHÍNH** (đổi 30/07) → hạ Groq khi hết key. Groq miễn phí nhưng bỏ tên nhân vật
  và dùng đại từ hiện đại cho phim cổ trang. Quay lại Groq: `TRANSLATE_PROVIDER=groq`.
- **Giọng mặc định = `edge`** (đổi 30/07, trước là `gcloud`) — Edge là nguồn DUY NHẤT miễn phí thật.
- **STT**: Groq Whisper. **OCR**: chỉ Gemini; chết + có audio → tự fallback STT.

### Hạ tầng / vận hành
- **Job mồ côi tự dọn** (`worker/lib/reconcile.ts`): DB ghi `queued`/`active` mà Redis không giữ →
  dưới 10 phút bỏ qua, 10 phút–2 giờ đẩy lại, quá 2 giờ đánh failed + hoàn xu + hạ trạng thái video.
  Video `uploading` không có job nào sau 6 giờ cũng hạ failed. **Đã xảy ra thật 22/07**: 16 job mất
  khỏi Redis, 11 video treo 3 tuần, giao diện quay 0% vĩnh viễn, không cơ chế nào tự phát hiện.
- **Hạn lưu file = `OUTPUT_RETENTION_DAYS`** trong `packages/shared/src/storage.ts` (hiện 5 ngày) —
  nguồn duy nhất cho rule R2, mọi chuỗi hiển thị, và SQL tính "còn N ngày".
- **Đổi schema DB bằng MIGRATION, KHÔNG `drizzle-kit push`** (`generate` → xem SQL → `migrate`).
- **Enum DB lấy từ `@dichvideo/shared`** (`VIDEO_STATUSES`, `JOB_TYPES`…), không gõ lại.

### Thương hiệu / UI
- **Brand "SubVideo AI"**, màu cam san hô `#ee5631` (KHÔNG đổi). Đơn vị hiển thị = **"xu"** (en: credits).
- **Nhãn nguồn giọng theo thương hiệu mình**, không lộ nhà cung cấp: Google → "SubdubAI",
  Gemini → "Cao cấp", Edge → "Cơ bản", ElevenLabs → "Eleven".
- **i18n**: mỗi component `const T = { vi, en }` + prop `lang`. Sửa một bên là lệch.
- **Công thức tô chữ phụ đề dùng chung** `subtitle-text-style.ts` — chữ mẫu và khung xem trước
  không được lệch, lệch là đánh lừa khách.
- **Con số "1.500+" ở `hero-section.tsx` là tự đặt** (thật: ~12 user) — user quyết GIỮ NGUYÊN.

---

## 6. LỖI / VẤN ĐỀ đã biết, CHƯA xử lý

- 🔴 **R2 lifecycle**: user báo đã tạo 2 rule (`outputs/` xoá 5 ngày + abort multipart không prefix).
  **Chưa kiểm chứng được** — token `.env` object-scoped nên `GetBucketLifecycleConfiguration` trả
  Access Denied. Cách kiểm: sau ~5–6 ngày xem file trong `uploads/` vượt mốc 5 ngày còn không.
- ⚠️ **MẤT DỮ LIỆU 30/07** — rule lifecycle ĐẦU TIÊN đặt sai (không prefix + `Delete objects after
  5 days` → áp cả bucket). Cloudflare quét ngay trong ngày, **69 video mất file nguồn** (64 của tài
  khoản test, 5 của tài khoản khác). R2 không có versioning → không khôi phục được. Phụ đề vẫn còn
  (ở DB). **Bài học: `Delete objects` BẮT BUỘC có prefix `outputs/`.**
- 🟠 **Lồng tiếng chậm**: đo thật render 0,56× thời lượng video (nhanh), **dub 1,32×, cá biệt 5,8×**.
  Đã sửa song song theo số nhân + thêm log từng chặng. **Cần xem log `dub done` sau khi VPS pull**
  để biết chặng nào (tts / ép clip / mux) ăn thời gian rồi mới tối ưu tiếp.
- 🟠 **Vercel Attack Challenge** bật khi bị gọi dồn — poll `/robots.txt` 20s/lần đủ để 403 mọi
  user-agent từ IP đó. Chưa rõ là chặn tạm theo IP hay Attack Challenge Mode bật cả project
  (kiểm ở Vercel → Firewall). Nếu bật thường trực thì crawler ăn 403 → hỏng SEO.
  ⚠️ **Đừng dùng vòng lặp curl để chờ deploy** — dùng `vercel ls` / `vercel inspect`.
- 🟠 Auto-reload Gemini chưa bật — hết credit là Gemini chết ngầm.
- 🟠 Khách `doviettien89@gmail.com` đang **0 xu**, job fail vì thiếu xu.
- 🟡 Google Console có **2 client secret** — nên dọn còn 1, phải đối chiếu env Vercel trước.
- 🟡 Bậc "Dịch nhanh — máy dịch" cần **bật Cloud Translation API** trong Google Cloud Console
  (dùng chung `GOOGLE_TTS_API_KEY` được). Chưa bật thì chỉ bậc đó lỗi.
- 🟡 Chưa có thông tin pháp lý/công ty (NĐ 52/2013) — user chủ động bỏ qua.
- ⚪ Đường dẫn `/voice-clone` + tên file/component vẫn mang chữ "voice-clone" dù đã gỡ nhân bản
  (cố ý giữ để không hỏng bookmark).
- ⚪ Lint 1 warning cố hữu (TanStack Virtual ở `segment-table.tsx`) — vô hại.

---

## 7. VIỆC TIẾP THEO (ưu tiên cao → thấp)

1. 🔴 **USER: `git pull` + `pm2 restart` trên VPS** (mục 0.1) — nhiều bản vá đang nằm chờ.
2. 🔴 **USER: sửa 2 env `GMAIL_*`** (mục 0.2) → rồi hoàn tất luồng xác minh email (mục 4).
3. 🟠 **Kiểm bằng mắt sau khi VPS pull**: dịch lại video cổ trang bằng Gemini xem còn mất tên nhân
   vật không; xuất video có lồng tiếng rồi **gửi log `dub done`** (có thời gian từng chặng).
4. 🟠 **Xác minh R2 lifecycle** sau ~5–6 ngày (mục 6).
5. 🟠 USER: bật auto-reload Gemini; kiểm Vercel Firewall.
6. 🟡 Test freemium end-to-end bằng tài khoản mới chưa nạp (watermark + chặn >5 phút).
7. 🟡 Gemini cao cấp trả phí làm tuỳ chọn riêng (UI chọn model + giá premium) — user muốn.
8. ⚪ Bằng chứng xã hội thật (đánh giá, video khách) — cần user thu thập.

---

## 8. Việc chỉ USER kiểm được (AI không nhìn thấy)

- Thư xác minh / đặt lại mật khẩu có tới hộp thư không (cả Spam).
- Watermark trên video XUẤT RA bằng tài khoản chưa nạp.
- Chất lượng dịch sau khi bật Gemini (so với Google Dịch).
- R2 lifecycle rule đã đúng chưa (dashboard Cloudflare).
- Cảm nhận tốc độ web sau khi chuyển vùng `sin1`.
