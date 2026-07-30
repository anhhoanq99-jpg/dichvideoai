# HANDOFF — SubVideo AI (Việt hóa & lồng tiếng video AI)

> Cập nhật: **2026-07-29**. Đọc file này + `CLAUDE.md` + `apps/web/AGENTS.md` trước khi làm.
> Đủ để AI/dev mới tiếp tục ngay.

## 0. ĐỌC TRƯỚC TIÊN — việc CỦA USER đang dở (chặn tính năng)

Code đã push + deploy, nhưng đang chờ **user** làm mấy cấu hình hạ tầng:

1. ✅ **XONG 29/07 — CORS R2 cho subvideoai.com.** Đã kiểm chứng thật (không phải suy đoán):
   presign PUT rồi gửi kèm `Origin: https://subvideoai.com` → 200, có `ETag`, có
   `Access-Control-Expose-Headers: ETag`. 4 origin được phép: apex, `www`, `dichvideoai-web.vercel.app`,
   `http://localhost:3000`; domain lạ vẫn 403. ⚠️ `ExposeHeaders: ["ETag"]` là BẮT BUỘC —
   `use-multipart-upload.ts` đọc ETag mỗi part; thiếu nó thì preflight vẫn 204 nhưng upload chết với
   "Thiếu ETag trong phản hồi R2" (trông y hệt lỗi CORS, rất dễ chẩn nhầm).
2. ✅ **XONG 29/07 — Google OAuth callback.** Đã thêm origin `https://subvideoai.com` +
   `https://www.subvideoai.com` và redirect URI `https://subvideoai.com/api/auth/callback/google`.
   Chỉ cần 1 redirect URI cho apex: `www` bị `proxy.ts` 308 về apex TRƯỚC khi chạm route auth, và
   `BETTER_AUTH_URL=https://subvideoai.com` nên better-auth luôn gửi redirect_uri của apex.
   Dòng `vercel.app` cũ giữ lại làm bảo hiểm cutover (đã là code chết, không phải rủi ro bảo mật).
   ⚠️ Google Console đang có **2 client secret** (`****IMTJ` 9/7, `****GUas` 14/7) — nên dọn còn 1,
   nhưng phải đối chiếu với env Vercel trước, xoá nhầm là chết đăng nhập Google.
3. 🔴 **Worker VPS chưa cập nhật code mới** — watermark render + Groq-primary + giá mới nằm ở worker.
   **Nâng lên ĐỎ**: bản vá lỗ hổng freemium (mục 3, commit mới nhất) nằm PHẦN LỚN ở worker —
   không `git pull` thì tài khoản dùng thử vẫn xuất được video SẠCH, không watermark, không giới hạn 5 phút.
   Trên VPS chạy: `cd $env:USERPROFILE\dichvideoai; git pull; pm2 restart dichvideo-worker`.
4. 🟡 **Quên mật khẩu — chờ xác nhận email tới.** Đã thêm env `GMAIL_USER` + `GMAIL_APP_PASSWORD`
   (Gmail SMTP, App Password) trên Vercel + redeploy. Endpoint test trả 200. User cần kiểm hộp thư
   `anhhoanq.99@gmail.com` (cả Spam) xem mail "Đặt lại mật khẩu" tới chưa. Không tới → đổi sang **Resend**.

## 1. Mục tiêu tổng thể

SaaS **Việt hóa & lồng tiếng video bằng AI** (đối thủ gensubai.com). Luồng: upload/dán link →
trích phụ đề (OCR/STT) → dịch văn nói → studio chỉnh sửa → xuất MP4 (kèm lồng tiếng). **ĐÃ LÊN
PRODUCTION, thu tiền thật.** Giai đoạn: **thương mại hóa** — vừa dựng xong hệ thống freemium
(tài khoản dùng thử bị giới hạn, nạp tiền mở khoá) + đổi brand + domain riêng để quảng cáo rộng.

