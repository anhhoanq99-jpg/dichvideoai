import type { TranslateTier } from "./credits";

/** Phong cách dịch — dùng chung cho web (chọn) và worker (prompt). */
export const TRANSLATION_STYLES = [
  {
    id: "natural",
    name: "Tự nhiên — văn nói (khuyên dùng)",
    hint: "Như người Việt nói chuyện ngoài đời, hợp mọi thể loại",
  },
  {
    id: "gioi-tre",
    name: "Giới trẻ — hài hước, bắt trend",
    hint: "Từ lóng mạng xã hội, cà khịa nhẹ, vui nhộn",
  },
  {
    id: "review-phim",
    name: "Review phim — lôi cuốn, kịch tính",
    hint: "Giọng thuyết minh review, giữ chân người xem",
  },
  {
    id: "hoat-hinh",
    name: "Hoạt hình / Anime",
    hint: "Lời thoại sống động, biểu cảm, trong sáng — hợp trẻ em",
  },
  {
    id: "ngan-gon",
    name: "Ngắn gọn — súc tích",
    hint: "Rút gọn tối đa, dễ đọc kịp",
  },
  {
    id: "co-trang",
    name: "Cổ trang / kiếm hiệp",
    hint: "Ta-ngươi, huynh-đệ, từ Hán Việt hợp bối cảnh",
  },
  {
    id: "ngon-tinh",
    name: "Ngôn tình — cảm xúc, kịch tính",
    hint: "Sến nhẹ đúng chất phim tình cảm",
  },
  {
    id: "tam-trang",
    name: "Tâm trạng / triết lý",
    hint: "Sâu lắng, đồng cảm, chữa lành",
  },
  {
    id: "khoa-hoc",
    name: "Khoa học / kỹ thuật",
    hint: "Thuật ngữ chính xác, diễn đạt dễ hiểu",
  },
  {
    id: "hanh-dong",
    name: "Hành động — nhanh, mạnh",
    hint: "Câu ngắn, dồn dập, súc tích",
  },
  { id: "formal", name: "Trang trọng — tin tức, tài liệu", hint: "Lịch sự, chuẩn mực" },
  { id: "literal", name: "Bám sát — dịch sát từng câu", hint: "Ưu tiên chính xác" },
  {
    id: "google",
    name: "Dịch nhanh — máy dịch (rẻ nhất)",
    hint: "Sát nghĩa, giữ nguyên tên riêng, nhưng KHÔNG chỉnh thành văn nói",
  },
  {
    id: "custom",
    name: "Tự nhập prompt",
    hint: "Tự mô tả phong cách dịch bạn muốn",
  },
] as const;

export type TranslationStyleId = (typeof TRANSLATION_STYLES)[number]["id"];

/**
 * Bậc giá dịch của một phong cách. `google` chạy máy dịch thuần (không gọi model
 * ngôn ngữ, không có bước tóm tắt ngữ cảnh và trau chuốt) nên rẻ hơn hẳn — khai
 * báo đúng một chỗ, cùng lối với `dubTierOf` bên dub-presets.
 */
export function translateTierOf(style: TranslationStyleId): TranslateTier {
  return style === "google" ? "machine" : "ai";
}

export const TRANSLATION_STYLE_IDS = TRANSLATION_STYLES.map((s) => s.id) as [
  TranslationStyleId,
  ...TranslationStyleId[],
];

/** Style chọn được lúc upload (custom cần nhập prompt nên chỉ có trong editor). */
export const UPLOAD_STYLE_IDS = TRANSLATION_STYLE_IDS.filter(
  (s) => s !== "custom",
) as [TranslationStyleId, ...TranslationStyleId[]];
