# HANDOFF — Dịch Video AI

> Cập nhật: **2026-07-27**. Đọc file này + `CLAUDE.md` + `PROGRESS.md` trước khi làm.
> Bàn giao cho AI/dev tiếp theo — đủ để tiếp tục ngay.

## 0. ĐỌC TRƯỚC TIÊN — 3 nút thắt hạ tầng ĐÃ GỠ (27/07/2026)

Phiên 27/07 đã xử xong cả 3 chặn cứng của phiên trước:
- ✅ **Upstash Redis** đã nâng **pay-as-you-go** (trước cạn hạn free 500k → web chết). Đã test lại OK.
- ✅ **Gemini** đã bật **billing pay-as-you-go** (credit đ300.000, auto-reload user chưa bật — nhắc).
  Trần 20 lượt/ngày/key không còn.
- ✅ **Worker đã chuyển sang VPS** `103.249.201.118` (Windows Server 2022, 3 nhân/6GB, hãng trumvps).
  Chạy pm2 `dichvideo-worker` (`node --import tsx src/index.ts`), tự sống lại sau reboot bằng
  Scheduled Task `pm2-resurrect`. Worker máy cá nhân đã `pm2 stop` (giữ làm đường lùi, chưa xoá).
  Chi tiết dựng: `apps/worker/DEPLOY-VPS-WINDOWS.md`.

Kiểm tra queue bất cứ lúc nào: `cd apps/worker && npx tsx --env-file=../../.env scripts/check-queue-health.ts`

**⚠️ Nếu ĐỔI mật khẩu Administrator VPS** (mật khẩu `Q8SSi7wt` đã lộ qua ảnh chat) → phải chạy lại
Scheduled Task với mật khẩu mới, nếu không reboot worker sẽ không tự lên:
`schtasks /Create /TN "pm2-resurrect" /TR "C:\tools\pm2-resurrect.cmd" /SC ONSTART /RU Administrator /RP * /RL HIGHEST /F`

## 1. Mục tiêu tổng thể

SaaS **Việt hóa & lồng tiếng video bằng AI** (cạnh tranh gensubai.com). Luồng:
upload/dán link → trích phụ đề (OCR/STT) → dịch văn nói → studio chỉnh sửa → xuất MP4.
Kèm: nhân bản giọng, cộng đồng, nạp xu. **ĐÃ LÊN PRODUCTION và thu tiền thật.**

Giai đoạn hiện tại: **chuẩn bị thương mại hóa** — vá lỗ hổng tiền bạc, gỡ trần hạn mức,
làm giao diện đủ chuyên nghiệp để quảng cáo rộng.

## 2. Hạ tầng (ĐANG CHẠY THẬT)

- **Web**: https://subvideoai.com — Vercel `dichvideoai-web`, root `apps/web`.
- **Repo**: GitHub `anhhoanq99-jpg/dichvideoai`, push `main` → Vercel tự deploy (~2.5 phút).
- **Worker**: pm2 `dichvideo-worker` trên máy Windows của user. Dev local dùng `pnpm dev:web`
  (KHÔNG `pnpm dev`). Sửa code worker xong: `pm2 restart dichvideo-worker`.
- **DB** Neon · **Redis** Upstash · **R2** Cloudflare (`dichvideo-prod`).
- Env prod = `.env` gốc repo. Đổi env Vercel phải redeploy mới có tác dụng.

Quy mô thật (đo 2026-07-23): **7 user · 103 video · 4,4 video/ngày · 2 lượt nạp (320.000 xu)**.
Mỗi video ≈ 125 giây CPU worker → máy rảnh 99,4% thời gian. **Tốc độ xử lý KHÔNG phải nút thắt** —
nút thắt là hạn mức API và việc worker nằm trên máy cá nhân.

## 3. ĐÃ HOÀN THÀNH session này (mới → cũ)

