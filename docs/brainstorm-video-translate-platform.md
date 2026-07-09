# Brainstorm Report — Nền tảng Dịch & Lồng tiếng Video AI (cạnh tranh GenSubAI)

> Ngày: 2026-07-09 · Trạng thái: Đã chốt hướng đi, chờ approve Phase 1

## 1. Problem Statement

Xây SaaS thương mại thị trường VN, cùng phân khúc gensubai.com. Tính năng lõi (ưu tiên số 1 theo yêu cầu):

1. Input: upload video HOẶC dán link video nước ngoài
2. Tự động trích xuất phụ đề (OCR hardsub / STT từ audio)
3. Dịch AI sang tiếng Việt
4. Che mờ / xóa phụ đề gốc, ghép phụ đề Việt vào video
5. Lồng tiếng Việt AI (TTS) thay/đè audio gốc
6. Sau đó mở rộng dần thành full platform (credits, thanh toán, admin, affiliate, blog)

UI: dark + light mode, đẹp hơn đối thủ (chuẩn Linear/Vercel-style).

**KHÔNG copy y chang GenSubAI**: không dùng logo/tên/nội dung/asset của họ (vi phạm bản quyền + không thể copy backend). Xây bản gốc với chức năng tương đương, thiết kế riêng.

## 2. Phân tích đối thủ (từ bundle JS gensubai.com)

- SPA React (Vite) + backend riêng, Cloudflare
- Engine dịch/OCR: **Gemini 2.5 Flash (rẻ/nhanh) + Gemini 3 Pro (trả phí)** → OCR video của họ nhiều khả năng là Gemini video understanding, không phải OCR engine tự dựng
- STT: ~20-30 credits/phút; OCR: ~50 credits/phút; xóa logo +200 credits → định giá theo phút
- TTS: Edge TTS (miễn phí) + giọng premium; có batch dubbing, affiliate dubbing (AI viết kịch bản review)
- Monetization: credits, nạp qua chuyển khoản tự động (kiểu SePay), Google login, trial giới hạn phút
- Có: glossary, phong cách dịch, đồng nhất tên nhân vật, editor phụ đề, blur sub gốc, burn sub mới

## 3. Kiến trúc đề xuất

```
[Next.js app (landing + dashboard)]
        │ REST/SSE
[API server (Node/NestJS hoặc Next API + tách dần)]
        │
[Postgres]  [Redis + BullMQ queue]  [R2/S3 storage]
        │
[Worker(s): FFmpeg + yt-dlp + gọi AI APIs]
        │
[Gemini API (OCR video + dịch)] [Groq/Deepgram Whisper (STT)] [Edge TTS / Azure / ElevenLabs (lồng tiếng)]
```

Nguyên tắc: **API-first, không tự host GPU ở giai đoạn đầu** (KISS). Chỉ cân nhắc GPU (faster-whisper, video inpainting) khi volume đủ lớn để rẻ hơn API.

### Pipeline xử lý 1 video (job trong queue)

1. **Ingest**: upload trực tiếp (presigned URL lên R2) hoặc yt-dlp tải từ link
2. **Extract**:
   - Có audio nói → STT (Whisper qua Groq — rất rẻ) ra SRT + timestamps
   - Hardsub trên hình → Gemini video: prompt trích phụ đề + timestamps ra SRT
   - Cho user chọn phương thức (như đối thủ) + auto-detect gợi ý
3. **Translate**: Gemini Flash/Pro (hoặc Claude Haiku) — dịch theo batch có ngữ cảnh, glossary, đồng nhất xưng hô/tên nhân vật
4. **Editor**: user duyệt/sửa SRT trước khi render (bước này giữ chân user + giảm khiếu nại chất lượng)
5. **Render video** (FFmpeg):
   - Che sub gốc: boxblur/delogo vùng sub, hoặc crop, hoặc đè nền + sub mới chồng lên (MVP). Inpainting AI (ProPainter) để sau — GPU đắt
   - Burn sub Việt: libass với style ASS (font/màu/vị trí tùy chỉnh)
6. **Dubbing**: TTS từng câu theo timestamps → time-stretch khớp thời lượng → duck/mute audio gốc → mix bằng FFmpeg
7. **Deliver**: link tải từ R2, retention 5-7 ngày, trừ credits

## 4. Tech stack

