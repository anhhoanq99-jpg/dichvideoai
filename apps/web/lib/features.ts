/**
 * Cờ bật/tắt tính năng ở mức sản phẩm.
 *
 * Để ở dạng hằng số trong code (không phải env) vì đổi env trên Vercel cũng phải
 * redeploy mới ăn — đằng nào cũng một lần deploy, mà hằng số thì được typecheck
 * và đọc code là biết đang bật hay tắt.
 */

/**
 * NHÂN BẢN GIỌNG NÓI — TẠM TẮT (30/07/2026).
 *
 * Lý do: nhân bản là thao tác TẠO giọng mới từ file mẫu, không nguồn miễn phí nào
 * làm được. Edge TTS và Gemini TTS chỉ đọc theo danh sách giọng cố định; Google
 * Cloud có cloning nhưng là sản phẩm doanh nghiệp trả phí riêng. Chỉ ElevenLabs
 * hỗ trợ, mà gói free thiếu quyền `create_instant_voice_clone` → khách bấm nút chỉ
 * nhận về lỗi 402. Thà giấu đi còn hơn mời khách dùng một nút chắc chắn hỏng.
 *
 * BẬT LẠI: nâng ElevenLabs lên gói Starter (~5$/tháng) rồi đổi cờ này thành `true`.
 * Toàn bộ giao diện, tên trang và mục menu tự hiện lại — không phải sửa chỗ nào khác.
 *
 * Khi tắt, phần "Đọc văn bản" (hàng trăm giọng miễn phí) VẪN chạy bình thường.
 */
// Kiểu `boolean` tường minh (không để TS suy ra literal `false`) — nếu không,
// TypeScript thu hẹp mọi nhánh `VOICE_CLONE_ENABLED ? … : …` thành code chết và
// báo lỗi/cảnh báo ở chỗ dùng.
export const VOICE_CLONE_ENABLED: boolean = false;
