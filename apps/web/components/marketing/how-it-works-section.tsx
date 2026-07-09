import { Download, Settings2, UploadCloud, Wand2 } from "lucide-react";

const STEPS = [
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
];

/** Phần 4 — 4 bước hoạt động, dọc trên mobile, ngang trên desktop. */
export function HowItWorksSection() {
  return (
    <section id="cach-hoat-dong" className="scroll-mt-20 border-y border-white/5 bg-white/[0.02] px-4 py-16">
      <div className="mx-auto max-w-6xl">
        <h2 className="text-center text-3xl font-bold text-white sm:text-4xl">
          Bốn bước là xong
        </h2>
        <p className="mx-auto mt-3 max-w-xl text-center text-neutral-400">
          Từ video nước ngoài đến video tiếng Việt hoàn chỉnh — không cần phần mềm edit.
        </p>
        <ol className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {STEPS.map((s, i) => (
            <li key={s.title} className="relative rounded-2xl border border-white/5 bg-[#0b0d14] p-5">
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600">
                  <s.icon className="h-5 w-5 text-white" />
                </span>
                <span className="text-xs font-semibold uppercase tracking-wide text-indigo-400">
                  Bước {i + 1}
                </span>
              </div>
              <h3 className="mt-4 text-sm font-semibold text-white">{s.title}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-neutral-400">{s.desc}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