## 2. Hạ tầng (ĐANG CHẠY THẬT)

- ⚡ **VÙNG CHẠY = `sin1` (Singapore)** — đặt ở `apps/web/vercel.json`. TRƯỚC ĐÂY không có file này
  nên Vercel dùng mặc định `iad1` (Washington DC) trong khi DB Neon ở `ap-southeast-1`: mỗi truy vấn
  là một vòng Mỹ↔Singapore ~200ms. Đo thật từ VN: TTFB `/login` **669ms → 160ms** (nhanh ~4 lần).
  ⚠️ `preferredRegion` của Next KHÔNG dùng được — trên Vercel nó chỉ ăn khi `runtime = 'edge'`,
  mà app cần Node runtime (`pg`, `aws-sdk`). Kiểm vùng thật bằng `vercel inspect <url>` → xem `[sin1]`.
- **Web**: https://subvideoai.com (Cloudflare Registrar, DNS Cloudflare CNAME → Vercel, DNS-only).
  Vercel project `dichvideoai-web`, root `apps/web`. `vercel.app` + `www` → 308 redirect về apex
  (`apps/web/proxy.ts` `CANONICAL_HOST`). Env `BETTER_AUTH_URL` + `NEXT_PUBLIC_SITE_URL` = domain mới.
- **Repo**: GitHub `anhhoanq99-jpg/dichvideoai`, push `main` → Vercel auto-deploy (~2.5 phút).
- **Worker**: pm2 `dichvideo-worker` trên **VPS Windows Server 2022** `103.249.201.118` (trumvps,
  3 nhân/6GB). Chạy `node --import tsx src/index.ts`, `concurrency: 2`. Tự sống lại sau reboot bằng
  Scheduled Task `pm2-resurrect` (chạy `C:\tools\pm2-resurrect.cmd` lúc startup). ffmpeg+yt-dlp ở
  `C:\tools\bin` (`FFMPEG_DIR`/`YTDLP_PATH` trong `.env` VPS). Dựng lại: `apps/worker/DEPLOY-VPS-WINDOWS.md`.
  ⚠️ Đổi mật khẩu VPS (`Q8SSi7wt` đã lộ) thì phải tạo lại Scheduled Task với mật khẩu mới.
- **DB** Neon Postgres 18 · **Redis** Upstash (pay-as-you-go) · **R2** Cloudflare (`dichvideo-prod`).
- **Gemini** đã bật billing pay-as-you-go (auto-reload user chưa bật). Groq (free) là provider dịch CHÍNH.
- Env prod trên Vercel (đổi bằng `vercel env add/rm ... production` rồi redeploy). `.env` gốc repo = dev.

## 3. ĐÃ HOÀN THÀNH session này (mới → cũ, commit hash)