| Commit | Nội dung | File chính |
|---|---|---|
| `7c79539` | **Trang liên hệ `/lien-he`** — Zalo + form nhắn thẳng admin | `app/(marketing)/lien-he/page.tsx` (mới), `marketing/support-message-form.tsx` (mới), `site-footer.tsx`, `app/sitemap.ts` |
| `da2c514` | **Dựng lại lịch sử migration khớp DB thật** — hết món nợ `drizzle-kit push` | `db/migrations/0002_drift_baseline.sql` (mới), `db/scripts/` (4 script mới), `db/package.json`, `db/tsconfig.json` |
| `b971bf8` | **Gỡ bỏ VieNeu, Kokoro, Viettel AI, FPT.AI** (chất lượng kém, không có key) | `shared/dub-presets.ts`, `worker/lib/tts.ts`, `worker/lib/usage.ts`, `worker/processors/dub.ts`, `web/lib/tts-web.ts`, `api/tts-preview`, `voice-picker.tsx`, xoá `services/tts-local/`, `.venv-tts` |
| `04f2d4f` | Trang Quản trị chia **4 tab** | `admin/admin-tabs.tsx` (mới), `admin/page.tsx` |
| `628d2f3` | **Bảng theo dõi tiêu thụ API** + cảnh báo sắp chạm trần | `admin/admin-usage-panel.tsx` (mới) |
| `32b1491` | **Tìm ra gốc rễ lỗi upload** = Redis cạn; giảm ~12× lệnh Redis worker đốt lúc rảnh | `worker/src/index.ts` (`drainDelay` 5s→60s), `web/lib/queue.ts` (timeout 8s), `api/videos/[id]/complete` |
| `0160178` | Không nuốt lỗi thật sau "Unexpected end of JSON input" | `web/lib/http-json.ts` + `.test.ts` (mới, 7 test), `hooks/use-multipart-upload.ts`, `api/videos/route.ts`, `link-import-card.tsx` |
| `25c4099` | Báo thiếu xu TRƯỚC khi xuất; sửa giá giọng trả phí; chặn farm tài khoản; onboarding | `lib/api-helpers.ts` (`requireCredits`), `export-modal.tsx`, `shared/dub-presets.ts` (`isPremiumVoice`), `api/auth/[...all]/route.ts`, `videos/upload/page.tsx`, `upload-page-client.tsx` |
| `c261840` | Video kẹt "processing"; studio trên điện thoại; tương phản nút tiền đạt WCAG AA | `worker/src/index.ts`, `studio-shell.tsx`, `segment-table.tsx`, `ui/button.tsx`, `login-card.tsx`, `web/scripts/check-contrast.ts` |
| `9f3e7bb` | Bảng công cụ studio **neo cạnh** (không che video); thêm Zalo hỗ trợ | `ui/modal.tsx` (`dock`), `shared/src/support.ts` (mới), `site-footer.tsx`, `topup-panel.tsx` |
| `b119a9f` | **Vá 2 lỗ hổng tiền bạc** + job báo thất bại sai | `packages/db/src/credits.ts`, `db/schema/app.ts` (unique index), `api/webhooks/sepay`, `api/voice-clone/speak`, `worker/src/index.ts`, `app/error.tsx` + `not-found.tsx` (mới) |

**Script chẩn đoán mới** (`apps/worker/scripts/`, chạy bằng `npx tsx --env-file=../../.env`):
`check-queue-health.ts` · `check-capacity.ts` · `check-cost-projection.ts` · `check-money-fixes.ts` ·
`check-ledger-dups.ts` · `add-ledger-unique-index.ts` · `check-usage-query.ts` · `check-removed-voices.ts` ·
`check-edge-fallback.ts`. Bên web: `check-pricing.ts`, `check-contrast.ts`, `check-default-voice.ts`.

**Script DB/migration** (`packages/db/scripts/`, chạy qua pnpm script — có sẵn `tsx` + `pg`):
```bash
pnpm --filter @dichvideo/db db:drift              # bảng/cột/enum/index thật + lịch sử migration đã ghi nhận
pnpm --filter @dichvideo/db db:constraints        # tên khoá ngoại thật
pnpm --filter @dichvideo/db db:dryrun             # chạy thử 0002 trên prod rồi ROLLBACK (chứng minh idempotent)
pnpm --filter @dichvideo/db db:verify-migrations  # dựng DB tạm từ 0 rồi so với prod, xong tự xoá
```

## 4. QUYẾT ĐỊNH quan trọng session này

