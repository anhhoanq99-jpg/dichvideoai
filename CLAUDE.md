# CLAUDE.md — Dịch Video AI (đọc đầu mỗi phiên)

> File này chứa phần **BẤT BIẾN** (stack, convention, cấu trúc, cạm bẫy). Đọc rồi làm luôn.
> **Trạng thái công việc đang dở** nằm ở [HANDOFF.md](HANDOFF.md) + [PROGRESS.md](PROGRESS.md) — đọc kèm.
> Next.js 16 khác training data → khi code trong `apps/web` phải theo [apps/web/AGENTS.md](apps/web/AGENTS.md).

## Sản phẩm
SaaS **Việt hóa & lồng tiếng video bằng AI** (đối thủ gensubai.com). Luồng: upload/dán link
→ trích phụ đề (OCR/STT) → dịch chuẩn văn nói → studio chỉnh sửa/xem trước → xuất MP4.
Kèm: nhân bản/đọc giọng, cộng đồng, nạp xu. **ĐÃ LÊN PRODUCTION và thu tiền được.**

## Cấu trúc (pnpm monorepo)
```
apps/web        Next.js 16 + React 19 + Tailwind v4 + better-auth   (deploy Vercel, root = apps/web)
apps/worker     BullMQ + ffmpeg + tsx  (render/lồng tiếng; chạy pm2 trên máy user, KHÔNG deploy)
packages/shared types, catalog giọng, ass-builder, presets, env schema
packages/db     Drizzle + Postgres (Neon)
```
Hạ tầng cloud, **không cần Docker**: DB = Neon Postgres · Redis = Upstash · Storage = Cloudflare R2 (bucket `dichvideo-prod`).

## Lệnh dev (QUAN TRỌNG)
```bash
pnpm dev:web       # CHỈ web. Dùng cái này khi dev local — worker đã chạy pm2 trên máy.
# pnpm dev         # ĐỪNG DÙNG: sinh worker thứ 2 tranh job với worker pm2 đang chạy thật.
pnpm typecheck     # cả 4 package
pnpm --filter web lint     # 0 lỗi; còn 1 warning cố hữu (TanStack Virtual ở segment-table) — vô hại
pnpm --filter web build
# test: cd apps/worker && npx tsx --test src/lib/*.test.ts ../../packages/shared/src/*.test.ts ../web/lib/*.test.ts
```
Sau khi sửa code worker: `pm2 restart dichvideo-worker`.

## Deploy / hạ tầng
- Web: push `main` → GitHub `anhhoanq99-jpg/dichvideoai` → Vercel `dichvideoai-web` tự build (~2.5 phút).
  Verify sau deploy bằng route công khai (vd `/robots.txt`, `/api/demo/goc`).
- Env prod = `.env` gốc repo. Đổi env Vercel: `vercel env add <K> production --force` rồi `vercel --prod --yes` (redeploy mới có tác dụng).
- Token R2 trong `.env` là **object-scoped** (đọc/ghi file), KHÔNG có quyền admin cấu hình bucket
  (lifecycle/CORS phải làm qua dashboard Cloudflare hoặc token admin riêng).

## Convention BẤT BIẾN
- **Màu thương hiệu = CAM SAN HÔ** `#ee5631` (`--color-primary-*` trong `apps/web/app/globals.css`).
  User đã TỪ CHỐI xanh veed.io — chỉ mượn bố cục, KHÔNG đổi màu. Không dùng hex/indigo/violet/emerald rời — sửa 1 khối token.
- **Đơn vị hiển thị = "xu"** trong mọi chuỗi tiếng Việt (KHÔNG "credits"); bản `en` giữ "credits".
  **Xu KHÔNG hết hạn** (lợi thế cạnh tranh — đừng làm gói hết hạn). Code identifier vẫn `credit*` (creditBalance…). 1 credit = 1 VND.
- **i18n**: mỗi component `const T = { vi:{…}, en:{…} }` + prop `lang?: Lang = "vi"`; ngôn ngữ qua cookie `lang`,
  `getLang()` trong `apps/web/lib/i18n.ts`. Trang client tách: page server mỏng `await getLang()` + `*-client.tsx`.
- **Admin**: nhận diện qua env `ADMIN_EMAILS`, helper `apps/web/lib/admin.ts` `isAdminEmail()`. Dùng cho chat hỗ trợ + trang `/admin`.
- **Giọng nói**: catalog `packages/shared/src/dub-presets.ts` — Edge (322, free) · Google Cloud (40, có Chirp3-HD)
  · ElevenLabs (14 premade) · Gemini (premium). Prefix id: `gcloud:` `eleven:` `gemini:`; validate `isValidVoiceId()`.
  Nhãn hiển thị đặt theo THƯƠNG HIỆU MÌNH, không lộ tên nhà cung cấp (Google → "SubdubAI", v.v.).
  **Mặc định = `edge`** (đổi 30/07/2026, trước là `gcloud`): Edge là nguồn DUY NHẤT miễn phí thật,
  còn Google chỉ free 1tr ký tự/tháng rồi tính $30/1M (~700đ/phút thoại) — để nó làm mặc định là
  dồn toàn bộ chi phí đó vào bậc giá rẻ nhất. Hết hạn mức Google → job tự hạ xuống Edge (`edgeFallbackVoice()`).
