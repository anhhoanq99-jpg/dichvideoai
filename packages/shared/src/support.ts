/**
 * Thông tin liên hệ hỗ trợ — khai báo MỘT chỗ.
 * Rải số điện thoại khắp component là kiểu sau này đổi số thì sót vài chỗ,
 * mà chỗ sót lại đúng là chỗ khách đang cần gọi.
 */
export const SUPPORT_ZALO = "0365797631";

/** Link mở chat Zalo (chỉ giữ chữ số — zalo.me không nhận dấu cách/gạch). */
export const SUPPORT_ZALO_URL = `https://zalo.me/${SUPPORT_ZALO.replace(/\D/g, "")}`;
