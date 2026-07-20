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
    "Dịch theo giọng THUYẾT MINH REVIEW PHIM (kiểu các kênh review triệu view). Yêu cầu:\n" +
    "- Giọng kể CUỐN: dẫn dắt liền mạch, nhấn vào diễn biến và động cơ nhân vật, để người xem tò mò muốn xem tiếp.\n" +
    "- Câu gọn, nhịp nhanh, chủ động. Ưu tiên động từ mạnh; bỏ từ đệm rườm rà.\n" +
    "- Dùng cách nói của người thuyết minh: 'lúc này', 'ngay lập tức', 'không ngờ rằng', 'đúng lúc đó' — nhưng ĐỪNG lạm dụng, mỗi vài câu mới dùng một lần.\n" +
    "- Gọi nhân vật nhất quán theo bản tóm tắt cốt truyện (tên riêng, hoặc 'anh chàng', 'cô gái', 'gã đàn ông') thay vì thay đổi lung tung.\n" +
    "- Cảnh cao trào thì đẩy kịch tính, cảnh lắng thì hạ nhịp — bám đúng cảm xúc đang diễn ra.\n" +
    "TUYỆT ĐỐI KHÔNG: bịa tình tiết không có trong lời thoại gốc; thêm bình luận cá nhân; spoil trước nội dung chưa tới.\n" +
    "QUAN TRỌNG: mỗi dòng vẫn phải khớp đúng dòng gốc theo chỉ số `i` (phụ đề chạy theo thời gian), KHÔNG gộp hay tách dòng.\n" +
    "Ví dụ mức chất lượng yêu cầu:\n" +
    '- DỞ: "Tôi sẽ không bao giờ tha thứ cho anh" → HAY: "Cô ta nói thẳng, sẽ không bao giờ tha thứ."\n' +
    '- DỞ: "Có chuyện gì đang xảy ra vậy?" → HAY: "Không ai hiểu chuyện gì đang xảy ra."\n' +
    '- DỞ: "Hắn đã bị bắt bởi cảnh sát" → HAY: "Ngay lập tức, hắn bị cảnh sát tóm gọn."',
  "hoat-hinh":
    "Dịch theo phong cách HOẠT HÌNH / ANIME lồng tiếng Việt. Yêu cầu:\n" +
    "- Lời thoại SỐNG ĐỘNG, giàu biểu cảm, hợp khẩu hình nhân vật hoạt hình: reo lên khi vui, hét khi hoảng, mè nheo khi dỗi.\n" +
    "- Xưng hô đúng tuổi và quan hệ nhân vật (tớ - cậu, mình - bạn, anh - em, con - mẹ...) theo bản tóm tắt cốt truyện, giữ nhất quán cả phim.\n" +
    "- Câu ngắn, dễ đọc, trong sáng — trẻ em nghe hiểu được. Tránh từ thô tục và từ lóng khó hiểu.\n" +
    "- Giữ chất hài hước, tinh nghịch của bản gốc; chơi chữ gốc thì thay bằng cách chơi chữ tiếng Việt tương đương.\n" +
    "- Từ tượng thanh/cảm thán giữ đúng chất hoạt hình: 'Á!', 'Oaa~', 'Hửm?', 'Xì!', 'Hí hí'.\n" +
    "- Tên chiêu thức / phép thuật / bảo bối: giữ nguyên nếu đã quen thuộc với khán giả Việt, không thì dịch sao cho kêu và dễ nhớ.\n" +
    "Ví dụ mức chất lượng yêu cầu:\n" +
    '- DỞ: "Tôi rất tức giận với bạn" → HAY: "Tớ giận cậu đấy!"\n' +
    '- DỞ: "Điều này thật đáng kinh ngạc" → HAY: "Oaa, đỉnh thật đó!"',
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

/**
 * Yêu cầu THÊM cho bước tóm tắt cốt truyện, tùy phong cách sẽ dịch.
 * Nhờ vậy bản tóm tắt gợi ý xưng hô/cách gọi đúng chất ngay từ đầu.
 */
export const STYLE_BRIEF_HINTS: Partial<Record<TranslationStyleId, string>> = {
  "review-phim":
    "6. Bản dịch sẽ theo giọng THUYẾT MINH REVIEW: hãy đề xuất cách GỌI TÊN từng nhân vật\n" +
    "   khi kể ở ngôi thứ ba (tên riêng, 'anh chàng', 'cô gái', 'gã đàn ông'...) và nêu 1-2 chỗ\n" +
    "   cao trào đáng đẩy kịch tính.\n",
  "hoat-hinh":
    "6. Bản dịch sẽ theo phong cách HOẠT HÌNH cho trẻ em: hãy đề xuất xưng hô trong sáng,\n" +
    "   hợp lứa tuổi nhân vật, và liệt kê tên chiêu thức/bảo bối cần dịch nhất quán.\n",
  "co-trang":
    "6. Bản dịch sẽ theo văn phong CỔ TRANG: hãy đề xuất xưng hô Hán Việt đúng vai vế\n" +
    "   (ta-ngươi, tại hạ-các hạ, huynh-đệ, tỷ-muội) cho từng cặp nhân vật.\n",
  "ngon-tinh":
    "6. Bản dịch sẽ theo văn phong NGÔN TÌNH: hãy nêu rõ cặp nhân vật chính và mức độ\n" +
    "   thân mật ở từng giai đoạn để chọn xưng hô cho đúng (từ xa cách tới thân thiết).\n",
};

/**
 * Các style thiên VĂN NÓI — chạy thêm một lượt biên tập cho mượt, tự nhiên.
 * `review-phim` trước đây bị bỏ sót dù nó là style cần mượt nhất (giọng thuyết
 * minh vấp là người xem bỏ ngay).
 */
export const POLISH_STYLES: TranslationStyleId[] = [
  "natural",
  "gioi-tre",
  "ngon-tinh",
  "co-trang",
  "review-phim",
  "hoat-hinh",
];
