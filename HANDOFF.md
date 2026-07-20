# HANDOFF — Dịch Video AI

> Cập nhật: 2026-07-16. Đọc file này + `PROGRESS.md` trước khi làm việc.
> Bàn giao cho AI/dev tiếp theo — đủ để tiếp tục ngay.

## 1. Mục tiêu tổng thể

SaaS **Việt hóa & lồng tiếng video bằng AI** (cạnh tranh gensubai.com). Luồng chính:
upload/dán link video → trích phụ đề (OCR/STT) → dịch chuẩn văn nói → trình chỉnh sửa
(xem trước, che chữ gốc, kiểu phụ đề, lồng tiếng) → xuất MP4. Ngoài ra: nhân bản/đọc
giọng nói, cộng đồng, nạp xu. **ĐÃ LÊN PRODUCTION và thu tiền được.**

## 2. Hạ tầng (ĐANG CHẠY THẬT)

- **Web**: https://dichvideoai-web.vercel.app — Vercel project `dichvideoai-web`, Root Directory `apps/web`.
- **Repo**: GitHub `anhhoanq99-jpg/dichvideoai`, push `main` → Vercel tự deploy.
- **Worker** (render/lồng tiếng, cần ffmpeg): chạy **trên máy Windows của user qua pm2**
  (`pm2 status`, name `dichvideo-worker`, tự khởi động cùng Windows). User chọn chi phí 0đ thay VPS.
  → **Dev local PHẢI dùng `pnpm dev:web`** (KHÔNG `pnpm dev` — sẽ sinh worker thứ 2 tranh job).
  → Sau khi sửa code worker: `pm2 restart dichvideo-worker`.
- **DB** Neon Postgres, **Redis** Upstash, **R2** Cloudflare (bucket `dichvideo-prod`) — tất cả cloud, không cần Docker.
- **Env prod** = `.env` gốc repo (đã xoay key), đẩy Vercel bằng `vercel env add <K> production --force`
  (đã login CLI). Đổi env xong PHẢI redeploy (`vercel --prod --yes`) mới có tác dụng.
- **Deploy verify**: sau `git push`, chờ ~2.5 phút build; kiểm bằng route công khai (vd `/robots.txt`, `/api/demo/goc`).

## 3. ĐÃ HOÀN THÀNH trong session này (mới → cũ)

