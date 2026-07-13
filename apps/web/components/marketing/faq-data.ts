/**
 * Nội dung FAQ — tách riêng khỏi faq-section.tsx (client) để server component
 * dùng lại khi sinh JSON-LD schema.org/FAQPage cho SEO.
 */
export const FAQ_T = {
  vi: {
    h2: "Câu hỏi thường gặp",
    faqs: [
      {
        q: "Web hỗ trợ những định dạng video nào?",
        a: "MP4, MOV, MKV và WebM — mỗi video tối đa 2GB và 60 phút. Bạn có thể thả nhiều video cùng lúc để xử lý hàng loạt.",
      },
      {
        q: "Video của tôi không có phụ đề, chỉ có tiếng nói thì sao?",
        a: "Chọn nguồn “Âm thanh” khi tải lên — AI sẽ nghe giọng nói và tự tạo phụ đề gốc kèm mốc thời gian, sau đó dịch sang tiếng Việt như bình thường.",
      },
      {
        q: "Bản dịch có tự nhiên không hay dịch máy cứng nhắc?",
        a: "Hệ thống dịch theo ngữ cảnh toàn video (nhân vật, xưng hô, thuật ngữ) rồi biên tập lại theo văn nói. Có 12 phong cách để chọn và bạn luôn sửa lại được từng câu trong trình chỉnh sửa trước khi render.",
      },
      {
        q: "Giọng lồng tiếng có những loại nào?",
        a: "Hơn 322 giọng thường của đủ mọi quốc gia (đã gồm trong giá lồng tiếng thường) và bộ giọng Việt cao cấp diễn cảm hơn. Giọng nào cũng nghe thử được trước khi chạy.",
      },
      {
        q: "Nạp credits bằng cách nào? Credits có hết hạn không?",
        a: "Chuyển khoản ngân hàng kèm mã cá nhân của bạn — credits tự cộng trong khoảng một phút, nạp nhiều được tặng thêm tới 80%. Credits không hết hạn.",
      },
      {
        q: "Nếu xử lý lỗi thì có mất credits không?",
        a: "Không. Job lỗi được hoàn lại toàn bộ credits tự động, xem được trong lịch sử giao dịch.",
      },
      {
        q: "Tôi có được dùng video của người khác không?",
        a: "Bạn chịu trách nhiệm về bản quyền nội dung mình tải lên. Nền tảng là công cụ dịch thuật và lồng tiếng — hãy dùng với video bạn có quyền sử dụng.",
      },
    ],
  },
  en: {
    h2: "Frequently asked questions",
    faqs: [
      {
        q: "Which video formats are supported?",
        a: "MP4, MOV, MKV, and WebM — up to 2GB and 60 minutes per video. You can drop multiple videos at once for batch processing.",
      },
      {
        q: "My video has no subtitles, only speech. What then?",
        a: "Choose the “Audio” source when uploading — AI listens to the speech, generates source subtitles with timestamps, then translates them as usual.",
      },
      {
        q: "Are the translations natural, or stiff machine output?",
        a: "The system translates with full-video context (characters, forms of address, terminology) and then rewrites everything in natural spoken style. There are 12 styles to choose from, and you can always edit any line in the editor before rendering.",
      },
      {
        q: "What kinds of dubbing voices are available?",
        a: "Over 322 standard voices from every country (included in the standard dubbing price) plus a set of more expressive premium Vietnamese voices. You can preview any voice before running the job.",
      },
      {
        q: "How do I buy credits? Do they expire?",
        a: "Make a bank transfer with your personal code — credits are added automatically within about a minute, and larger top-ups earn up to 80% bonus. Credits never expire.",
      },
      {
        q: "If a job fails, do I lose credits?",
        a: "No. Failed jobs are fully refunded automatically, and you can see it in your transaction history.",
      },
      {
        q: "Can I use other people's videos?",
        a: "You are responsible for the copyright of the content you upload. The platform is a translation and dubbing tool — use it with videos you have the rights to.",
      },
    ],
  },
} as const;
