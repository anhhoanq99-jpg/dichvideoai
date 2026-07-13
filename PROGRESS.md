# PROGRESS.md — Trạng thái dự án (cập nhật 13/07/2026)

> File bàn giao giữa các phiên làm việc. Đọc file này + `git log` là nắm được toàn bộ.
> ⚠️ **108 file đang thay đổi CHƯA COMMIT** (commit gần nhất: `6b66c89`). Việc đầu tiên
> của phiên mới nên là review + commit theo nhóm tính năng.

## Dự án là gì

SaaS Việt hóa video bằng AI (cạnh tranh gensubai.com): upload video → tự trích phụ đề
(OCR/STT) → dịch → studio chỉnh sửa/xem trước → xuất video (render phụ đề + che chữ +
logo + lồng tiếng). Tính phí theo credits (1 credit = 1 VND), nạp qua Sepay VietQR.

**Stack**: pnpm monorepo — `apps/web` (Next.js 16.2.10 + React 19 + Tailwind v4 +
better-auth), `apps/worker` (BullMQ + ffmpeg + tsx), `packages/shared`, `packages/db`
(Drizzle + Postgres). DB = Neon cloud, Redis = Upstash cloud → **không cần Docker**.

## Chạy dev

```bash
pnpm dev          # web :3000 + worker :8787 (đọc .env ở root)
pnpm typecheck    # cả 4 package
pnpm --filter web lint    # 0 lỗi; 1 warning cố hữu (TanStack Virtual trong segment-table)
pnpm --filter web build
# test (node:test qua tsx): cd apps/worker && npx tsx --test src/lib/*.test.ts ../../packages/shared/src/*.test.ts  → 23 pass
```

`.env` (root, dùng chung web+worker): DATABASE_URL (Neon), REDIS_URL (Upstash),
GEMINI_API_KEY (**đã HẾT TIỀN trả trước** — mọi call Gemini fail), GROQ_API_KEY (sống),
ELEVENLABS_API_KEY (sống, chỉ quyền TTS), GOOGLE_TTS_API_KEY (sống, đã test),
SEPAY_* (SEPAY_ACCOUNT_NAME đang trống — điền tên chủ TK để hiện ở trang Nạp tiền).
⚠️ User đã dán các key vào chat — nên khuyên regenerate khi tiện.

## Luồng sản phẩm chính (kiểu gensubai)

Upload (1 video) → `/videos/[id]/editor`:
1. **ProcessingView** (`components/studio/processing-view.tsx`) — poll 2.5s, hiện bước
   + %; xong bước dịch tự chuyển sang…
2. **StudioShell** (`components/studio/studio-shell.tsx`, file lớn nhất ~1000 dòng) —
   preview video chạy phụ đề thật (RenderPreview) + bảng phụ đề gốc/dịch
   (SegmentTable, thêm/xóa dòng) + toolbar 7 nút mở modal: Dịch AI / Làm mờ (mức
   blur 1-10) / Phụ Đề / Logo (chữ HOẶC ảnh upload R2, kéo-thả vị trí + resize góc
   trên preview, fx/fy tự do) / Lồng Tiếng (4 nguồn giọng + 4 thanh âm lượng + ước
   tính phí) / Cài đặt đã lưu (StudioPreset v2: settings+dub, tự áp lần sau,
   localStorage) / **Xuất File** (ExportModal: render → nếu bật dub thì worker tự
   chain job dub lên bản đã render qua `finish` param; credits chỉ trừ ở đây).
3. **RenderPreview** (`components/render/render-preview.tsx`) — mô phỏng CSS: blur
   backdrop-filter, phụ đề đúng font (Google Fonts inject), kéo phụ đề/vùng che/logo,
   **nghe thử lồng tiếng theo từng câu** (TTS per-line qua `/api/tts-preview?text=`,
   chỉ Edge+GCloud; playbackRate ép khớp khe thoại; duck tiếng gốc theo câu).

Upload nhiều video → `/videos`; auto-finish (render+dub không preview) vẫn còn trong
mục "Nâng cao" của trang upload, mặc định TẮT.

