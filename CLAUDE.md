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
# test: cd apps/worker && npx tsx --test src/lib/*.test.ts ../../packages/shared/src/*.test.ts
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
  · ElevenLabs (14 premade) · Gemini (premium) · Viettel/FPT (key riêng) · **VieNeu (14) + Kokoro (14) chạy TẠI CHỖ**.
  Prefix id: `gcloud:` `eleven:` `gemini:` `viettel:` `fpt:` `vieneu:` `kokoro:`; validate `isValidVoiceId()`.
- **Giọng chạy tại chỗ (VieNeu/Kokoro)**: service Python riêng `services/tts-local` — pm2 **`dichvideo-tts`**
  (tiến trình thứ 2, cạnh `dichvideo-worker`), nghe ở `127.0.0.1:8123`, venv `.venv-tts` (KHÔNG commit).
  Miễn phí, không key, không hạn mức — nhưng chỉ sống khi service chạy trên CÙNG máy với worker.
  Chỉ **v3-turbo** chạy local được (48kHz); VieNeu v2 cần LMDeploy server nên KHÔNG dùng.
  Id giọng VieNeu dùng **slug ascii** (`vieneu:minh-duc`), service tự đổi ra tên thật có dấu — tên thật
  ("Minh Đức") đi qua URL/JSON/shell là vỡ. Catalog + bảng map do `scripts/tts-gen-catalog.py` sinh từ
  chính engine, chạy lại khi đổi giọng — ĐỪNG sửa tay một bên.
  Kokoro bake được `speed`, VieNeu KHÔNG (không có tham số) → xem `speedBakedFor` trong `dub.ts`.
  **Nghe thử** không tổng hợp trực tiếp được (Vercel không gọi tới máy user) → dùng mẫu sinh sẵn trên R2
  `voice-samples/{voiceId}.wav`, tạo bằng `apps/worker/scripts/upload-local-voice-samples.ts`.
  `VoicePicker` (components/dub) là bộ chọn dùng chung; nghe thử qua `/api/tts-preview`.
- **Render/ASS**: `packages/shared/src/ass-builder.ts` sinh .ass (hiệu ứng chữ + màu nhấn `*từ*`); worker `render.ts`
  burn bằng ffmpeg libx264 (KHÔNG GPU — đã đo, không nhanh hơn).
- **Import link**: YouTube ưu tiên tải H.264/avc1 (`import.ts`) — AV1 không phát Safari/iPhone → preview đen.
- **File kết quả R2**: key `outputs/{userId}/{videoId}/{jobId}.mp4` — tự xóa sau 7 ngày (lifecycle rule; xem HANDOFF việc tiếp theo).
- **Rate-limit API**: dùng chung `apps/web/lib/rate-limit.ts` — `rateLimit(bucket, callerId(req, userId), limit, windowSec)`
  + `tooManyRequests()`. Redis Upstash, fail-open. Route tốn tiền/băng thông mới cần gắn (TTS/dịch/import/upload đã gắn).
- **UI primitive dùng chung** trong `apps/web/components/ui/`: `Button` (variant primary/secondary/ghost/danger + size sm/md/lg
  + `pill`), `Dropzone` (kéo-thả file), `StatusBadge` (nhãn trạng thái job/video), `form-styles.ts` (selectClass/inputClass…).
  Code mới ưu tiên dùng các primitive này thay vì viết lại chuỗi class (ghép class riêng qua `cn()` — có tailwind-merge).

## Nguồn AI & fallback
- **Dịch**: Gemini → tự fallback **Groq Llama 3.3 70B** khi Gemini lỗi bất kỳ (`apps/worker/src/lib/translate.ts`).
- **STT**: Groq Whisper (free). **OCR**: chỉ Gemini; chết + có audio → tự fallback STT (`extract.ts`).
- Lỗi Gemini phân loại ở `gemini-limits.ts` (daily-quota / billing-depleted → UnrecoverableError, fail nhanh, không retry).

## Cạm bẫy (đừng dẫm lại)
- Hook `scout-block.ps1` chặn mọi lệnh shell chứa `node_modules|dist|build` → dùng Read/Glob thay Bash cho path đó.
- Lint react-hooks NGHIÊM: cấm `setState` đồng bộ trong effect (dùng lazy init / derive / `setTimeout(0)`);
  cấm đọc ref hoặc reassign biến trong render (dùng prefix-sum, ResizeObserver/onloadedmetadata).
- PowerShell 5.1: không `&&`; here-string pipe vào `git commit` HỎNG nếu message chứa `"` →
  viết commit message KHÔNG ngoặc kép. Cảnh báo "LF will be replaced by CRLF" trên Windows = bình thường.
- Chỉ chạy **MỘT** worker (pm2). Nhiều worker song song = tranh job + lỗi khó hiểu (vd yt-dlp exit 3221225794).
