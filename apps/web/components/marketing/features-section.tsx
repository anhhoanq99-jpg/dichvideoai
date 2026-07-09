"use client";

import {
  Blocks,
  Eraser,
  Languages,
  Mic,
  PenLine,
  ScanText,
  Stamp,
  Volume2,
} from "lucide-react";
import { Reveal, StaggerGroup, StaggerItem } from "./motion";

const FEATURES = [
  {
    icon: ScanText,
    title: "Tách phụ đề tự động",
    desc: "AI đọc phụ đề gắn cứng trên hình (OCR) hoặc nghe giọng nói (STT) và tạo phụ đề gốc kèm mốc thời gian.",
  },
  {
    icon: Languages,
    title: "Dịch chuẩn văn nói",
    desc: "12 phong cách: tự nhiên, giới trẻ bắt trend, cổ trang, ngôn tình, review phim… hoặc tự nhập prompt riêng.",
  },
  {
    icon: Eraser,
    title: "Che chữ nước ngoài",
    desc: "Làm mờ hoặc phủ ô màu nhiều vùng trên video; phụ đề Việt tự đặt đè đúng chỗ chữ gốc.",
  },
  {
    icon: Volume2,
    title: "Lồng tiếng AI",
    desc: "322+ giọng đủ mọi quốc gia (miễn phí) và giọng Việt cao cấp diễn cảm; tự khớp thời gian từng câu.",
  },
  {
    icon: PenLine,
    title: "Trình chỉnh sửa phụ đề",
    desc: "Sửa từng câu cạnh video, cảnh báo tốc độ đọc, tìm & thay thế, tự lưu, xuất SRT/VTT/TXT.",
  },
  {
    icon: Stamp,
    title: "Gắn logo kênh",
    desc: "Chèn tên/logo kênh của bạn vào góc video với font, màu, độ mờ tùy chọn.",
  },
  {
    icon: Blocks,
    title: "Xử lý hàng loạt",
    desc: "Thả nhiều video cùng lúc, thiết lập một lần — cả loạt tự chạy trích xuất → dịch nối tiếp nhau.",
  },
  {
    icon: Mic,
    title: "Nghe thử giọng",
    desc: "Bấm nghe thử bất kỳ giọng nào trước khi lồng tiếng, lọc theo quốc gia và giới tính.",
  },
];

/** Phần 3 — lưới tính năng: hiện so le khi cuộn tới, thẻ nâng nhẹ khi rê chuột. */
export function FeaturesSection() {
  return (
    <section id="tinh-nang" className="mx-auto max-w-6xl scroll-mt-20 px-4 py-16">
      <Reveal>
        <h2 className="text-center text-3xl font-bold text-white sm:text-4xl">
          Mọi thứ để Việt hóa video
        </h2>
        <p className="mx-auto mt-3 max-w-xl text-center text-neutral-400">
          Một nền tảng thay cho cả bộ công cụ: tách phụ đề, dịch, che chữ, render, lồng tiếng.
        </p>
      </Reveal>
      <StaggerGroup className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {FEATURES.map((f) => (
          <StaggerItem
            key={f.title}
            lift
            className="rounded-2xl border border-white/5 bg-white/[0.03] p-5 transition-colors duration-300 hover:border-indigo-500/40 hover:bg-indigo-500/[0.06]"
          >
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-500/15">
              <f.icon className="h-5 w-5 text-indigo-400" />
            </span>
            <h3 className="mt-4 text-sm font-semibold text-white">{f.title}</h3>
            <p className="mt-1.5 text-sm leading-relaxed text-neutral-400">{f.desc}</p>
          </StaggerItem>
        ))}
      </StaggerGroup>
    </section>
  );
}
