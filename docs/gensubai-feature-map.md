# Feature map đối thủ → lộ trình build (từ 13 screenshot user cung cấp, 2026-07-09)

> Nguyên tắc đã chốt: học **cấu trúc tính năng + luồng thao tác**, KHÔNG copy tên/logo/câu chữ/asset.
> Không làm: xóa logo/watermark của người khác, né Content-ID, dán link video.

## Luồng tổng thể của đối thủ

1 trang bắt đầu → Bắt Đầu → tự chạy (trích xuất → dịch) → editor toàn màn hình → xuất file / render / lồng tiếng.

## Trang bắt đầu (một chạm)

- Nguồn phụ đề: OCR / STT / nhập SRT bản dịch / nhập SRT gốc cần dịch / tự viết
- Ngôn ngữ gốc (kèm bộ lọc riêng theo ngôn ngữ, vd lọc chữ Trung)
- Thiết lập dịch: ngôn ngữ đích + model AI (giá credit/dòng) + phong cách dịch
- Từ điển & danh sách nhân vật (collapse)
- Kéo-thả nhiều video; danh sách video kèm ước tính credit (OCR + dub) và override nguồn per-video
- Nút Bắt Đầu chạy hàng loạt; modal tiến trình có nút Hủy

**Trạng thái mình:** ✅ đã build bản đầu (commit này) — OCR/STT + ngôn ngữ gốc + phong cách + glossary + multi-upload + chuỗi tự động probe→extract→translate. Chưa có: nhập SRT, tự viết, ước tính credit, override per-video, nút hủy pipeline.

## Editor (trang chỉnh sửa)

- Player trái (có timeline segment) + danh sách phụ đề phải: mỗi câu gồm BẢN GỐC + BẢN DỊCH, timestamp, duration, số ký tự, tốc độ đọc CPS (cảnh báo vượt chuẩn), checkbox chọn giọng G1/G2/G3 per-câu, thêm/xóa câu
- Toolbar: Dịch Bằng AI · Làm mờ · Phụ đề · Logo · Lồng Tiếng · Cài đặt đã lưu · Xuất File

### Modal "Dịch Bằng AI"
- Model + chế độ (chất lượng từng dòng / nhanh) + ngôn ngữ đích
- ~12 phong cách dịch: phổ thông, review phim, ngắn gọn, giới trẻ, ngôn tình, tiếu lâm, cổ trang, tâm trạng, khoa học, hành động, từ Capcut, tự nhập prompt
- Ước tính credit = số dòng × ngôn ngữ × đơn giá; nút Dịch Toàn Bộ

### Làm mờ (blur)
- Kéo chuột trên player để chọn vùng, click vùng để xóa (mình đã có region-selector tương đương)
- Chế độ: mặc định / vùng lân cận; slider độ nhòe, đậm/nhẹ, % dải dưới-trên

### Phụ đề (style)
- Bật/tắt hiện trên video, font, cỡ, màu chữ, màu nền hộp, kiểu nền (hộp đục), độ đục, B/I, preview trực tiếp trên player (bản gốc / bản dịch / cả hai)
- (mình đã có: preset + font/cỡ/màu/ô nền/độ phủ trong render panel — cần chuyển vào editor)

### Logo (watermark CỦA USER — additive, hợp lệ)
- Bật/tắt, chữ hoặc ảnh, nội dung, font, cỡ, màu, vị trí góc, độ mờ

### Cài đặt đã lưu
- Lưu/tải preset đặt tên (gộp: giọng đọc + phụ đề + âm thanh & làm mờ)

### Xuất File
- SRT gốc / SRT dịch / TXT gốc / TXT dịch / cả hai (mình đã có export SRT/VTT — thêm TXT + menu)

## Lồng tiếng (Phase 5 của mình)

- Quốc gia + giới tính; 3 slot giọng (server: nội bộ/Google Cloud, giọng, đơn giá credit/phút, tốc độ, âm lượng, cao độ) — gán giọng per-câu qua checkbox G1/G2/G3 ở editor
- Chế độ: (1) ưu tiên video giữ nguyên thời lượng, (2) hybrid tự giãn video khi câu dub dài — kèm cảnh báo % câu vượt ngưỡng
- Mixing: giữ âm gốc, âm lượng giọng AI / nhạc nền gốc / giọng nói gốc (%)
- Từ điển phát âm (từ → cách đọc)
- Ước tính credit theo phút

## Thứ tự build còn lại

1. ✅ Trang một chạm + chuỗi pipeline tự động
2. Editor overhaul: layout player+list, CPS, toolbar modal (Dịch AI với nhiều phong cách + tự nhập prompt, Phụ đề, Làm mờ, Xuất File có TXT)
3. Thêm phong cách dịch mới vào translate.ts (map prompt) + chế độ dịch lại từng dòng
4. Logo/watermark additive vào filtergraph (drawtext/overlay)
5. Cài đặt đã lưu (bảng user_presets)
6. Lồng tiếng (phase-05) theo cấu trúc trên + credit estimate
7. Watermark bản dùng thử + bảng giá (phase-06)
