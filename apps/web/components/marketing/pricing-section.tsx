import Link from "next/link";
import { Check, Coins } from "lucide-react";
import { CREDIT_PRICING, topupPacks } from "@dichvideo/shared";
import type { Lang } from "@/lib/i18n";
import { Reveal, StaggerGroup, StaggerItem } from "./reveal";
import { SectionHeading } from "./section-heading";

const T = {
  vi: {
    h2: "Trả theo đúng cái bạn dùng",
    p: "1.000đ = 1.000 credits. Không gói tháng, không phí ẩn — job lỗi hoàn credits 100%. Đăng ký được tặng ngay 10.000 credits dùng thử.",
    serviceHeading: "Đơn giá dịch vụ",
    serviceRows: [
      { label: "Tách phụ đề từ giọng nói", price: `${CREDIT_PRICING.sttPerMin} credits/phút` },
      { label: "Tách phụ đề cứng trên hình", price: `${CREDIT_PRICING.ocrPerMin} credits/phút` },
      { label: "Dịch AI sang tiếng Việt", price: `${CREDIT_PRICING.translatePerLine} credits/dòng` },
      { label: "Render phụ đề + che chữ gốc", price: `${CREDIT_PRICING.renderPerMin} credits/phút` },
      { label: "Lồng tiếng — giọng thường", price: `${CREDIT_PRICING.dubEdgePerMin} credits/phút` },
      { label: "Lồng tiếng — giọng cao cấp", price: `${CREDIT_PRICING.dubGeminiPerMin} credits/phút` },
    ],
    examplePrefix:
      "Ví dụ: video 5 phút, 60 câu — tách chữ trên hình + dịch + render + lồng tiếng thường ≈",
    popular: "Phổ biến nhất",
    receive: "Nhận",
    bonusSuffix: "tặng thêm",
    bullets: ["Credits không hết hạn", "Dùng cho mọi dịch vụ", "Cộng tự động sau ~1 phút"],
    cta: "Nạp ngay",
  },
  en: {
    h2: "Pay only for what you use",
    p: "1,000đ = 1,000 credits. No monthly plans, no hidden fees — failed jobs are refunded 100%. Sign up and get 10,000 free trial credits.",
    serviceHeading: "Service rates",
    serviceRows: [
      { label: "Subtitle extraction from speech", price: `${CREDIT_PRICING.sttPerMin} credits/min` },
      { label: "Hardcoded on-screen subtitle extraction", price: `${CREDIT_PRICING.ocrPerMin} credits/min` },
      { label: "AI translation", price: `${CREDIT_PRICING.translatePerLine} credits/line` },
      { label: "Subtitle render + original text masking", price: `${CREDIT_PRICING.renderPerMin} credits/min` },
      { label: "Dubbing — standard voices", price: `${CREDIT_PRICING.dubEdgePerMin} credits/min` },
      { label: "Dubbing — premium voices", price: `${CREDIT_PRICING.dubGeminiPerMin} credits/min` },
    ],
    examplePrefix:
      "Example: a 5-minute video with 60 lines — on-screen extraction + translation + render + standard dubbing ≈",
    popular: "Most popular",
    receive: "Get",
    bonusSuffix: "bonus",
    bullets: ["Credits never expire", "Works for every service", "Added automatically in ~1 minute"],
    cta: "Top up now",
  },
} as const;

const PACKS = topupPacks();

/** Chi phí ví dụ trong bảng giá: video 5 phút, 60 dòng — OCR + dịch + render + lồng tiếng thường. */
const EXAMPLE_COST_CREDITS =
  5 * CREDIT_PRICING.ocrPerMin +
  60 * CREDIT_PRICING.translatePerLine +
  5 * CREDIT_PRICING.renderPerMin +
  5 * CREDIT_PRICING.dubEdgePerMin;

function formatNumber(n: number) {
  return n.toLocaleString("vi-VN");
}

/** Phần 5 — bảng giá dịch vụ theo credit + các mức nạp kèm % tặng thêm. */
export function PricingSection({ lang = "vi" }: { lang?: Lang }) {
  const t = T[lang];
  return (
    <section id="bang-gia" className="mx-auto max-w-6xl scroll-mt-20 px-4 py-16">
      <SectionHeading title={t.h2} subtitle={t.p} />

      {/* đơn giá dịch vụ */}
      <Reveal
        delay={0.1}
        className="mx-auto mt-10 max-w-2xl rounded-2xl border border-white/5 bg-white/[0.03] p-5"
      >
        <h3 className="flex items-center gap-2 text-sm font-semibold text-white">
          <Coins className="h-4 w-4 text-amber-400" /> {t.serviceHeading}
        </h3>
        <table className="mt-3 w-full text-sm">
          <tbody className="divide-y divide-white/5">
            {t.serviceRows.map((r) => (
              <tr key={r.label}>
                <td className="py-2.5 text-neutral-300">{r.label}</td>
                <td className="py-2.5 text-right font-medium text-white">{r.price}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="mt-2 text-xs text-neutral-500">
          {t.examplePrefix} {formatNumber(EXAMPLE_COST_CREDITS)} credits (~
          {formatNumber(EXAMPLE_COST_CREDITS)}đ).
        </p>
      </Reveal>

      {/* các mức nạp */}
      <StaggerGroup className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {PACKS.map((p) => (
          <StaggerItem
            key={p.vnd}
            lift
            className={
              p.popular
                ? "relative rounded-2xl border border-primary-500/60 bg-primary-500/[0.08] p-5 transition-shadow duration-300 hover:shadow-lg hover:shadow-primary-600/20"
                : "relative rounded-2xl border border-white/5 bg-white/[0.03] p-5 transition-colors duration-300 hover:border-white/15"
            }
          >
            {p.popular && (
              <span className="absolute -top-3 left-5 rounded-full bg-primary-600 px-3 py-0.5 text-xs font-semibold text-white">
                {t.popular}
              </span>
            )}
            <p className="text-2xl font-bold text-white">{formatNumber(p.vnd)}đ</p>
            <p className="mt-1 text-sm font-medium text-amber-400">
              {t.receive} {formatNumber(p.credits)} credits
              {p.bonus > 0 && (
                <span className="ml-2 rounded bg-amber-400/15 px-1.5 py-0.5 text-xs">
                  +{p.bonus}% {t.bonusSuffix}
                </span>
              )}
            </p>
            <ul className="mt-4 space-y-2 text-sm text-neutral-300">
              {t.bullets.map((b) => (
                <li key={b} className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-success-400" /> {b}
                </li>
              ))}
            </ul>
            <Link
              href="/credits"
              className={
                p.popular
                  ? "mt-5 block rounded-xl bg-primary-600 px-4 py-2.5 text-center text-sm font-semibold text-white transition-all duration-200 hover:scale-[1.02] hover:bg-primary-500 active:scale-95"
                  : "mt-5 block rounded-xl border border-white/10 px-4 py-2.5 text-center text-sm font-semibold text-neutral-200 transition-all duration-200 hover:scale-[1.02] hover:bg-white/5 active:scale-95"
              }
            >
              {t.cta}
            </Link>
          </StaggerItem>
        ))}
      </StaggerGroup>
    </section>
  );
}