| Lớp | Chọn | Lý do |
|---|---|---|
| Frontend | Next.js 16 + TS + Tailwind 4 + Framer Motion (đã setup) | Sẵn có, SEO tốt cho landing |
| UI kit | shadcn/ui + next-themes (dark/light) | Nhanh, đẹp, accessible |
| Auth | better-auth (Google login) | Đơn giản, tự chủ data |
| API + Worker | Node.js + BullMQ + Redis | Cùng ngôn ngữ FE, queue chuẩn cho job dài |
| DB | Postgres | Credits ledger cần transactional |
| Storage | Cloudflare R2 | Egress miễn phí — video nặng, quan trọng |
| STT | Groq Whisper large-v3-turbo | ~vài cent/giờ audio, rẻ nhất thị trường |
| OCR video + dịch | Gemini 2.5/3 Flash; Pro cho gói trả phí | Đúng bài đối thủ, giá/phút kiểm soát được |
| TTS | Edge TTS (free tier) → Azure/ElevenLabs (premium) | Giống mô hình đối thủ: free để kéo user |
| Thanh toán | SePay (chuyển khoản VN tự động) | Chuẩn thị trường VN, có skill tích hợp sẵn |
| Deploy | VPS (worker + FFmpeg) + Vercel/CF Pages (FE) | FFmpeg cần máy thật, không serverless được |

## 5. Roadmap theo phase

| Phase | Nội dung | Thời gian ước tính | Đầu ra |
|---|---|---|---|
| **1. Nền móng + trích xuất & dịch** | Landing (dark/light), Google login, upload video, STT + Gemini OCR → SRT, dịch sang tiếng Việt, editor SRT cơ bản, tải SRT | 2-3 tuần | Sản phẩm dùng được, chưa render video |
| **2. Render video** | Che/blur sub gốc, burn sub Việt (FFmpeg worker + queue), tùy chỉnh font/vị trí, tải video | 2 tuần | Tính năng "video ra video" hoàn chỉnh |
| **3. Lồng tiếng** | Edge TTS free + giọng premium, khớp timing, mix audio | 2 tuần | Đủ bộ lõi user yêu cầu |
| **4. Monetization** | Credits + SePay + trial giới hạn phút + admin cơ bản | 1-2 tuần | Bắt đầu thu tiền |
| **5. Mở rộng** | Link video (yt-dlp), batch, glossary, phong cách dịch, blog, affiliate | liên tục | Tiến tới parity + vượt đối thủ |

Lưu ý thứ tự: **dubbing để Phase 3, không làm ngay Phase 1** — extract + dịch là giá trị lõi, rẻ và nhanh nhất để có sản phẩm chạy được; dubbing phức tạp nhất về chất lượng (timing, giọng).

## 6. Rủi ro & sự thật cần chấp nhận

1. **Pháp lý — link video nước ngoài**: yt-dlp tải từ YouTube/TikTok vi phạm ToS nền tảng; user dịch video có bản quyền để re-up là hành vi vi phạm của user. Nên: ra mắt với upload file trước, thêm tính năng link sau + Terms of Service rõ ràng (đây cũng là lý do nhiều đối thủ để user tự upload).
2. **Chi phí biến đổi/phút video là thật**: Gemini video + TTS premium tính theo phút. Bắt buộc thiết kế credits ngay từ Phase 1 (dù chưa thu tiền) để đo cost/user. Cần verify giá API hiện hành trước khi định giá gói.
3. **Chất lượng che sub gốc**: blur/đè nền là MVP chấp nhận được (đối thủ cũng vậy); inpainting AI đẹp hơn nhưng cần GPU — chỉ làm khi có doanh thu.
4. **Chất lượng lồng tiếng** quyết định giữ chân user: timing lệch/giọng robot là điểm chê phổ biến. Cần benchmark 2-3 TTS provider với tiếng Việt trước khi chốt.
5. **Không copy asset/nội dung GenSubAI** — chỉ tham khảo cấu trúc tính năng và mô hình giá.

## 7. Success metrics

- Phase 1: 1 video 10 phút → SRT tiếng Việt chính xác >90% trong <5 phút xử lý
- Phase 2: video output có sub Việt burn-in, sub gốc bị che, render <2x thời lượng video
- Phase 3: lồng tiếng lệch timing <300ms/câu
- Phase 4: nạp credits tự động qua bank transfer hoạt động end-to-end
- Cost/phút video < giá bán/phút (biên lãi dương từng job)

## 8. Next steps

1. ✅ Môi trường + project `landing-page` đã sẵn sàng
2. Approve kiến trúc + roadmap này
3. Lấy API keys: Google AI Studio (Gemini), Groq (Whisper) — free tier đủ cho dev
4. Bắt đầu Phase 1: thiết kế landing (dark/light) + luồng upload → extract → translate