| Commit | Nội dung |
|---|---|
| (mới) | **VÁ LỖ HỔNG FREEMIUM — luồng một chạm thoát rào hoàn toàn.** Rà soát end-to-end phát hiện: web chỉ chặn ở route `/extract` + `/render`, nhưng luồng CHÍNH (upload & nhập link → probe → trích xuất → dịch → render) do **worker tự nối job** nên KHÔNG đi qua hai route đó → khách chưa nạp xuất video sạch, dài bao nhiêu cũng được. Sửa: hằng số trial dời sang `packages/shared/src/trial.ts` (web + worker dùng chung), `worker/lib/trial.ts` `hasPaidTopup`, `probe.ts` chặn >5 phút ngay khi biết thời lượng, `translate.ts` truyền `watermark` vào job render/dub nối tiếp, `dub.ts` burn watermark khi lồng tiếng thẳng trên video gốc, route `/api/videos/[id]/dub` thêm rào trial. +4 test filtergraph |
| `20c97cc` | **Quên mật khẩu**: `lib/email.ts` (Gmail SMTP nodemailer) + better-auth `sendResetPassword` + trang `/forgot-password` `/reset-password` + link ở login-card. Client dùng `requestPasswordReset`/`resetPassword` (better-auth 1.6) |
| `87fd07b` | **Cutover domain subvideoai.com**: `proxy.ts` CANONICAL_HOST + env BETTER_AUTH_URL/NEXT_PUBLIC_SITE_URL |
| `46b0713` | **Trial: credit tặng hết hạn 7 ngày** — migration `0004` (enum `trial_expired`), `lib/trial.ts` `resolveSpendableBalance` (kết toán idempotent, không sống lại khi nạp), `requireCredits`, balance API, trang credits |
| `48e9032` | **Trial: watermark preview + banner** — editor page tính `isTrial`, StudioShell overlay + banner, upload page banner |
| `de32dcb` | **Trial: chặn video >5 phút + watermark render** — `lib/trial.ts` `hasPaidTopup`, route extract/render 403, `filtergraph.ts` `trialWatermarkFontFile` burn "SubVideo AI" |
| `c3aa3a9` | **Đổi brand "SubVideo AI" + tagline "Dịch & lồng tiếng video AI"** — `lib/site.ts` SITE_NAME, `brand-logo.tsx` (prop `tagline`, `BRAND_TAGLINE{vi,en}`), header/footer/sidebar bật tagline, đổi 14 chỗ "Dịch Video AI" |
| `deccc3e` | **Admin khoá/mở tài khoản** — migration `0003` (`user.banned_at`), route `/api/admin/users/:id/ban` (xoá phiên khi khoá), layout `(app)` chặn banned, login page nhận diện banned tránh loop, nút Khoá/Mở ở Users tab |
| `30df756` | **Admin cộng/trừ xu thủ công** — route `/api/admin/users/:id/credits` (applyCreditDelta reason=admin_adjust), `admin-users-client.tsx` (modal Sửa xu) |
| `6742a92` | **Promo nạp thử 50k tặng 20k lần đầu** — `shared/credits.ts` `FIRST_TOPUP_PROMO`/`topupCredits`/`firstTopupPack`, webhook sepay cộng bonus lần đầu, banner ở topup-panel |
| `8fe8f7a` | **Nâng giá lồng tiếng ElevenLabs 700→8.000 xu/phút** (`dubGeminiPerMin`, giá thật ~6.500đ) |
| `e353e11` | **Chi phí Gemini: Groq làm chính (miễn phí) + tắt token thinking** — `translate.ts` (provider mặc định groq, `thinkingConfig:{thinkingBudget:0}`, đếm `thoughtsTokenCount`), OCR extractor tắt thinking |
| `9e59fc8` | **Admin tab "Người dùng"** (danh sách + thống kê, chỉ xem ban đầu) |
| `5424407`/`1b14541`/`11d82f4` | **Studio: bảng công cụ neo dưới nút + hết "giật load"** — `ui/modal.tsx` (ModalAnchorContext, position fixed dưới nút, bỏ animation), nạp trước chunk modal |
| `2e102a0` | Thêm email liên hệ `subdubaiglobal@gmail.com` vào `/lien-he` (`shared/support.ts`) |
| `519cc6f` | **Fix giọng lồng tiếng đọc quá nhanh** — `translate.ts` `charBudget` (ngân sách ký tự theo thời lượng, TARGET_CPS=15), `dub-timing.ts` hạ trần atempo 4×→1.5× |
| `dd13326` | Bảng Quản trị tiêu thụ API phản ánh Gemini/Redis đã trả phí |
| (đầu session) | `da2c514` dựng lại migration baseline `0002` · `7c79539` trang `/lien-he` |

**Migration hiện tại**: `0000`→`0004`. Chuỗi đã verify dựng lại đúng prod (113 cột · 5 enum ·
26 index · 28 ràng buộc). Script: `pnpm --filter @dichvideo/db db:verify-migrations` / `db:drift`.

## 4. QUYẾT ĐỊNH quan trọng (BẤT BIẾN — đừng phá)