**Nhập video từ link (mới 13/07)**: dán link Douyin/Kuaishou/Bilibili/TikTok/YouTube…
(~1.800 trang qua yt-dlp) ở TRANG UPLOAD (landing chỉ hướng dẫn tự tải: Cốc Cốc /
nút chia sẻ trong app / công cụ online — user bỏ ô dán link ở landing 13/07)
→ job `import` (miễn phí, `processors/import.ts`) tải
video về R2 rồi chain probe y như upload tay. Danh mục nguồn: `shared/video-sources.ts`.
Worker cần binary yt-dlp: Windows dev đặt `YTDLP_PATH` trong .env (đã cài qua winget),
VPS thêm `yt-dlp` vào lệnh apt (đã cập nhật launch-checklist). Đã test e2e thật
(YouTube 19s): import → probe → uploaded, đúng title/kích thước/độ phân giải.
Link Douyin dạng search/khám phá (`?modal_id=`) được tự chuẩn hóa về `/video/<id>`
(`normalizeImportUrl`). **Douyin cần cookie** (giới hạn yt-dlp upstream): xuất
cookies.txt từ trình duyệt → đặt `YTDLP_COOKIES=<path>`; chưa có cookie thì job fail
với hướng dẫn tiếng Việt. Lỗi `yt-dlp exit 3221225794` từng gặp = nhiều worker zombie
chạy song song code cũ — đã dọn; chỉ chạy MỘT worker (`pnpm dev`).

**Đã gỡ (13/07 theo yêu cầu user)**: mục "Nâng cao: hoàn thiện tự động" ở trang upload
(UI + autoRender/autoDub trong UploadPipelineValues). Backend `finish` chain vẫn còn
(ExportModal trong studio dùng). Landing: section Nguồn video đặt ngay sau Hero.

## Nguồn AI & fallback (quyết định quan trọng)

| Việc | Nguồn | Ghi chú |
|---|---|---|
| Dịch | Gemini → **tự fallback Groq Llama 3.3 70B** khi Gemini lỗi BẤT KỲ (hết lượt ngày/hết tiền) | `apps/worker/src/lib/translate.ts` hàm `generate()`; Groq trả `{"lines":[...]}` json_object |
| STT | Groq Whisper (free) | |
| OCR | CHỈ Gemini; nếu chết + video có audio → **tự fallback sang STT** (`processors/extract.ts`) | không audio → UnrecoverableError tiếng Việt |
| TTS | Edge (322, free) · **GCloud 8 giọng Việt** (key user, đã test) · **ElevenLabs 14 giọng** (đã test TỪNG giọng — chỉ 14 premade sống trên gói free, list trong `packages/shared/src/dub-presets.ts`) · Gemini premium (chết vì hết tiền) | id tiền tố: `gcloud:`, `eleven:`, `gemini:`; validate bằng `isValidVoiceId()` |
| Giá | Edge/GCloud/Eleven = 500 credits/phút (giọng thường), Gemini = 700 | premiumVoice chỉ gemini |

Lỗi Gemini phân loại trong `gemini-limits.ts`: `isDailyQuotaError`, `isBillingDepletedError`
→ UnrecoverableError fail nhanh (không retry 5×60s).

## Giao diện / UX (quyết định)

