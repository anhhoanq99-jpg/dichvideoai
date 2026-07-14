import type { Lang } from "@/lib/i18n";
import { Reveal, StaggerGroup, StaggerItem } from "./reveal";
import { SectionHeading } from "./section-heading";

const T = {
  vi: {
    h2: "Xem kết quả thực tế",
    p: "Một video gốc, một bản tiếng Việt hoàn chỉnh với phụ đề và giọng đọc.",
    original: "Gốc",
    originalTitle: "Video gốc",
    originalDesc: "Nguồn chưa dịch.",
    translated: "Bản dịch",
    translatedTitle: "Bản tiếng Việt",
    translatedDesc: "Phụ đề, lồng tiếng và file MP4 hoàn chỉnh.",
  },
  en: {
    h2: "See real results",
    p: "One source video, one finished Vietnamese version with subtitles and voice-over.",
    original: "Source",
    originalTitle: "Original video",
    originalDesc: "Untranslated source.",
    translated: "Translated",
    translatedTitle: "Vietnamese version",
    translatedDesc: "Subtitles, voice-over and a finished MP4.",
  },
} as const;

const DEMOS = [
  { src: "/demo/goc.mp4", key: "original" as const },
  { src: "/demo/ban-viet.mp4", key: "translated" as const },
];

/** Section so sánh trước/sau: video gốc vs bản Việt hóa hoàn chỉnh — bằng chứng thật. */
export function ResultsSection({ lang = "vi" }: { lang?: Lang }) {
  const t = T[lang];
  return (
    <section className="px-4 py-16 sm:py-20">
      <div className="mx-auto max-w-4xl">
        <SectionHeading title={t.h2} subtitle={t.p} />

        <StaggerGroup className="mt-10 grid gap-6 sm:grid-cols-2">
          {DEMOS.map((d) => {
            const isOriginal = d.key === "original";
            return (
              <StaggerItem key={d.key}>
                <figure className="overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03]">
                  <div className="flex justify-center bg-black/60 p-4">
                    {/* video dọc 9:16 — khóa chiều cao để 2 thẻ cân nhau trên mọi màn hình */}
                    <video
                      src={d.src}
                      controls
                      playsInline
                      preload="metadata"
                      className="max-h-96 w-auto max-w-full rounded-lg"
                    />
                  </div>
                  <figcaption className="border-t border-white/10 p-4">
                    <p
                      className={
                        isOriginal
                          ? "text-xs font-bold uppercase tracking-wider text-neutral-500"
                          : "text-xs font-bold uppercase tracking-wider text-primary-400"
                      }
                    >
                      {isOriginal ? t.original : t.translated}
                    </p>
                    <p className="mt-1 font-semibold text-white">
                      {isOriginal ? t.originalTitle : t.translatedTitle}
                    </p>
                    <p className="mt-0.5 text-sm text-neutral-400">
                      {isOriginal ? t.originalDesc : t.translatedDesc}
                    </p>
                  </figcaption>
                </figure>
              </StaggerItem>
            );
          })}
        </StaggerGroup>

        <Reveal>
          <p className="mt-6 text-center text-xs text-neutral-500">
            {lang === "vi"
              ? "Video demo xử lý 100% tự động bằng Dịch Video AI — không chỉnh tay."
              : "Demo processed 100% automatically by Dịch Video AI — no manual edits."}
          </p>
        </Reveal>
      </div>
    </section>
  );
}
