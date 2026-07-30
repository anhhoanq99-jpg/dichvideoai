/**
 * Số ngày giữ file kết quả (`outputs/`) trên R2 trước khi Cloudflare tự xoá.
 *
 * MỘT nguồn duy nhất cho cả ba nơi phải khớp nhau:
 *   1. Lifecycle rule trên bucket R2 (`apps/worker/scripts/set-r2-lifecycle.ts`)
 *   2. Mọi chỗ hiển thị cho khách (trang Xuất file, Lịch sử, Điều khoản, Bảo mật…)
 *   3. Phép tính "còn lại mấy ngày" trong SQL ở trang Xuất file
 *
 * Trước đây con số này được gõ cứng ở 7 chỗ. Đổi hạn lưu mà sót một chỗ là web
 * hứa một đằng, file bị xoá một nẻo — khách mất video mà mình không biết vì sao.
 *
 * ⚠️ Đổi số ở đây thì PHẢI chạy lại `set-r2-lifecycle.ts`: hằng số này không tự
 * đẩy được rule lên Cloudflare.
 */
export const OUTPUT_RETENTION_DAYS = 5;