- **Chống cộng xu trùng bằng RÀNG BUỘC DB**, không bằng SELECT trước giao dịch.
  Index `credit_ledger_ref_uidx UNIQUE (ref_type, ref_id, reason)` + `onConflictDoNothing`.
  `reason` PHẢI nằm trong khoá — một job ghi cả `job_charge` lẫn `job_refund` dưới cùng
  `(ref_type='job', ref_id=jobId)`; thiếu nó là **chặn mất hoàn xu**.
  Trong `applyCreditDelta`: ghi ledger TRƯỚC, đổi số dư SAU; trùng thì trả `null`.
- **Một nguồn sự thật cho phân loại giọng** (`shared/dub-presets.ts`):
  `isPremiumVoice()` (gemini + eleven → giá cao cấp) và `hasWideTtsQuota()` (edge + gcloud →
  được đọc văn bản tuỳ ý miễn phí). Trước đây định nghĩa bị chép ở 4 nơi và lệch nhau.
- **Job chưa hết lượt retry thì KHÔNG ghi `status='failed'`** — web coi `failed` là kết thúc,
  SSE đóng, studio dừng theo dõi. Ghi sớm = khách thấy "thất bại" trong khi job sắp xong.
- **Giọng mặc định = `gcloud`** (SubdubAI/Chirp3-HD). Hết hạn mức Google → **cả job** hạ xuống
  Edge (`edgeFallbackVoice`), quyết định MỘT LẦN trước khi sinh câu nào để video không lẫn 2 giọng.
- **Nhãn nguồn giọng theo thương hiệu mình**, không lộ nhà cung cấp: Google → "SubdubAI",
  Gemini → "Cao cấp", Edge → "Cơ bản", ElevenLabs → "Eleven".
- **Modal studio có chế độ `dock`**: từ `lg` neo mép phải, bỏ nền mờ, click xuyên qua để vẫn
  xem/tua video. Dùng `hidden` (không bỏ khỏi cây React) để giữ trạng thái khi đổi tab.
- **Tương phản**: chữ nhỏ trên nền thương hiệu dùng `primary-700`/`success-700` (≥4.5:1).
  KHÔNG đổi bảng màu — `primary-600` đo được 4,41:1, vẫn trượt chuẩn.
- **Trang Quản trị**: nội dung do server render, truyền vào `AdminTabs` (client) làm children —
  giữ mọi truy vấn DB phía máy chủ.
- **Migration baseline `0002` phải IDEMPOTENT** (`IF NOT EXISTS` + `DO $$ … EXCEPTION WHEN
  duplicate_object $$`). Nó mô tả những thứ ĐÃ CÓ SẴN trên prod (do `drizzle-kit push` đưa lên),
  nên vừa phải chạy được như no-op trên prod, vừa phải dựng đúng trên DB trống. Đừng sửa nó về
  dạng thường. **Từ 0003 trở đi viết bình thường** — lịch sử đã sạch.
- **Trang liên hệ KHÔNG dựng bảng `contact_submissions` riêng** — form POST thẳng vào
  `/api/chat` `room="support"`, tức cùng hộp thư với trang Chat. Hai chỗ nhận tin nhắn mà
  admin chỉ nhớ một chỗ là kiểu bỏ sót khách đã trả tiền.
- **Kiểm chứng bằng DB thật, không bằng mắt**: `db:dryrun` (chạy thật rồi ROLLBACK) chứng minh
  không nổ trên prod; `db:verify-migrations` dựng DB tạm từ con số 0 rồi so từng cột/enum/index/
  ràng buộc với prod. Đã chạy: **112 cột · 5 enum · 26 index · 28 ràng buộc — khớp tuyệt đối.**

## 5. LỖI/VẤN ĐỀ đã biết, CHƯA xử lý

- ✅ ~~Upstash Redis cạn~~ · ~~Gemini gói free~~ · ~~Worker trên máy cá nhân~~ — **ĐÃ XỬ (mục 0)**.
- 🟠 **Auto-reload Gemini chưa bật** — credit đ300.000 dùng lâu nhưng hết là Gemini chết âm thầm.
  User cần bấm `Set up auto reload` ở AI Studio → Billing.
- 🟠 **VPS 3 nhân, ffmpeg render đa luồng** — giữ `concurrency: 2` (đừng tăng ở 3 nhân). Đông
  khách thì nâng VPS nhiều nhân rồi mới tăng concurrency, hoặc thêm worker thứ 2 (cùng code).
