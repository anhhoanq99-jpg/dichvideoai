# Brainstorm #2 — Batch Localization Workflow ("Việt hóa video" cho dân làm nội dung số lượng lớn)

> Ngày: 2026-07-09 · Tiếp nối: `brainstorm-video-translate-platform.md` (kiến trúc + Phase 1-5 gốc giữ nguyên)
> Yêu cầu gốc của user: web phục vụ reup — Việt hóa video nước ngoài (che/xóa sub gốc, lồng tiếng Việt AI thay audio gốc)

## 1. Quyết định chiến lược

**Cùng sản phẩm, khác cách đóng gói.** Công nghệ lõi (extract → translate → che sub gốc → burn sub Việt → dub) đã có trong kế hoạch #1. Điểm mới = lớp workflow hàng loạt + khung pháp lý.

- Positioning: **"Nền tảng Việt hóa & lồng tiếng video AI"** — KHÔNG dùng chữ "reup" trong brand/marketing/landing
- Mô hình trách nhiệm: công cụ trung lập (như GenSubAI) — ToS bắt user cam kết có quyền với nội dung; platform không chịu trách nhiệm nội dung user
- Thị trường hợp pháp có thật: nhà phân phối phim có license, brand localize content chính chủ, creator đa ngôn ngữ hóa kênh mình, video affiliate được cấp quyền

## 2. Ranh giới tính năng (đã chốt — KHÔNG làm)

| Tính năng | Quyết định | Lý do |
|---|---|---|
| Xóa logo/watermark kênh gốc | ❌ Không làm (dù GenSubAI có) | Mục đích duy nhất: che nguồn gốc nội dung người khác → rủi ro pháp lý trực tiếp cho platform |
| Né Content ID (lật hình, zoom, đổi pitch phá fingerprint) | ❌ Không làm | Thiết kế riêng cho vi phạm; bằng chứng chống lại platform |
| Tải video từ link (yt-dlp) | ⚠️ Hoãn; nếu làm → tiện ích không marketing | Vi phạm ToS YouTube/TikTok |
| Che/blur sub gốc, thay audio bằng dub Việt, burn sub | ✅ Làm | Localization chuẩn, dual-use hợp pháp |
| Publish lên kênh CHÍNH CHỦ user (OAuth) | ✅ Làm (Phase 6) | User tự ủy quyền kênh mình — hợp lệ |

## 3. Roadmap cập nhật (delta so với plan #1)

Phase 1-4 giữ nguyên (extract+dịch → render video → dubbing → credits/SePay).

**Bổ sung vào Phase 2-3:**
- Preset render theo nền tảng: 16:9 / 9:16 / 1:1, resolution/bitrate — 1 video ra nhiều bản (YouTube/TikTok/Reels)
- Preset style sub + giọng dub lưu được, tái dùng 1-click

**Phase 5 (định hình lại): Batch Localization Studio — 2-3 tuần sau Phase 4**
- Batch queue: 10-50 video/lần, pipeline tự chạy end-to-end, tiến độ từng video, cancel/retry từng job
- Project/workspace theo kênh/series
- **Series memory**: glossary + tên nhân vật + xưng hô dùng chung cả series (dịch tập N nhớ ngữ cảnh tập 1..N-1) → điểm khác biệt "thông minh hơn" so với GenSubAI
- Review UI: bảng dịch song ngữ, sửa hàng loạt, approve cả batch trước render

**Phase 6 (mới): Xuất bản — chỉ khi P5 có user trả tiền**
- OAuth YouTube Data API → publish thẳng lên kênh user kèm title/description/tags đã dịch
- Lịch đăng + trạng thái
- Đánh giá thêm TikTok Content Posting API sau

**Phase 4 bổ sung (pháp lý — bắt buộc trước khi thu tiền):**
- ToS: user cam kết có quyền nội dung; quy trình tiếp nhận khiếu nại bản quyền; khóa tài khoản vi phạm lặp lại
- Log nguồn upload (audit trail) để chứng minh thiện chí platform

## 4. Kỹ thuật bổ sung cho batch (delta kiến trúc)

- BullMQ: thêm job group theo batch, concurrency limit theo user/gói, priority queue (user trả phí trước)
- Postgres: bảng `projects`, `series_glossaries`, `batches`, `batch_items` (thêm vào schema plan #1)
- Chi phí: batch làm lộ cost nhanh — dashboard cost/phút/job từ Phase 1 càng quan trọng
- Worker scale ngang: nhiều VPS worker cùng kéo queue (thiết kế stateless từ đầu, không đổi kiến trúc)

## 5. Rủi ro chính

1. **Khách reup churn cao** (mất kênh = mất khách) → không xây business chỉ trên tập này; landing nhắm "creator/hãng phân phối localize nội dung"
2. **Platform liability**: nếu marketing "reup" hoặc làm tính năng né bản quyền → từ công cụ trung lập thành đồng phạm. Đã chốt ranh giới ở mục 2
3. **Chất lượng dub batch**: lồng tiếng hàng loạt không người duyệt dễ ra sản phẩm lỗi timing → bắt buộc bước review/approve trước render trong flow batch
4. **Cost run-away**: batch 50 video × Gemini + TTS = hóa đơn lớn; cần hard-limit credits trước khi job chạy (trừ trước, hoàn nếu fail)

## 6. Success metrics (thêm vào plan #1)

- Batch 10 video 10' chạy end-to-end không babysit, fail rate <5%, retry được từng item
- Series 3 tập: tên nhân vật/xưng hô đồng nhất 100% giữa các tập
- Thời gian thao tác của user cho video thứ 2 trở đi (với preset): <2 phút
- 0 tính năng trong danh sách cấm ở mục 2 lọt vào codebase

## 7. Next steps

1. Approve ranh giới tính năng (mục 2) — nền tảng cho mọi quyết định sau
2. Bắt đầu Phase 1 theo plan #1 (không đổi): landing + upload → extract → translate
3. Khi làm landing: copywriting theo positioning "Việt hóa video AI", không "reup"