- **Bộ màu token** trong `apps/web/app/globals.css` `@theme`: `primary` (cam san hô
  ~#ee5631, cảm hứng dichvideo.com), `accent` (tím, AI), `success` (xanh ngọc),
  `cinema` (nền tối landing). **KHÔNG dùng indigo/violet/emerald/mã hex nữa** — sửa
  màu chỉ sửa 1 khối token.
- **Đã fix bug**: thiếu `@custom-variant dark` (Tailwind v4) → toggle dark/light trước
  đây không ăn theo class next-themes. Giờ OK, transition màu 0.18s toàn cục,
  focus-visible ring cam, button active scale .97, prefers-reduced-motion.
- Landing KHÔNG dùng framer-motion (đã gỡ dep) — animation CSS + IntersectionObserver
  (`components/marketing/reveal.tsx`).
- **Logo thương hiệu**: `components/brand-logo.tsx` (SVG play + sóng âm + vạch sub,
  gradient primary→accent), bấm về `/`. Nút quay lại: `components/back-button.tsx`
  trong app header.
- Toast: `components/ui/toaster.tsx` (`useToast()`), Modal chuẩn a11y (ESC, dialog,
  focus) `components/ui/modal.tsx`.
- Mobile: sidebar ẩn `lg:`-, drawer `MobileNav` (components/app-sidebar.tsx).
- **i18n VI/EN 100%**: cookie `lang` (`lib/i18n.ts` `getLang()`), switcher
  `components/lang-switcher.tsx`; pattern: mỗi component dict `const T = {vi,en}` +
  prop `lang?: Lang = "vi"`; server page `await getLang()` truyền xuống. Trang client
  ("use client") tách thành page server mỏng + `*-client.tsx`.
- Trang Nạp tiền kiểu gensubai (`components/credits/topup-panel.tsx`): tab
  VietQR/PayPal(sắp ra mắt), QR + poll số dư 5s (`/api/credits/balance`) → toast khi
  tiền vào, 6 Gói Thưởng (KHÔNG làm "Gói Tốc chiến" hết hạn — **chính sách: credits
  không hết hạn** là lợi thế cạnh tranh).
- **Đăng nhập**: đã bật email+password (better-auth `emailAndPassword`) vì Google
  OAuth fail trên điện thoại/LAN IP; UI tab Google|Email trong
  `components/auth/login-card.tsx`; credits tặng qua hook user.create (mọi cách đăng ký).

## Kiến trúc web đáng nhớ

- API helpers: `apps/web/lib/api-helpers.ts` (`requireOwnVideo`, `parseJsonBody`,
  `findVideoTrack`, `createPipelineJob`, `jsonError`) — mọi route dùng.
- Job client: `hooks/use-job-runner.ts` (start/SSE/refresh) + `components/jobs/job-ui.tsx`.
- Render settings: `components/render/render-settings.ts` (RenderSettings, có
  blurStrength, logoType/logoImageKey/logoScale/logoFx/logoFy).
- Worker: `translation-style-prompts.ts` (prompt 12 phong cách), `buildOriginalVolumeFilter`
  trong dub.ts (duck giọng gốc theo câu bằng volume expression), filtergraph hỗ trợ
  logo ảnh (input [1:v] overlay) + fx/fy tự do + blurStrength.
- Upload logo ảnh: `POST /api/logo-upload` → R2 `logos/{userId}/…` (render route
  kiểm tra prefix chủ sở hữu).
- `GET /api/videos/[id]` trả thêm `latestJob` (ProcessingView + ExportModal poll).

## Việc nên làm tiếp (backlog)

1. **Commit 108 file** theo nhóm (refactor/cleanup, studio flow, voices, i18n, UI).
2. Regenerate các API key đã lộ trong chat; điền SEPAY_ACCOUNT_NAME.
3. Test end-to-end 1 video thật sau đợt i18n lớn (3 agent dịch song song — typecheck/
   lint/build sạch nhưng chưa bấm tay từng màn).
4. Xoay vòng nhiều key Gemini free cho OCR (user quan tâm); hoặc nạp tiền key Gemini.
5. Nice-to-have đã hứa/nhắc: thumbnail thật cho danh sách video; re-presign URL logo
  ảnh trong preset (hết hạn 1h); PayPal; MiniMax TTS khi user mua key; test coverage
  cho web; rate-limit API; CI.
6. Điểm review codebase lần trước: 8/10 — thiếu test web, worker processors còn lặp
   preamble load video/track.

## Bẫy đã gặp (đừng dẫm lại)

- Hook `scout-block.ps1` chặn mọi lệnh shell chứa "node_modules|dist|build" — dùng
  tool Read/Glob thay vì Bash cho các path đó. Đọc docs Next trong
  `apps/web/node_modules/next/dist/docs/**/*.md` bằng Read (AGENTS.md yêu cầu đọc
  docs vì Next 16 khác training data; lucide-react đã được Next tự optimize).
- Lint react-hooks nghiêm: cấm setState sync trong effect (dùng lazy init / derive /
  setTimeout), cấm đọc ref trong render (đưa vào state qua ResizeObserver/loadedmetadata).
- PowerShell 5.1: không `&&`; sed trên Windows OK qua Git Bash tool.
- Edge/GCloud bake tốc độ đọc khi tổng hợp; Gemini/Eleven phải ép bằng atempo
  (`speedBaked` trong dub.ts).
