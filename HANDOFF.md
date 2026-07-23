# HANDOFF — Dịch Video AI

> Cập nhật: **2026-07-23**. Đọc file này + `CLAUDE.md` + `PROGRESS.md` trước khi làm.
> Bàn giao cho AI/dev tiếp theo — đủ để tiếp tục ngay.

## 0. ĐỌC TRƯỚC TIÊN — web đang KHÔNG xử lý được video

**Upstash Redis đã cạn hạn mức gói free** (`ERR max requests limit exceeded. Limit: 500000`).
Redis từ chối mọi lệnh → không đẩy được job → mọi upload/dịch/lồng tiếng đều chết.
Đây là **hạ tầng, code không cứu được**. User phải nâng gói ở console.upstash.com.

Kiểm tra nhanh: `cd apps/worker && npx tsx --env-file=../../.env scripts/check-queue-health.ts`

## 1. Mục tiêu tổng thể

SaaS **Việt hóa & lồng tiếng video bằng AI** (cạnh tranh gensubai.com). Luồng:
upload/dán link → trích phụ đề (OCR/STT) → dịch văn nói → studio chỉnh sửa → xuất MP4.
Kèm: nhân bản giọng, cộng đồng, nạp xu. **ĐÃ LÊN PRODUCTION và thu tiền thật.**

Giai đoạn hiện tại: **chuẩn bị thương mại hóa** — vá lỗ hổng tiền bạc, gỡ trần hạn mức,
làm giao diện đủ chuyên nghiệp để quảng cáo rộng.

## 2. Hạ tầng (ĐANG CHẠY THẬT)

- **Web**: https://dichvideoai-web.vercel.app — Vercel `dichvideoai-web`, root `apps/web`.
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

## 5. LỖI/VẤN ĐỀ đã biết, CHƯA xử lý

- 🔴 **Upstash Redis cạn hạn mức** — xem mục 0. Web không xử lý được video.
- 🔴 **Gemini vẫn gói free** — 20 lượt/ngày/key/model ≈ **1–2 video/ngày/key**. Đây là trần cứng
  của sản phẩm lõi. Chi phí bật billing rất nhỏ (đo thật: **$0,64/tháng ở 20 video/ngày**,
  **$3,18 ở 100 video/ngày** với 2.5-flash). User chưa bật.
- 🟠 **`migrations/` LỆCH thực tế** — `chat_messages`, `community_*`, `cloned_voices`,
  `videos.target_lang` được đưa lên bằng `drizzle-kit push`, không có file migration.
  **ĐỪNG chạy `drizzle-kit migrate`** — nó sẽ cố tạo lại bảng đã tồn tại và hỏng DB.
  Index unique vừa thêm đã áp bằng script riêng (idempotent).
- 🟠 **Worker nằm trên máy cá nhân** — máy tắt = dịch vụ chết. VPS 4 nhân (~$7–20/tháng) dư sức.
- 🟡 Giá lồng tiếng ElevenLabs đã nâng lên bậc cao cấp (700 xu/phút) nhưng **có thể vẫn lỗ** —
  giá ElevenLabs ~$0,30/1.000 ký tự ≈ 6.500đ/phút thoại. Cần đối chiếu hoá đơn thật.
- 🟡 **Chưa có thông tin pháp lý/công ty** (NĐ 52/2013, 85/2021) — user chủ động bỏ qua.
- 🟡 Chưa có bằng chứng xã hội thật (đánh giá, video khách). Con số "1.500+" là tự đặt.
- 🟡 Nhân bản giọng riêng không chạy — key ElevenLabs free thiếu quyền `create_instant_voice_clone`.
- 🟡 File R2 `outputs/` nói "xoá sau 7 ngày" nhưng **lifecycle rule chưa bật** (token object-scoped).
- ⚪ Lint còn 1 warning cố hữu (TanStack Virtual ở `segment-table.tsx`) — vô hại.

## 6. VIỆC TIẾP THEO (ưu tiên cao → thấp)

1. **USER: nâng Upstash Redis** — web đang chết vì cái này. ~$2–10/tháng.
2. **USER: bật billing Gemini** (AI Studio → Billing, pay-as-you-go, không phí tối thiểu).
   Gỡ trần 1 video/ngày/key với chi phí gần như bằng 0.
3. Chạy 1 tuần, xem **Quản trị → Mức tiêu thụ API** để biết số thật, rồi mới chọn gói.
4. **Chuyển worker sang VPS** (Hetzner/Contabo). Cần dựng: Node, ffmpeg, yt-dlp.
   *(VieNeu/Kokoro đã gỡ nên KHÔNG cần Python/torch nữa — việc này giờ nhẹ hơn nhiều.)*
5. Dựng lại lịch sử migration cho khớp DB thật (gỡ món nợ ở mục 5).
6. Trang liên hệ riêng + bằng chứng xã hội (đánh giá, video kết quả khách thật).
7. Bật lifecycle rule R2 cho `outputs/` (dashboard Cloudflare, prefix `outputs/`, 7 ngày).
8. Đối chiếu hoá đơn ElevenLabs thật → chỉnh lại `dubGeminiPerMin` nếu đang lỗ.

## 7. Việc user cần tự kiểm tra bằng mắt (tôi không kiểm được)

- Bảng công cụ studio **neo cạnh** — mở "Làm mờ"/"Lồng tiếng", xem video còn thấy không.
- **Studio trên điện thoại thật** — nút thao tác đã nâng 18px → 44px.
- **Khối chào người dùng mới** — tạo tài khoản mới để xem.
- Chất lượng 4 nguồn giọng còn lại sau khi gỡ bớt.
