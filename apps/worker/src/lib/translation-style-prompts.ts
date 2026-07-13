import type { TranslationStyleId } from "@dichvideo/shared";

/**
 * Hướng dẫn phong cách dịch cho từng style — key phải khớp
 * TRANSLATION_STYLE_IDS trong packages/shared/src/translate-styles.ts.
 */
export const STYLE_INSTRUCTIONS: Record<TranslationStyleId, string> = {
  natural:
    "Dịch như người Việt NÓI CHUYỆN thật ngoài đời, không phải văn viết. Yêu cầu:\n" +
    "- Dịch theo Ý, tuyệt đối không dịch từng từ theo cấu trúc câu gốc (tránh kiểu 'Google dịch' lủng củng).\n" +
    "- Dùng từ ngữ đời thường, trợ từ tự nhiên (à, nhé, đấy, thôi, mà, cơ, hả...) đúng chỗ.\n" +
    "- Đảo lại trật tự câu cho đúng cách người Việt diễn đạt; câu ngắn gọn như lời thoại phim lồng tiếng.\n" +
    "- Giữ đúng cảm xúc: giận thì gắt, đùa thì tếu, buồn thì trầm — chọn từ theo sắc thái nhân vật.\n" +
    "- Thành ngữ/tục ngữ gốc → thay bằng thành ngữ Việt tương đương, không dịch nghĩa đen.\n" +
    "Ví dụ mức chất lượng yêu cầu (tự đặt, minh họa cách diễn đạt):\n" +
    '- DỞ: "Tôi không thể tin điều này đang xảy ra" → HAY: "Không thể tin nổi luôn á!"\n' +
    '- DỞ: "Bạn có muốn đi cùng với tôi không?" → HAY: "Đi với tớ không?"\n' +
    '- DỞ: "Điều đó không phải là vấn đề của tôi" → HAY: "Việc đó đâu liên quan gì đến tôi."',
  "gioi-tre":
    "Dịch theo phong cách GIỚI TRẺ Việt Nam trên mạng xã hội: hài hước, tếu táo, cà khịa nhẹ nhàng đúng lúc. " +
    "Dùng từ lóng/từ hot phổ biến (xỉu ngang, ảo thật đấy, đỉnh nóc, ét ô ét, u là trời, khum, chằm Zn...) NHƯNG đúng ngữ cảnh và không lạm dụng đến mức khó hiểu hay sai nghĩa. " +
    "Câu ngắn, giọng vui, có thể chêm biểu cảm khi phù hợp. Vẫn giữ đúng ý gốc.",
  "review-phim":
    "Dịch theo giọng THUYẾT MINH REVIEW PHIM: lôi cuốn, li kỳ, giữ chân người xem. " +
    "Kể lại lời thoại mạch lạc, nhấn vào diễn biến và cảm xúc nhân vật, tạo cảm giác tò mò muốn xem tiếp. Bám sát nội dung, không bịa thêm tình tiết.",
  "ngan-gon":
    "Dịch NGẮN GỌN tối đa: giữ trọn ý chính, cắt mọi từ thừa, câu càng ngắn càng tốt để người xem đọc kịp. Ưu tiên từ đơn giản, dễ hiểu.",
  "co-trang":
    "Dịch theo văn phong CỔ TRANG / KIẾM HIỆP: xưng hô ta - ngươi, huynh - đệ, tỷ - muội, tại hạ, các hạ... đúng vai vế nhân vật. " +
    "Dùng từ Hán Việt hợp bối cảnh (công tử, cô nương, sư phụ, giang hồ, võ công...), giọng trang nhã có chất thơ nhưng vẫn dễ hiểu với khán giả Việt.",
  "ngon-tinh":
    "Dịch theo văn phong NGÔN TÌNH: giàu cảm xúc, kịch tính, lãng mạn, sến nhẹ đúng chất phim tình cảm. " +
    "Xưng hô tình cảm hợp quan hệ nhân vật (anh - em, chàng - nàng...), câu thoại da diết ở cảnh xúc động, gắt gỏng có kịch tính ở cảnh mâu thuẫn.",
  "tam-trang":
    "Dịch theo giọng TÂM TRẠNG / TRIẾT LÝ: sâu lắng, đồng cảm, chữa lành. " +
    "Câu chữ nhẹ nhàng, giàu suy ngẫm, chọn từ tinh tế truyền tải cảm xúc; tránh khẩu ngữ suồng sã.",
  "khoa-hoc":
    "Dịch nội dung KHOA HỌC / KỸ THUẬT: thuật ngữ chính xác và nhất quán (giữ nguyên thuật ngữ tiếng Anh thông dụng nếu dịch ra sẽ khó hiểu), " +
    "diễn đạt gần gũi, sinh động, dễ hiểu với người xem phổ thông.",
  "hanh-dong":
    "Dịch theo phong cách HÀNH ĐỘNG / KỊCH TÍNH: câu ngắn, nhanh, mạnh, dồn dập. Lời thoại dứt khoát, khẩu lệnh gọn sắc, giữ nhịp căng thẳng của cảnh phim.",
  formal: "Dịch trang trọng, lịch sự, phù hợp nội dung tài liệu/tin tức.",
  literal: "Dịch sát nghĩa nhất có thể, ưu tiên độ chính xác hơn độ mượt.",
  custom: "", // thay bằng prompt người dùng nhập lúc chạy
};

/** Các style thiên văn nói — chạy thêm pass biên tập cho mượt. */
export const POLISH_STYLES: TranslationStyleId[] = [
  "natural",
  "gioi-tre",
  "ngon-tinh",
  "co-trang",
];
