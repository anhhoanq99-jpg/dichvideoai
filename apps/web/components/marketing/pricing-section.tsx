"use client";

import Link from "next/link";
import { Check, Coins } from "lucide-react";
import { CREDIT_PRICING, topupBonusPercent } from "@dichvideo/shared";
import { Reveal, StaggerGroup, StaggerItem } from "./motion";

const SERVICE_ROWS = [
  { label: "Tách phụ đề từ giọng nói", price: `${CREDIT_PRICING.sttPerMin} credits/phút` },
  { label: "Tách phụ đề cứng trên hình", price: `${CREDIT_PRICING.ocrPerMin} credits/phút` },
  { label: "Dịch AI sang tiếng Việt", price: `${CREDIT_PRICING.translatePerLine} credits/dòng` },
  { label: "Render phụ đề + che chữ gốc", price: `${CREDIT_PRICING.renderPerMin} credits/phút` },
  { label: "Lồng tiếng — giọng thường", price: `${CREDIT_PRICING.dubEdgePerMin} credits/phút` },
  { label: "Lồng tiếng — giọng cao cấp", price: `${CREDIT_PRICING.dubGeminiPerMin} credits/phút` },
];

const PACKS = [100_000, 200_000, 500_000, 1_000_000, 2_000_000, 5_000_000].map(
  (vnd) => {
    const bonus = topupBonusPercent(vnd);
    return {
      vnd,
      bonus,
      credits: Math.floor(vnd * (1 + bonus / 100)),
      popular: vnd === 1_000_000,
    };
  },
);

function fmt(n: number) {
  return n.toLocaleString("vi-VN");
}

/** Phần 5 — bảng giá dịch vụ theo credit + các mức nạp kèm % tặng thêm. */
export function PricingSection() {
  return (
    <section id="bang-gia" className="mx-auto max-w-6xl scroll-mt-20 px-4 py-16">
      <Reveal>
        <h2 className="text-center text-3xl font-bold text-white sm:text-4xl">
          Trả theo đúng cái bạn dùng
        </h2>
        <p className="mx-auto mt-3 max-w-xl text-center text-neutral-400">
          1.000đ = 1.000 credits. Không gói tháng, không phí ẩn — job lỗi hoàn credits 100%.
          Đăng ký được tặng ngay 10.000 credits dùng thử.
        </p>
      </Reveal>

      {/* đơn giá dịch vụ */}
      <Reveal
        delay={0.1}
        className="mx-auto mt-10 max-w-2xl rounded-2xl border border-white/5 bg-white/[0.03] p-5"
      >
        <h3 className="flex items-center gap-2 text-sm font-semibold text-white">
          <Coins className="h-4 w-4 text-amber-400" /> Đơn giá dịch vụ
        </h3>
        <table className="mt-3 w-full text-sm">
          <tbody className="divide-y divide-white/5">
            {SERVICE_ROWS.map((r) => (
              <tr key={r.label}>
                <td className="py-2.5 text-neutral-300">{r.label}</td>
                <td className="py-2.5 text-right font-medium text-white">{r.price}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="mt-2 text-xs text-neutral-500">
          Ví dụ: video 5 phút, 60 câu — tách chữ trên hình + dịch + render + lồng tiếng
          thường ≈ {fmt(5 * CREDIT_PRICING.ocrPerMin + 60 * CREDIT_PRICING.translatePerLine + 5 * CREDIT_PRICING.renderPerMin + 5 * CREDIT_PRICING.dubEdgePerMin)}{" "}
          credits (~
          {fmt(5 * CREDIT_PRICING.ocrPerMin + 60 * CREDIT_PRICING.translatePerLine + 5 * CREDIT_PRICING.renderPerMin + 5 * CREDIT_PRICING.dubEdgePerMin)}
          đ).
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
                ? "relative rounded-2xl border border-indigo-500/60 bg-indigo-500/[0.08] p-5 transition-shadow duration-300 hover:shadow-lg hover:shadow-indigo-600/20"
                : "relative rounded-2xl border border-white/5 bg-white/[0.03] p-5 transition-colors duration-300 hover:border-white/15"
            }
          >
            {p.popular && (
              <span className="absolute -top-3 left-5 rounded-full bg-indigo-600 px-3 py-0.5 text-xs font-semibold text-white">
                Phổ biến nhất
              </span>
            )}
            <p className="text-2xl font-bold text-white">{fmt(p.vnd)}đ</p>
            <p className="mt-1 text-sm font-medium text-amber-400">
              Nhận {fmt(p.credits)} credits
              {p.bonus > 0 && (
                <span className="ml-2 rounded bg-amber-400/15 px-1.5 py-0.5 text-xs">
                  +{p.bonus}% tặng thêm
                </span>
              )}
            </p>
            <ul className="mt-4 space-y-2 text-sm text-neutral-300">
              <li className="flex items-center gap-2">
                <Check className="h-4 w-4 text-emerald-400" /> Credits không hết hạn
              </li>
              <li className="flex items-center gap-2">
                <Check className="h-4 w-4 text-emerald-400" /> Dùng cho mọi dịch vụ
              </li>
              <li className="flex items-center gap-2">
                <Check className="h-4 w-4 text-emerald-400" /> Cộng tự động sau ~1 phút
              </li>
            </ul>
            <Link
              href="/credits"
              className={
                p.popular
                  ? "mt-5 block rounded-xl bg-indigo-600 px-4 py-2.5 text-center text-sm font-semibold text-white transition-all duration-200 hover:scale-[1.02] hover:bg-indigo-500 active:scale-95"
                  : "mt-5 block rounded-xl border border-white/10 px-4 py-2.5 text-center text-sm font-semibold text-neutral-200 transition-all duration-200 hover:scale-[1.02] hover:bg-white/5 active:scale-95"
              }
            >
              Nạp ngay
            </Link>
          </StaggerItem>
        ))}
      </StaggerGroup>
    </section>
  );
}
