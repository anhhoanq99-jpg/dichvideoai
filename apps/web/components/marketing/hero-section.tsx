import Link from "next/link";
import { ArrowRight, PlayCircle, Sparkles } from "lucide-react";
import type { CSSProperties } from "react";
import type { Lang } from "@/lib/i18n";

const T = {
  vi: {
    badge: "Tải video lên — AI tự trích phụ đề, dịch & lồng tiếng",
    h1Before: "VIDEO CỦA BẠN,",
    h1Gradient: "NÓI VÀ HIỂN THỊ MỌI THỨ TIẾNG",
    p: "AI lo trọn: trích phụ đề, dịch chuẩn văn nói, lồng tiếng — sang tiếng Việt và mọi ngôn ngữ. Tiết kiệm thời gian làm video Ads Facebook, TikTok, Review phim, Anime,…",
    cta1: "Bắt đầu miễn phí — tặng 10.000 xu",
    cta2: "Xem cách hoạt động",
    trustPrefix: "Đang được tin dùng bởi",
    trustCount: "2.500+",
    trustSuffix: "nhà sáng tạo nội dung",
    stats: [
      { value: "322+", label: "giọng lồng tiếng" },
      { value: "12", label: "phong cách dịch" },
      { value: "2GB", label: "mỗi video, tới 60 phút" },
    ],
  },
  en: {
    badge: "Upload a video — AI extracts subtitles, translates & dubs",
    h1Before: "YOUR VIDEO,",
    h1Gradient: "SPEAKS EVERY LANGUAGE",
    p: "AI handles it all: subtitle extraction, natural translation, voice-over — into Vietnamese and any language. Save time on Facebook & TikTok ads, movie reviews, anime…",
    cta1: "Start free — 10,000 credits included",
    cta2: "See how it works",
    trustPrefix: "Trusted by",
    trustCount: "2,500+",
    trustSuffix: "content creators",
    stats: [
      { value: "322+", label: "AI voices" },
      { value: "12", label: "translation styles" },
      { value: "2GB", label: "per video, up to 60 min" },
    ],
  },
} as const;

/** style helper: delay hiệu ứng hiện dần theo giây */
function fadeDelay(seconds: number): CSSProperties {
  return { "--reveal-delay": `${seconds}s` } as CSSProperties;
}

/** Phần 2 — hero: các phần tử hiện so le, glow "thở" chậm, CTA có phản hồi chạm. */
export function HeroSection({ lang = "vi" }: { lang?: Lang }) {
  const t = T[lang];
  return (
    <section className="relative overflow-hidden px-4 pb-16 pt-20 sm:pt-28">
      {/* glow nền — phập phồng rất chậm, chỉ opacity/scale nên không giật */}
      <div
        aria-hidden
        className="animate-glow-pulse pointer-events-none absolute -top-40 left-1/2 h-[480px] w-[720px] -translate-x-1/2 rounded-full bg-primary-600/20 blur-3xl"
      />

      <div className="relative mx-auto flex max-w-3xl flex-col items-center text-center">
        <span
          className="animate-fade-up inline-flex items-center gap-1.5 rounded-full border border-primary-500/30 bg-primary-500/10 px-3 py-1 text-xs font-medium text-primary-300"
        >
          <Sparkles className="h-3.5 w-3.5" /> {t.badge}
        </span>

        {/* một dòng duy nhất: cỡ chữ co theo bề rộng màn hình (vw) nên không bao giờ bị ngắt dòng */}
        <h1
          style={fadeDelay(0.12)}
          className="animate-fade-up mt-5 whitespace-nowrap text-[clamp(1rem,4.2vw,3.6rem)] font-bold leading-tight tracking-tight text-white"
        >
          {t.h1Before}{" "}
          <span className="bg-gradient-to-r from-primary-400 via-accent-400 to-fuchsia-400 bg-clip-text text-transparent">
            {t.h1Gradient}
          </span>
        </h1>

        <p
          style={fadeDelay(0.24)}
          className="animate-fade-up mt-5 max-w-xl text-base text-neutral-400 sm:text-lg"
        >
          {t.p}
        </p>

        <div
          style={fadeDelay(0.36)}
          className="animate-fade-up mt-7 flex w-full flex-col gap-3 sm:w-auto sm:flex-row"
        >
          <Link
            href="/videos/upload"
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary-600 px-7 py-3.5 text-sm font-semibold text-white shadow-lg shadow-primary-600/25 transition-all duration-200 hover:scale-[1.03] hover:bg-primary-500 hover:shadow-primary-500/40 active:scale-95"
          >
            {t.cta1} <ArrowRight className="h-4 w-4" />
          </Link>
          <a
            href="#cach-hoat-dong"
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/10 px-7 py-3.5 text-sm font-semibold text-neutral-200 transition-all duration-200 hover:scale-[1.03] hover:bg-white/5 active:scale-95"
          >
            <PlayCircle className="h-4 w-4" /> {t.cta2}
          </a>
        </div>

        {/* social proof — số creator đang dùng */}
        <div
          style={fadeDelay(0.42)}
          className="animate-fade-up mt-7 flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-1.5 text-xs text-neutral-300 sm:text-sm"
        >
          <Sparkles className="h-3.5 w-3.5 text-primary-400" />
          <span>
            {t.trustPrefix} <b className="text-white">{t.trustCount}</b> {t.trustSuffix}
          </span>
        </div>

        <dl className="mt-10 grid w-full grid-cols-3 gap-4">
          {t.stats.map((s, i) => (
            <div
              key={s.label}
              style={fadeDelay(0.48 + i * 0.08)}
              className="animate-fade-up lift rounded-xl border border-white/5 bg-white/[0.03] p-3 sm:p-4"
            >
              <dt className="text-xl font-bold text-white sm:text-2xl">{s.value}</dt>
              <dd className="mt-1 text-[11px] text-neutral-400 sm:text-xs">{s.label}</dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}
