import { ArrowRight, Flame, Globe, Share2, Wrench } from "lucide-react";
import Link from "next/link";
import { VIDEO_SOURCES, VIDEO_SOURCE_CATEGORIES } from "@dichvideo/shared";
import type { Lang } from "@/lib/i18n";
import { Reveal, StaggerGroup, StaggerItem } from "./reveal";
import { SectionHeading } from "./section-heading";

const T = {
  vi: {
    h2: "Nguồn video",
    p: "Tải video gốc về máy theo một trong các cách dưới đây, rồi tải lên — hệ thống tự chạy trọn pipeline: trích phụ đề, dịch, lồng tiếng.",
    methods: [
      {
        icon: Globe,
        title: "Trình duyệt Cốc Cốc",
        desc: "Mở video trên Cốc Cốc, bấm nút “Tải xuống” hiện ngay trên trình phát — cách nhanh nhất, dùng được với hầu hết các trang.",
      },
      {
        icon: Share2,
        title: "Nút chia sẻ trong app",
        desc: "Douyin, TikTok, Kuaishou…: bấm Chia sẻ → “Lưu video” để tải video công khai về điện thoại, rồi chuyển sang máy tính.",
      },
      {
        icon: Wrench,
        title: "Công cụ tải online",
        desc: "Tìm “snaptik”, “savett”, “bilibili downloader”… — dán link video vào là tải được bản sạch không logo.",
      },
    ],
    cta: "Đã có video? Tải lên & Việt hóa ngay",
    more: "…và hơn 1.800 trang khác — cứ có file video là Việt hóa được.",
  },
  en: {
    h2: "Video sources",
    p: "Save the original video to your device using any method below, then upload it — the system runs the full pipeline: subtitle extraction, translation, dubbing.",
    methods: [
      {
        icon: Globe,
        title: "Cốc Cốc browser",
        desc: "Open the video in Cốc Cốc and hit the “Download” button right on the player — the fastest way, works on most sites.",
      },
      {
        icon: Share2,
        title: "In-app share button",
        desc: "Douyin, TikTok, Kuaishou…: tap Share → “Save video” to download public videos to your phone, then move them to your computer.",
      },
      {
        icon: Wrench,
        title: "Online download tools",
        desc: "Search for “snaptik”, “savett”, “bilibili downloader”… — paste the video link to get a clean, watermark-free file.",
      },
    ],
    cta: "Got the video? Upload & localize now",
    more: "…plus 1,800+ more sites — if you have the video file, we can localize it.",
  },
} as const;

/** Phần Nguồn video — hướng dẫn tự tải video về + danh mục nền tảng theo khu vực. */
export function VideoSourcesSection({ lang = "vi" }: { lang?: Lang }) {
  const t = T[lang];
  return (
    <section
      id="nguon-video"
      className="scroll-mt-20 border-y border-white/5 bg-white/[0.02] px-4 py-16"
    >
      <div className="mx-auto max-w-6xl">
        <SectionHeading title={t.h2} subtitle={t.p} />

        {/* 3 cách lấy video về máy */}
        <StaggerGroup className="mt-10 grid gap-4 sm:grid-cols-3">
          {t.methods.map((m) => (
            <StaggerItem
              key={m.title}
              lift
              className="rounded-2xl border border-white/5 bg-white/[0.03] p-5 transition-colors duration-300 hover:border-primary-500/40"
            >
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-500/15">
                <m.icon className="h-5 w-5 text-primary-400" />
              </span>
              <h3 className="mt-4 text-sm font-semibold text-white">{m.title}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-neutral-400">{m.desc}</p>
            </StaggerItem>
          ))}
        </StaggerGroup>

        <Reveal delay={0.15} className="mt-8 text-center">
          <Link
            href="/videos/upload"
            className="inline-flex items-center gap-2 rounded-xl bg-primary-600 px-7 py-3 text-sm font-semibold text-white transition-all duration-200 hover:scale-[1.03] hover:bg-primary-500 active:scale-95"
          >
            {t.cta} <ArrowRight className="h-4 w-4" />
          </Link>
        </Reveal>

        {/* danh mục nền tảng theo khu vực */}
        <StaggerGroup className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {VIDEO_SOURCE_CATEGORIES.map((cat) => (
            <StaggerItem
              key={cat.id}
              lift
              className="rounded-2xl border border-white/5 bg-cinema p-5 transition-colors duration-300 hover:border-primary-500/30"
            >
              <h3 className="text-xs font-semibold uppercase tracking-wide text-primary-400">
                {cat[lang]}
              </h3>
              <ul className="mt-3 space-y-2">
                {VIDEO_SOURCES.filter((s) => s.category === cat.id).map((s) => (
                  <li
                    key={s.id}
                    className="flex items-center justify-between gap-2 text-sm text-neutral-300"
                  >
                    <span className="flex items-center gap-1.5">
                      {s.name}
                      {s.popular && (
                        <Flame className="h-3.5 w-3.5 text-amber-400" aria-label="Hot" />
                      )}
                    </span>
                    <span className="truncate text-xs text-neutral-600">{s.hosts[0]}</span>
                  </li>
                ))}
              </ul>
            </StaggerItem>
          ))}
        </StaggerGroup>

        <p className="mt-6 text-center text-sm text-neutral-500">{t.more}</p>
      </div>
    </section>
  );
}
