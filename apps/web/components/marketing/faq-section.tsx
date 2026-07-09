import { ChevronDown } from "lucide-react";

const FAQS = [
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
];

/** Phần 6 — câu hỏi thường gặp, accordion thuần HTML (details/summary). */
export function FaqSection() {
  return (
    <section id="faq" className="mx-auto max-w-3xl scroll-mt-20 px-4 py-16">
      <h2 className="text-center text-3xl font-bold text-white sm:text-4xl">
        Câu hỏi thường gặp
      </h2>
      <div className="mt-8 space-y-3">
        {FAQS.map((f) => (
          <details
            key={f.q}
            className="group rounded-xl border border-white/5 bg-white/[0.03] px-5 py-4"
          >
            <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-sm font-medium text-white">
              {f.q}
              <ChevronDown className="h-4 w-4 shrink-0 text-neutral-400 transition-transform group-open:rotate-180" />
            </summary>
            <p className="mt-3 text-sm leading-relaxed text-neutral-400">{f.a}</p>
          </details>
        ))}
      </div>
    </section>
  );
}
