"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronDown } from "lucide-react";
import { Reveal, StaggerGroup, StaggerItem } from "./motion";

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

/** Phần 6 — FAQ: các câu hiện so le, mở/gập câu trả lời có animation chiều cao. */
export function FaqSection() {
  const [openIdx, setOpenIdx] = useState<number | null>(null);

  return (
    <section id="faq" className="mx-auto max-w-3xl scroll-mt-20 px-4 py-16">
      <Reveal>
        <h2 className="text-center text-3xl font-bold text-white sm:text-4xl">
          Câu hỏi thường gặp
        </h2>
      </Reveal>
      <StaggerGroup className="mt-8 space-y-3">
        {FAQS.map((f, i) => {
          const isOpen = openIdx === i;
          return (
            <StaggerItem
              key={f.q}
              className="rounded-xl border border-white/5 bg-white/[0.03] px-5 transition-colors duration-300 hover:border-white/15"
            >
              <button
                type="button"
                onClick={() => setOpenIdx(isOpen ? null : i)}
                className="flex w-full items-center justify-between gap-4 py-4 text-left text-sm font-medium text-white"
              >
                {f.q}
                <motion.span
                  animate={{ rotate: isOpen ? 180 : 0 }}
                  transition={{ duration: 0.25, ease: "easeOut" }}
                  className="shrink-0"
                >
                  <ChevronDown className="h-4 w-4 text-neutral-400" />
                </motion.span>
              </button>
              <AnimatePresence initial={false}>
                {isOpen && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.28, ease: "easeOut" }}
                    className="overflow-hidden"
                  >
                    <p className="pb-4 text-sm leading-relaxed text-neutral-400">{f.a}</p>
                  </motion.div>
                )}
              </AnimatePresence>
            </StaggerItem>
          );
        })}
      </StaggerGroup>
    </section>
  );
}
