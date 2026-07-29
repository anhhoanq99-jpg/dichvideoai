# Script vận hành của worker

Không script nào được gọi tự động — chạy tay khi cần. Tất cả đọc `.env` ở gốc repo:

```bash
cd apps/worker && npx tsx --env-file=../../.env scripts/<tên>.ts
```

| Script | Dùng khi nào |
|---|---|
| `check-capacity.ts` | Đo năng lực xử lý thật từ job đã chạy — VPS 3 nhân là **trần tăng trưởng**, chạy cái này trước khi chạy quảng cáo |
| `check-cost-projection.ts` | Dự báo chi phí API từ lượng đã dùng thật — chạy kèm mỗi lần đổi bảng giá |
| `check-queue-health.ts` | Hàng đợi BullMQ có job kẹt / chồng worker không |
| `verify-providers.ts` | Kiểm mọi nguồn AI còn sống (key hết hạn, hết hạn mức…) |
| `gen-edge-voices.ts` | Sinh lại catalog 322 giọng Edge khi Microsoft đổi danh sách |
| `grant-credits.ts` | Cộng xu thủ công cho một tài khoản |
| `set-r2-cors.ts` · `set-r2-lifecycle.ts` | Cấu hình bucket R2 — **cần token có quyền admin**, token trong `.env` là object-scoped nên sẽ báo AccessDenied |
| `test-tts.ts` · `test-gemini-tts.ts` | Smoke test nhanh một giọng ra file mp3 |

## Đã xoá (30/07/2026)

9 script chẩn đoán **một lần** đã hết vai trò — nằm trong lịch sử git nếu cần tra lại:
`check-jobs` · `check-latest` · `check-ledger-dups` · `check-money-fixes` ·
`check-removed-voices` · `check-usage-query` · `check-edge-fallback` ·
`spike-gemini-ocr` · `add-ledger-unique-index` (index này giờ nằm trong migration).

Quy tắc: script viết để xác minh **một** lần sửa lỗi thì xoá sau khi sửa xong.
Chỉ giữ thứ chạy lại được nhiều lần.