- **Tài khoản DÙNG THỬ = chưa từng nạp tiền** (`lib/trial.ts` `hasPaidTopup` = có dòng ledger
  reason `topup` chưa). Khi dùng thử: watermark "SubVideo AI" (render + preview), chặn video >5 phút
  (`TRIAL_MAX_VIDEO_SEC=300`), credit tặng hết hạn 7 ngày. **Đã nạp → mở hết.**
- **Rào dùng thử phải đặt ở CẢ HAI TẦNG — web VÀ worker.** Route web (`/extract`, `/render`, `/dub`)
  chỉ gác cửa khi user bấm từng bước; luồng một chạm thì **worker tự nối job** (`lib/chain.ts`) nên
  không đi qua route nào. Chốt chặn thật: `probe.ts` (chặn >5 phút, chỗ đầu tiên biết thời lượng) +
  `translate.ts` (gắn cờ `watermark` vào job render/dub nối tiếp). Thêm bước mới vào pipeline thì
  PHẢI hỏi lại `hasPaidTopup` ở worker, đừng tin cờ do web gửi.
- **Mọi bản xuất của tài khoản dùng thử đều phải có watermark**, kể cả lồng tiếng không qua render —
  `dub.ts` khi đó mất `-c:v copy`, phải mã hoá lại (chậm hơn, chỉ khách chưa nạp chịu). Lồng tiếng
  nối SAU render thì nguồn đã có watermark sẵn (`sourceR2Key`) → không vẽ chồng.
- **Credit ĐÃ NẠP không bao giờ hết hạn** (lợi thế cạnh tranh). CHỈ credit tặng (signup) hết hạn 7
  ngày với tài khoản chưa nạp. `resolveSpendableBalance` kết toán idempotent qua unique
  `(ref_type='trial', ref_id=userId, reason='trial_expired')` → credit đã trừ KHÔNG sống lại khi nạp sau.
- **Dịch: Groq (Llama, MIỄN PHÍ) là CHÍNH, Gemini chỉ dự phòng khi Groq hết hạn ngày.** Gốc rễ chi
  phí Gemini cao = token "thinking" của model suy luận không được đếm. Đã tắt `thinkingBudget:0`.
  Muốn Gemini cao cấp trả phí thì làm tuỳ chọn riêng sau (user muốn hướng này nhưng CHƯA làm UI chọn).
- **Chống cộng xu trùng bằng RÀNG BUỘC DB** (`credit_ledger_ref_uidx UNIQUE (ref_type, ref_id, reason)`).
  `reason` PHẢI trong khoá (một job ghi cả `job_charge` lẫn `job_refund`). `applyCreditDelta`: ghi
  ledger TRƯỚC, đổi số dư SAU; trùng → trả `null`. **Đây là cách DUY NHẤT đổi số dư.**
- **Đổi schema DB bằng MIGRATION, KHÔNG `drizzle-kit push`** (`generate` → xem SQL → `migrate`).
  Từ `0003` viết bình thường (lịch sử đã sạch). `0002` baseline phải giữ IDEMPOTENT.
- **Brand = "SubVideo AI"** (viết hoa giữa, có khoảng trắng). Tagline `BRAND_TAGLINE` (i18n) luôn đi
  kèm logo ở landing/footer/sidebar. Màu thương hiệu cam san hô `#ee5631` (KHÔNG đổi).
- **Đơn vị hiển thị = "xu"** (bản en giữ "credits"). 1 credit = 1 VND. Code identifier vẫn `credit*`.
- **Nhãn nguồn giọng theo thương hiệu mình**: Google → "SubdubAI" (⚠️ lệch brand mới, user CHƯA quyết
  đổi thành "SubVideo AI" — hỏi trước khi đổi), Gemini → "Cao cấp", Edge → "Cơ bản", ElevenLabs → "Eleven".
