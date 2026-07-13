import { Download, Settings2, UploadCloud, Wand2 } from "lucide-react";
import type { Lang } from "@/lib/i18n";
import { StaggerGroup, StaggerItem } from "./reveal";
import { SectionHeading } from "./section-heading";

const T = {
  vi: {
    h2: "Bốn bước là xong",
    p: "Từ video nước ngoài đến video tiếng Việt hoàn chỉnh — không cần phần mềm edit.",
    step: "Bước",
    steps: [
      {
        icon: UploadCloud,
        title: "Thả video vào",
        desc: "Chọn nguồn phụ đề (chữ trên hình hoặc giọng nói), ngôn ngữ gốc và phong cách dịch. Kéo thả nhiều video một lúc.",
      },
      {
        icon: Wand2,
        title: "AI tự xử lý",
        desc: "Hệ thống tự chạy chuỗi: đọc thông số → tách phụ đề gốc → dịch sang tiếng Việt. Bạn theo dõi tiến trình trực tiếp.",
      },
      {
        icon: Settings2,
        title: "Duyệt & tinh chỉnh",
        desc: "Sửa câu chữ trong editor, chọn kiểu phụ đề, khoanh vùng che chữ gốc, chọn giọng lồng tiếng và nghe thử.",
      },
      {
        icon: Download,
        title: "Xuất & tải về",
        desc: "Render video phụ đề Việt, bản lồng tiếng, hoặc tải file SRT/TXT — sẵn sàng đăng lên mọi nền tảng.",
      },
    ],
  },
  en: {
    h2: "Done in four steps",
    p: "From a foreign video to a fully localized one — no editing software required.",
    step: "Step",
    steps: [
      {
        icon: UploadCloud,
        title: "Drop in your video",
        desc: "Pick the subtitle source (on-screen text or speech), source language, and translation style. Drag in multiple videos at once.",
      },
      {
        icon: Wand2,
        title: "AI does the work",
        desc: "The system runs the whole chain: read metadata → extract source subtitles → translate. Watch progress live.",
      },
      {
        icon: Settings2,
        title: "Review & fine-tune",
        desc: "Polish lines in the editor, pick a subtitle style, mark regions to mask original text, choose a dubbing voice and preview it.",
      },
      {
        icon: Download,
        title: "Export & download",
        desc: "Render the subtitled video, the dubbed version, or download SRT/TXT files — ready to post anywhere.",
      },
    ],
  },
} as const;

/** Phần 4 — 4 bước hoạt động, dọc trên mobile, ngang trên desktop. */
export function HowItWorksSection({ lang = "vi" }: { lang?: Lang }) {
  const t = T[lang];
  return (
    <section id="cach-hoat-dong" className="scroll-mt-20 border-y border-white/5 bg-white/[0.02] px-4 py-16">
      <div className="mx-auto max-w-6xl">
        <SectionHeading title={t.h2} subtitle={t.p} />
        <StaggerGroup className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {t.steps.map((s, i) => (
            <StaggerItem
              key={s.title}
              lift
              className="relative rounded-2xl border border-white/5 bg-cinema p-5 transition-colors duration-300 hover:border-primary-500/30"
            >
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-primary-500 to-accent-600">
                  <s.icon className="h-5 w-5 text-white" />
                </span>
                <span className="text-xs font-semibold uppercase tracking-wide text-primary-400">
                  {t.step} {i + 1}
                </span>
              </div>
              <h3 className="mt-4 text-sm font-semibold text-white">{s.title}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-neutral-400">{s.desc}</p>
            </StaggerItem>
          ))}
        </StaggerGroup>
      </div>
    </section>
  );
}
