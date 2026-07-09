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
    id: "custom",
    name: "Tự nhập prompt",
    hint: "Tự mô tả phong cách dịch bạn muốn",
  },
] as const;

export type TranslationStyleId = (typeof TRANSLATION_STYLES)[number]["id"];

export const TRANSLATION_STYLE_IDS = TRANSLATION_STYLES.map((s) => s.id) as [
  TranslationStyleId,
  ...TranslationStyleId[],
];

/** Style chọn được lúc upload (custom cần nhập prompt nên chỉ có trong editor). */
export const UPLOAD_STYLE_IDS = TRANSLATION_STYLE_IDS.filter(
  (s) => s !== "custom",
) as [TranslationStyleId, ...TranslationStyleId[]];