- **Giá lồng tiếng có BA bậc**, tra bằng `dubTierOf(voiceId)` — khai báo đúng một chỗ, đừng chép lại:
  `basic` Edge 500 xu/phút (chi phí 0) · `hd` Google 1.200 (chi phí ~700) · `premium` Gemini/ElevenLabs
  8.000 (chi phí ~7.000). Thêm nguồn giọng mới mà quên gắn bậc = bán dưới giá vốn, không ai báo động.
  ĐÃ GỠ (23/07/2026, chất lượng kém + không dùng được): VieNeu, Kokoro, Viettel AI, FPT.AI —
  cùng service Python `services/tts-local`. Dữ liệu usage_events cũ vẫn còn nhãn của chúng.
- **Render/ASS**: `packages/shared/src/ass-builder.ts` sinh .ass (hiệu ứng chữ + màu nhấn `*từ*`); worker `render.ts`
  burn bằng ffmpeg libx264 (KHÔNG GPU — đã đo, không nhanh hơn).
- **Import link**: YouTube ưu tiên tải H.264/avc1 (`import.ts`) — AV1 không phát Safari/iPhone → preview đen.
- **File kết quả R2**: key `outputs/{userId}/{videoId}/{jobId}.mp4` — tự xóa sau 7 ngày (lifecycle rule; xem HANDOFF việc tiếp theo).
- **Đổi schema DB đi bằng MIGRATION, KHÔNG `drizzle-kit push`**:
  `pnpm --filter @dichvideo/db generate` → xem file SQL → `… migrate`. Lịch sử đã được dựng lại
  khớp DB thật (baseline `0002_drift_baseline.sql`, đã kiểm chứng dựng đúng prod từ con số 0);
  `push` là thứ làm lệch lần trước. Kiểm tra bất cứ lúc nào: `pnpm --filter @dichvideo/db db:drift`
  và `… db:verify-migrations` (dựng DB tạm rồi so với prod, tự dọn).
- **Rate-limit API**: dùng chung `apps/web/lib/rate-limit.ts` — `rateLimit(bucket, callerId(req, userId), limit, windowSec)`
  + `tooManyRequests()`. Redis Upstash, fail-open. Route tốn tiền/băng thông mới cần gắn (TTS/dịch/import/upload đã gắn).
- **UI primitive dùng chung** trong `apps/web/components/ui/`: `Button` (variant primary/secondary/ghost/danger + size sm/md/lg
  + `pill`), `Dropzone` (kéo-thả file), `StatusBadge` (nhãn trạng thái job/video), `form-styles.ts` (selectClass/inputClass…).
  Code mới ưu tiên dùng các primitive này thay vì viết lại chuỗi class (ghép class riêng qua `cn()` — có tailwind-merge).

## Nguồn AI & fallback
- **Dịch**: **Gemini là CHÍNH** (đổi lại 30/07/2026) → tự hạ **Groq Llama 3.3 70B** khi hết sạch key.
  Groq miễn phí nhưng dịch Trung/Nhật→Việt kém rõ: bỏ tên nhân vật, dùng đại từ hiện đại cho phim
  cổ trang. Chi phí Gemini đã ổn từ khi tắt token thinking (~44đ/video 30 dòng, thu 150 xu).
  Quay lại Groq: `TRANSLATE_PROVIDER=groq`.
- **Phong cách `google` = máy dịch** (Google Cloud Translation), rẽ nhánh sớm trong `translateSegments`,
  bỏ qua tóm tắt ngữ cảnh + trau chuốt. ⚠️ Máy dịch **KHÔNG rẻ hơn AI**: $20/1M ký tự ≈ 13đ/dòng,
  đắt hơn Gemini ~9 lần. Nó chỉ rẻ nhờ **500.000 ký tự/tháng miễn phí** — worker chặn cứng trong
  hạn mức đó (`hasFreeTranslateQuota`), vượt là tự hạ xuống dịch AI. Gỡ cái chặn đó = lỗ ngay.
- **STT**: Groq Whisper (free). **OCR**: chỉ Gemini; chết + có audio → tự fallback STT (`extract.ts`).
- Lỗi Gemini phân loại ở `gemini-limits.ts` (daily-quota / billing-depleted → UnrecoverableError, fail nhanh, không retry).

## Cạm bẫy (đừng dẫm lại)
- Hook `scout-block.ps1` chặn mọi lệnh shell chứa `node_modules|dist|build` → dùng Read/Glob thay Bash cho path đó.
- Lint react-hooks NGHIÊM: cấm `setState` đồng bộ trong effect (dùng lazy init / derive / `setTimeout(0)`);
  cấm đọc ref hoặc reassign biến trong render (dùng prefix-sum, ResizeObserver/onloadedmetadata).
- PowerShell 5.1: không `&&`; here-string pipe vào `git commit` HỎNG nếu message chứa `"` →
  viết commit message KHÔNG ngoặc kép. Cảnh báo "LF will be replaced by CRLF" trên Windows = bình thường.
- Chỉ chạy **MỘT** worker (pm2). Nhiều worker song song = tranh job + lỗi khó hiểu (vd yt-dlp exit 3221225794).
