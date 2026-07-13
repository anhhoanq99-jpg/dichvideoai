# Design guidelines — phong cách veed.io

Trích xuất từ https://www.veed.io/ (07/2026) để áp cho toàn bộ web Dịch Video AI.

## Màu sắc
- **Giữ bộ màu thương hiệu cam san hô** (`#ee5631`) — user đã thử ramp xanh kiểu veed
  và quyết định quay về cam (07/2026). Chỉ mượn veed phần BỐ CỤC/HÌNH KHỐI, không mượn màu.
- **Nền**: trắng ấm (`#fdfcfb`), chữ đen ấm (`#1c1917`), tiêu đề đậm (bold, tracking-tight).
- **Phụ**: badge pastel nhạt (nền 50, chữ 700) cho trạng thái; success xanh ngọc giữ nguyên.

## Hình khối
- Bo góc lớn: card `rounded-2xl`, control `rounded-lg`+, CTA chính dạng **pill** (`rounded-full`).
- Card: nền trắng, viền mảnh `neutral-200`, shadow rất nhẹ, hover mới nổi shadow.
- Badge: pill nhỏ, nền tint 50, chữ đậm 700.

## Bố cục & responsive
- Sidebar trắng bên trái (desktop), nav item dạng pill, nhóm theo mục.
- Nội dung nền xám nhạt, card trắng nổi trên nền.
- **Bảng dữ liệu**: chỉ hiện dạng `<table>` từ breakpoint `sm`/`md` trở lên;
  dưới đó chuyển sang danh sách card xếp dọc (không bắt user cuộn ngang).
- Khoảng thở rộng rãi, tiêu đề trang lớn (`text-2xl`/`3xl` bold).

## Chữ
- Geist (đã self-host) — grotesque sạch, đúng chất veed. Tiêu đề `font-bold tracking-tight`.

## Chuyển động
- Giữ hệ fade-up/stagger sẵn có; hover card nâng nhẹ (`.lift`), nút nhún khi bấm.