- **Giọng mặc định = `gcloud`** (Chirp3-HD). Hết hạn Google → cả job hạ Edge (`edgeFallbackVoice`), 1 lần.
- **Ngân sách ký tự khi dịch** (`translate.ts` `charBudget`, TARGET_CPS=15): dịch cô đọng để lồng
  tiếng không bị ép đọc nhanh + phụ đề không đỏ. Trần atempo lồng tiếng = 1.5× (`dub-timing.ts`).
- **Modal studio neo dưới nút vừa bấm** (`ui/modal.tsx` ModalAnchorContext, `dock`), hiện tức thì
  không animation (tránh "giật"), nạp trước chunk. Vẫn click xuyên qua để xem/tua video.
- **Khoá tài khoản**: layout `(app)` truy vấn `banned_at` TƯƠI mỗi lần tải trang (better-auth cache
  phiên 5 phút). Login page nhận diện banned để KHÔNG đẩy vào app (tránh loop redirect với layout).
- **Quên mật khẩu qua Gmail SMTP** (`lib/email.ts`, env `GMAIL_USER`/`GMAIL_APP_PASSWORD`). better-auth
  1.6 client method là `requestPasswordReset` (KHÔNG phải `forgetPassword`).
- **Trang liên hệ KHÔNG dựng bảng riêng** — form POST vào `/api/chat` room="support" (cùng hộp Chat).

## 5. LỖI/VẤN ĐỀ đã biết, CHƯA xử lý

- 🟠 **Auto-reload Gemini chưa bật** — hết credit là Gemini (dự phòng) chết ngầm. User bấm ở AI Studio → Billing.
- 🟠 **đ18.771 credit Gemini bị trừ 27/07 chưa rõ nguồn** — key worker ở gói free (hit 20/day), user nói
  không test AI Studio. Cần user xem lịch sử giao dịch console Google.
- 🟡 **Gemini cao cấp trả phí (tuỳ chọn khách chọn) CHƯA làm** — user muốn có, cần UI chọn model +
  giá premium ở khâu dịch/retranslate.
- 🟡 Nhãn giọng "SubdubAI" lệch brand "SubVideo AI" — chờ user quyết có đổi không.
- 🟡 Con số "1.500+" ở `hero-section.tsx` là tự đặt (thật: 7 user) — **user quyết GIỮ NGUYÊN, đừng sửa.**
- ⚠️ **MẤT DỮ LIỆU 30/07: lifecycle rule đầu tiên đặt SAI đã xoá file nguồn.** Rule tạo ban đầu
  không có prefix nhưng bật `Delete objects after 5 days` → áp cho CẢ BUCKET, không riêng `outputs/`.
  Cloudflare quét ngay trong ngày, xoá sạch `uploads/` cũ hơn 5 ngày: **69 video mất file nguồn**
  (64 của tài khoản test `anhhoanq.99`, 5 của tài khoản khác) — không xuất lại được, R2 không có
  versioning nên không khôi phục được. **Phụ đề vẫn còn** (nằm ở DB, không phải R2) nên khách vẫn
  tải được SRT/VTT. Rule đã sửa lại thành 2 rule tách bạch. Bài học: hành động `Delete objects`
  BẮT BUỘC phải có prefix `outputs/`; rule không prefix chỉ được giữ `Abort incomplete multipart`.
- 🔴 **R2 lifecycle CHƯA bật — web đang hứa xoá sau 5 ngày nhưng thực tế file nằm lại vĩnh viễn.**
  Đã thử `apps/worker/scripts/set-r2-lifecycle.ts` → **Access Denied** (token `.env` object-scoped,
  đúng như ghi ở mục 2). Phải làm TAY ở dashboard Cloudflare → R2 → bucket `dichvideo-prod` →
  Settings → Object lifecycle rules → Add rule:
  • Prefix `outputs/` → Delete objects sau **5 ngày**
  • Abort incomplete multipart uploads sau **5 ngày** (phần upload dở vẫn tính tiền lưu trữ)
  Số ngày lấy từ `OUTPUT_RETENTION_DAYS` trong `packages/shared/src/storage.ts` — đổi ở đó thì
  phải sửa rule trên dashboard cho khớp, nếu không web hứa một đằng file xoá một nẻo.