- ✅ ~~Giá lồng tiếng ElevenLabs lỗ~~ — **ĐÃ nâng 700 → 8.000 xu/phút** (28/07, giá thật ~6.500đ/phút).
- ✅ ~~Chi phí Gemini cao~~ — **ĐÃ chuyển Groq làm chính (miễn phí) + tắt token thinking** (28/07).
  Gốc rễ: token "thinking" của `gemini-3-flash-preview` không được đếm. Gemini giờ chỉ dự phòng.
- 🟠 **đ18.771 credit Gemini bị trừ 27/07 CHƯA rõ nguồn** — user nói không test AI Studio; key worker
  lại ở gói FREE (hit 20/day). Cần user xem lịch sử giao dịch ở console Google để truy nguồn.
- 🟠 **Khoá tài khoản có cửa sổ ~5 phút** — better-auth cache phiên 5 phút; layout `(app)` truy vấn
  `banned_at` tươi mỗi lần tải trang nên chặn ngay ở full-load, nhưng điều hướng client-side trong
  app có thể trễ tới 5 phút. Chấp nhận được; muốn tức thì tuyệt đối thì thêm hook better-auth chặn tạo phiên.
- 🟡 **Chưa có thông tin pháp lý/công ty** (NĐ 52/2013, 85/2021) — user chủ động bỏ qua.
- 🟡 Chưa có bằng chứng xã hội thật (đánh giá, video khách). Con số "1.500+" ở
  `hero-section.tsx` là tự đặt (số thật: 7 user · 103 video) — **user đã quyết GIỮ NGUYÊN
  (23/07/2026), đừng tự sửa**. Rủi ro đã báo: Luật Quảng cáo + mất niềm tin nếu khách phát hiện.
- 🟡 Nhân bản giọng riêng không chạy — key ElevenLabs free thiếu quyền `create_instant_voice_clone`.
- 🟡 File R2 `outputs/` nói "xoá sau 7 ngày" nhưng **lifecycle rule chưa bật** (token object-scoped).
- ⚪ Lint còn 1 warning cố hữu (TanStack Virtual ở `segment-table.tsx`) — vô hại.

## 6. VIỆC TIẾP THEO (ưu tiên cao → thấp)

0. ⚠️ **CHƯA PUSH** — có ~9 commit local (migration, /lien-he, docs VPS, ecosystem, bảng tiêu thụ
   API cập nhật). Push `main` → Vercel deploy web (trang liên hệ + bảng Quản trị mới chỉ hiện SAU
   khi deploy). An toàn: không đụng luồng xử lý video.
1. ~~USER: nâng Upstash Redis~~ · ~~bật billing Gemini~~ · ~~chuyển worker sang VPS~~ — **XONG (27/07)**.
2. **USER: bật auto-reload Gemini** (AI Studio → Billing → Set up auto reload) — kẻo hết credit chết ngầm.
3. Chạy 1 tuần, xem **Quản trị → Mức tiêu thụ API** để biết số thật.
4. ~~Dựng lại lịch sử migration~~ — **XONG** (`0002_drift_baseline.sql`).
5. ~~Trang liên hệ riêng~~ — **XONG** (`/lien-he`). Còn lại: bằng chứng xã hội thật
   (đánh giá, video kết quả khách) — cần user thu thập, tôi không bịa được.
6. Bật lifecycle rule R2 cho `outputs/` (dashboard Cloudflare, prefix `outputs/`, 7 ngày).
7. Đối chiếu hoá đơn ElevenLabs thật → chỉnh lại `dubGeminiPerMin` nếu đang lỗ.

## 7. Việc user cần tự kiểm tra bằng mắt (tôi không kiểm được)

- Bảng công cụ studio **neo cạnh** — mở "Làm mờ"/"Lồng tiếng", xem video còn thấy không.
- **Studio trên điện thoại thật** — nút thao tác đã nâng 18px → 44px.
- **Khối chào người dùng mới** — tạo tài khoản mới để xem.
- Chất lượng 4 nguồn giọng còn lại sau khi gỡ bớt.
- **Trang `/lien-he` khi ĐÃ đăng nhập**: gõ tin rồi bấm "Gửi cho admin" → phải hiện xác nhận
  xanh và tin nhắn xuất hiện trong `/chat` tab Hỗ trợ. *(Tôi đã kiểm được nhánh chưa đăng nhập,
  render VI/EN, link footer, sitemap; nhánh gửi thật cần một phiên đăng nhập.)*
