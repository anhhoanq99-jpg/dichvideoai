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
import type { Lang } from "@/lib/i18n";
import { StaggerGroup, StaggerItem } from "./reveal";
import { SectionHeading } from "./section-heading";

const T = {
  vi: {
    h2: "Một nền tảng — đủ đồ nghề làm video",
    p: "Thay cho cả bộ công cụ Premiere/CapCut khi làm video quảng cáo, video giải trí: tách phụ đề, dịch, che chữ, render, lồng tiếng — tích hợp sẵn trong một chỗ.",
    features: [
      {
        icon: ScanText,
        title: "Tách phụ đề tự động",
        desc: "AI đọc phụ đề gắn cứng trên hình (OCR) hoặc nghe giọng nói (STT) và tạo phụ đề gốc kèm mốc thời gian.",
      },
      {
        icon: Languages,
        title: "Dịch mọi ngôn ngữ, chuẩn văn nói",
        desc: "Trung, Anh, Hàn, Nhật… sang tiếng Việt và ngược lại. 12 phong cách: tự nhiên, giới trẻ bắt trend, cổ trang, review phim…",
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
    ],
  },
  en: {
    h2: "One platform — everything you need for video",
    p: "Replaces a whole Premiere/CapCut toolkit for ads and entertainment videos: subtitle extraction, translation, text masking, rendering, dubbing — all built into one place.",
    features: [
      {
        icon: ScanText,
        title: "Automatic subtitle extraction",
        desc: "AI reads hardcoded on-screen subtitles (OCR) or listens to speech (STT) and generates source subtitles with timestamps.",
      },
      {
        icon: Languages,
        title: "Any language, natural spoken style",
        desc: "Chinese, English, Korean, Japanese… to Vietnamese and back. 12 styles: natural, trendy Gen-Z, period drama, movie review…",
      },
      {
        icon: Eraser,
        title: "Mask foreign text",
        desc: "Blur or cover multiple regions of the video; translated subtitles are placed right over the original text.",
      },
      {
        icon: Volume2,
        title: "AI dubbing",
        desc: "322+ voices from every country (free) plus expressive premium Vietnamese voices; every line auto-synced to time.",
      },
      {
        icon: PenLine,
        title: "Subtitle editor",
        desc: "Edit each line next to the video, reading-speed warnings, find & replace, autosave, export SRT/VTT/TXT.",
      },
      {
        icon: Stamp,
        title: "Channel watermark",
        desc: "Add your channel name/logo to a corner of the video with custom font, color, and opacity.",
      },
      {
        icon: Blocks,
        title: "Batch processing",
        desc: "Drop multiple videos at once, set up once — the whole batch runs extraction → translation back to back.",
      },
      {
        icon: Mic,
        title: "Voice previews",
        desc: "Listen to any voice before dubbing, filtered by country and gender.",
      },
    ],
  },
} as const;

/** Phần 3 — lưới tính năng: hiện so le khi cuộn tới, thẻ nâng nhẹ khi rê chuột. */
export function FeaturesSection({ lang = "vi" }: { lang?: Lang }) {
  const t = T[lang];
  return (
    <section id="tinh-nang" className="mx-auto max-w-6xl scroll-mt-20 px-4 py-16">
      <SectionHeading title={t.h2} subtitle={t.p} />
      <StaggerGroup className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {t.features.map((f) => (
          <StaggerItem
            key={f.title}
            lift
            className="rounded-2xl border border-white/5 bg-white/[0.03] p-5 transition-colors duration-300 hover:border-primary-500/40 hover:bg-primary-500/[0.06]"
          >
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-500/15">
              <f.icon className="h-5 w-5 text-primary-400" />
            </span>
            <h3 className="mt-4 text-sm font-semibold text-white">{f.title}</h3>
            <p className="mt-1.5 text-sm leading-relaxed text-neutral-400">{f.desc}</p>
          </StaggerItem>
        ))}
      </StaggerGroup>
    </section>
  );
}