- 🟡 Nhân bản giọng riêng không chạy — key ElevenLabs free thiếu quyền `create_instant_voice_clone`.
- 🟡 Chưa có thông tin pháp lý/công ty (NĐ 52/2013) — user chủ động bỏ qua.
- 🟠 **Vercel Attack Challenge bật lên khi bị gọi dồn** — poll `/robots.txt` 20s/lần đã đủ khiến
  Vercel trả 403 kèm `X-Vercel-Mitigated: challenge` cho MỌI user-agent từ IP đó (kể cả giả Googlebot).
  Trình duyệt thật vượt qua tự động bằng JS. **Chưa xác minh được** đây là chặn tạm theo IP (tự hết)
  hay Attack Challenge Mode bật sẵn cho cả project — kiểm ở Vercel → project `dichvideoai` → Firewall.
  Nếu bật thường trực thì crawler lấy `robots.txt`/`sitemap.xml` sẽ ăn 403 → hỏng SEO.
  ⚠️ Đừng dùng vòng lặp curl để chờ deploy; dùng `vercel ls` / `vercel inspect` ở `apps/web`.
- ⚪ Tên project Vercel thật là **`dichvideoai`** (scope `wc-s-projects5`), không phải `dichvideoai-web`
  như ghi ở mục 2 — `vercel ls dichvideoai-web` sẽ báo project_not_found. Alias production gồm
  `subvideoai.com`, `www`, `dichvideoai-web.vercel.app`.
- ⚪ Lint 1 warning cố hữu (TanStack Virtual ở `segment-table.tsx`) — vô hại.

## 6. VIỆC TIẾP THEO (ưu tiên cao → thấp)

1. ✅ CORS R2 (mục 0.1) — xong + đã kiểm chứng. ✅ Google OAuth (mục 0.2) — xong.
2. 🔴 **USER: cập nhật worker VPS** (mục 0.3) — GẤP NHẤT hiện tại, bản vá freemium nằm ở đó.
   + **xác nhận email quên MK** (mục 0.4).
3. **USER: bật auto-reload Gemini.**
4. ✅ Rà soát freemium ở tầng code XONG (tìm ra + vá lỗ hổng luồng một chạm, xem mục 3).
   ⏳ **Còn lại phần phải nhìn bằng mắt, làm SAU khi cập nhật worker VPS**: tạo tài khoản mới →
   upload <5ph → thấy watermark+banner → xuất ra MP4 có watermark giữa khung; upload >5ph → job probe
   fail với thông báo "vượt giới hạn 5 phút". (Test hết hạn 7 ngày: chỉnh tạm `TRIAL_CREDITS_EXPIRE_DAYS`.)
5. (Nếu email Gmail không tới) đổi `lib/email.ts` sang **Resend** (API key, xác minh domain Cloudflare).
6. Làm **Gemini cao cấp trả phí** tuỳ chọn (UI chọn model + giá premium) — user muốn.
7. Bật lifecycle R2 `outputs/` 7 ngày; đối chiếu hoá đơn ElevenLabs thật.
8. Bằng chứng xã hội thật (đánh giá, video khách) — cần user thu thập.

## 7. Việc user tự kiểm bằng mắt (tôi không kiểm được)

- Upload thật trên subvideoai.com SAU khi thêm CORS.
- Nút "Đăng nhập với Google" SAU khi thêm OAuth URI.
- Email "Đặt lại mật khẩu" có tới hộp thư không (cả Spam).
- Watermark trên video XUẤT RA (sau khi cập nhật VPS) — tài khoản chưa nạp.
- Tagline + tên "SubVideo AI" hiển thị ở landing/header/footer đã ưng chưa.