| Commit | Nội dung | File chính |
|---|---|---|
| 9b8ffbb | Icon + video hướng dẫn (admin) ở trang upload | `upload-page-client.tsx`, `api/demo/[slot]/route.ts`, `api/admin/demo/route.ts`, `admin-demo-client.tsx` |
| ca961b6 | Màn cảm ơn khi nạp tiền thành công | `credits/topup-panel.tsx` |
| c5fe4ac | Nền dark xám than mềm (#16171c) thay đen tuyền | `app/globals.css` (override `--color-neutral-*` trong `.dark`) |
| 6c54b4e | Chặn kéo ngang mobile (`overflow-x: clip`) + header vừa màn hình | `globals.css`, `(app)/layout.tsx` |
| a591d79 | Admin tự đổi 2 video demo trang chủ; bỏ avatar TMH hero | `api/demo/*`, `api/admin/demo/*`, `(app)/admin/*`, `hero-section.tsx`, `results-section.tsx`, `app-sidebar.tsx` |
| 17f31fb | Voice-clone: hàng trăm giọng free (VoicePicker đầy đủ) + sửa lỗi nhân bản | `voice-clone-client.tsx`, `api/voice-clone/speak`, `lib/tts-web.ts` |
| 51f0231 | Lồng tiếng: tổng hợp giọng SONG SONG (nhanh 5-6x) | `worker/src/processors/dub.ts` (`mapPool`) |
| ad07ec2 | Import: ép tải H.264 (không AV1) — preview không đen; render `-pix_fmt yuv420p` | `worker/src/processors/import.ts`, `render.ts` |
| d8bb659, 2039202 | Giữ đăng nhập 30 ngày; `/login` redirect nếu đã có phiên; ép về 1 domain | `lib/auth.ts`, `login-card.tsx`, `login/page.tsx`, `proxy.ts` |
| 342e069 | Kéo góc đổi cỡ vùng làm mờ + 40 giọng Google (30 Chirp3-HD) | `render-preview.tsx`, `shared/dub-presets.ts` |
| e49b7fc, 2d8be0c | Hiệu ứng phụ đề (fade/pop/reveal/karaoke) + màu nhấn `*từ khóa*` + 6 font mới + 23 ngôn ngữ gốc; fix tiếng gốc iPhone | `shared/ass-builder.ts`, `render-presets.ts`, `subtitle-style-fields.tsx`, `render-preview.tsx`, `lib/source-langs.ts`, `worker/fonts/*` |
| ac66680, 5146438, efc22e0 | Seeding trang chủ (badge + section "Xem kết quả thực tế"); studio preview vừa màn hình | `results-section.tsx`, `hero-section.tsx`, `render-preview.tsx`, `studio-shell.tsx` |
| 48bbfce | Công cụ Nhân bản giọng nói; bỏ 2 mục sidebar ít dùng | `(app)/voice-clone/*`, `api/voice-clone/*`, `app-sidebar.tsx` |
| 2297b68, d5fd2b6 | Chat: diễn đàn Cộng đồng (post+comment) + chat hỗ trợ user↔admin | `(app)/chat/*`, `api/chat/*`, `api/community/*`, `lib/admin.ts` |
| ecf45ce, 27b96fc | Trang "Video đã xuất"; bỏ 2 panel trùng ở trang chi tiết | `(app)/exports/page.tsx` |

**SePay nạp tiền = HOÀN CHỈNH**: code sẵn từ trước (QR VietQR, poll số dư, webhook idempotent,
gói thưởng, màn cảm ơn). Đã cấu hình MB Bank `999628999999` / PHAM ANH HOANG + webhook key,
đã redeploy. Đã verify QR sinh đúng. **User cần tự đăng ký webhook trên sepay.vn** (URL
`/api/webhooks/sepay`, kiểu API Key = `SEPAY_WEBHOOK_KEY`, sự kiện tiền vào) rồi test nạp thật.

## 4. QUYẾT ĐỊNH / CONVENTION quan trọng

- **Màu thương hiệu = CAM SAN HÔ** (`#ee5631`, `--color-primary-*` trong `globals.css`). User đã
  TỪ CHỐI màu xanh veed.io — chỉ mượn bố cục, KHÔNG đổi màu. (memory: brand-color-coral-keep)
- **Đơn vị hiển thị = "xu"** trong mọi chuỗi tiếng Việt (KHÔNG "credits"); bản `en` giữ "credits".
  Xu KHÔNG hết hạn (lợi thế cạnh tranh). Code identifier vẫn `credit*` (creditBalance, estimateJobCredits…).
- **i18n**: mỗi component có `const T = { vi: {...}, en: {...} }`; ngôn ngữ qua cookie `lang`, hàm `getLang()`.
- **Admin** nhận diện qua env `ADMIN_EMAILS` (hiện = `anhhoanq.99@gmail.com`), helper `lib/admin.ts` `isAdminEmail()`.
  Dùng cho: chat hỗ trợ, trang `/admin` (quản lý video demo + video hướng dẫn).
- **Video admin quản lý** (demo trang chủ + hướng dẫn): lưu R2 khe cố định `demo/{slot}.mp4`,
  phục vụ qua `/api/demo/:slot` (redirect R2 presigned, hỗ trợ tua; `?check=1` trả `{exists}`);
  slot: `goc`, `ban-viet` (có file bundled dự phòng trong `public/demo/`), `huong-dan` (không fallback).
- **Giọng nói**: catalog trong `shared/dub-presets.ts` — Edge (322, free), Google Cloud (40, có Chirp3-HD),
  ElevenLabs (14 preset), Gemini (premium). `VoicePicker` (components/dub) là bộ chọn dùng chung.
  Web TTS tổng hợp qua `lib/tts-web.ts`; nghe thử qua `/api/tts-preview`.
- **Render/ASS**: `shared/ass-builder.ts` sinh file .ass; hiệu ứng chữ + màu nhấn `*từ*` xử lý ở đây,
  worker `render.ts` burn bằng ffmpeg libx264 (KHÔNG dùng GPU — đã đo, không nhanh hơn).
- **YouTube tải H.264** (avc1) ưu tiên trong `import.ts` (AV1 không phát trên Safari/iPhone → preview đен).
- **Bẫy môi trường**: hook `scout-block` chặn lệnh shell chứa `node_modules`/`dist`. Lint repo NGHIÊM:
  cấm `setState` đồng bộ trong effect (dùng `setTimeout(0)` hoặc promise callback), cấm reassign biến
  trong render (dùng prefix-sum thay vì `let x += …`). PowerShell pipe here-string vào git commit
  bị hỏng nếu message chứa dấu `"` → viết message KHÔNG có ngoặc kép, hoặc dùng `node spawnSync` input.

## 4b. CHE CHỮ GỐC THEO TỪNG DÒNG (mới)

Video có chữ nước ngoài xuất hiện rải rác → mỗi dòng phụ đề gắn được 1 ô che riêng
(`SubtitleSegment.box`, toạ độ 0..1 hệ video NGUỒN), **chỉ che đúng lúc dòng đó chạy**.
- Worker: `filtergraph.ts` `lineCovers` → `drawbox`/`overlay` kèm `enable='between(t,s,e)'`.
  Chế độ mờ: blur TOÀN khung **1 lần** rồi dán lại từng ô (blur riêng từng ô = N lượt boxblur, rất chậm).
  Trần `MAX_LINE_COVERS = 120`, vượt thì `render.ts` cắt bớt **và ghi log** (không cắt âm thầm).
- Web: nút ô vuông nét đứt ở mỗi dòng trong `segment-table` bật/tắt che; ô cam hiện trên
  `render-preview` khi câu đó chạy, kéo/co giãn được. Bật che lúc `coverMode="none"` → tự bật `blur`
  (nếu không thì ô bị bỏ qua ở cả preview lẫn render — bấm mà không thấy gì).
- **`box` do OCR sinh ra: CHƯA CÓ** — `gemini-video-ocr.ts` không trả toạ độ, nên `hasOnScreenText`
  ở `editor/page.tsx` luôn false. Muốn tự động che thì phải sửa prompt OCR cho Gemini trả bounding box.
- Đã verify: 43 test pass (7 test filtergraph mới) + chạy **ffmpeg thật** 4 tổ hợp (box/blur × keep/9:16).

## 5. LỖI/VẤN ĐỀ đã biết, CHƯA xử lý

- **Nhân bản giọng riêng KHÔNG hoạt động** — key ElevenLabs là gói free, thiếu quyền
  `create_instant_voice_clone`. Đây là giới hạn gói, KHÔNG phải bug. Đã báo user; cần nâng
  ElevenLabs Starter (~5$/tháng) + tạo key có quyền cloning, hoặc dựng model open-source (XTTS…) trên máy worker.
- **Gemini** đã paid tier (`GEMINI_TTS_RPM=60`). **Groq** dùng làm fallback dịch khi Gemini nghẽn.
- Lint còn **1 warning** cố hữu (`segment-table.tsx` — "incompatible library" của TanStack Virtual, vô hại).
- Cảnh báo git "LF will be replaced by CRLF" trên Windows — bình thường, bỏ qua.
- File kết quả R2 nói "tự xóa sau 7 ngày" nhưng **CHƯA có cron dọn thật** — cần job dọn `outputs/` quá 7 ngày.

## 6. VIỆC TIẾP THEO (ưu tiên cao → thấp)

1. **User đăng ký webhook SePay** trên sepay.vn + test nạp thật 10k (mảnh cuối để thu tiền tự động).
2. ~~**Cron dọn R2** file `outputs/` quá 7 ngày~~ → **ĐÃ VIẾT script lifecycle** `apps/worker/scripts/set-r2-lifecycle.ts`
   (Cloudflare tự xóa server-side, không cần cron chạy trên máy user). **CHẶN**: token R2 trong `.env` object-scoped,
   thiếu quyền cấu hình bucket → `Access Denied`. **User cần làm 1 trong 2**: (a) dashboard Cloudflare → R2 → bucket
   `dichvideo-prod` → Settings → Object lifecycle rules → Add: prefix `outputs/` xóa sau 7 ngày + abort multipart dở sau 7 ngày;
   hoặc (b) tạo R2 API token quyền Admin, đặt tạm vào env rồi `cd apps/worker && npx tsx scripts/set-r2-lifecycle.ts`.
3. ~~**Rate-limit** các API công khai~~ → **XONG**. Helper `apps/web/lib/rate-limit.ts` (cửa sổ cố định trên
   Redis Upstash, atomic Lua, **fail-open** khi Redis lỗi). Đã gắn vào: `tts-preview` 30/phút (chỉ khi trượt cache),
   `voice-clone/speak` 15/phút, `srt/translate` 10/phút, `videos/import` 10/phút, `videos` (tạo upload) 20/phút —
   đều theo userId. Trả 429 + `Retry-After`. Đã test thật trên Redis prod (chặn đúng ngưỡng). Đổi hạn mức: sửa số ngay tại route.
4. ~~Trang admin: xem `usage_events` / doanh thu; nút xóa bài/bình luận cộng đồng~~ → **XONG** (`app/(app)/admin/page.tsx`).
   Thêm khối **Doanh thu & chi phí** (tổng nạp = SUM ledger reason=topup; nạp 30 ngày/hôm nay qua SQL `now()`; số người nạp;
   xu đang lưu hành = SUM `user.creditBalance`; chi phí AI = SUM `usage_events.costUsdMicros`; bảng 15 lượt nạp gần đây) +
   khối **Kiểm duyệt cộng đồng** (`admin-moderation-client.tsx`: 25 bài + 25 bình luận mới nhất, nút xóa → `DELETE
   /api/admin/community/posts/:id` và `/comments/:id`, guard `isAdminEmail`, cascade xóa bình luận theo bài). Đã verify query trên DB prod.
5. (Tùy chọn) Nhân bản giọng thật: nâng ElevenLabs hoặc model open-source trên worker.
6. ~~Gom bớt code lặp: `<Dropzone>`, `<Button>`, `<StatusBadge>`~~ → **ĐÃ TẠO primitive** trong `components/ui/`:
   - `dropzone.tsx` — vùng kéo-thả (state dragOver nội bộ). Đã thay ở `extract-client` + `translate-client` (output class y hệt).
   - `status-badge.tsx` — nhãn trạng thái, gom bảng màu 1 chỗ. Đã thay 2 chỗ ở `history/page.tsx` (y hệt).
   - `button.tsx` — Button variant (primary/secondary/ghost/danger) + size (sm/md/lg) + `pill`. Đã thay 2 nút submit y hệt
     ở extract/translate (Button thêm `shadow-sm`+`transition-colors` → khác biệt thị giác rất nhỏ, coi như đồng bộ hóa).
   - **CÒN LẠI ~30 nút** dùng class thô đủ biến thể (radius/size khác nhau) — **CHƯA migrate** vì không QA thị giác từng màn
     được; chuyển dần sang `<Button>` khi sửa từng trang. Đã verify typecheck + lint sạch (0 lỗi, giữ 1 warning cũ).
