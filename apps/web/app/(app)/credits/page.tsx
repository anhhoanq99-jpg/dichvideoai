import Link from "next/link";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { Coins } from "lucide-react";
import { schema } from "@dichvideo/db";
import { CREDIT_PRICING } from "@dichvideo/shared";
import { db } from "@/lib/db";
import { getSession } from "@/lib/session";
import { getLang } from "@/lib/i18n";
import { TopupPanel } from "@/components/credits/topup-panel";

export const dynamic = "force-dynamic";

/** Thẻ chi phí tham khảo — màu nhấn theo nhóm tính năng (như bảng giá gensubai). */
const CARD_STYLES = [
  {
    icon: "🎬",
    price: CREDIT_PRICING.ocrPerMin,
    tint: "border-amber-200 bg-amber-50 dark:border-amber-900 dark:bg-amber-950/30",
    priceTint: "text-amber-600 dark:text-amber-400",
  },
  {
    icon: "🎙",
    price: CREDIT_PRICING.sttPerMin,
    tint: "border-sky-200 bg-sky-50 dark:border-sky-900 dark:bg-sky-950/30",
    priceTint: "text-sky-600 dark:text-sky-400",
  },
  {
    icon: "⚡",
    price: CREDIT_PRICING.translatePerLine,
    tint: "border-neutral-200 bg-white dark:border-neutral-700 dark:bg-neutral-800/60",
    priceTint: "text-primary-600 dark:text-primary-400",
  },
  {
    icon: "🖼",
    price: CREDIT_PRICING.renderPerMin,
    tint: "border-neutral-200 bg-white dark:border-neutral-700 dark:bg-neutral-800/60",
    priceTint: "text-primary-600 dark:text-primary-400",
  },
  {
    icon: "🎧",
    price: CREDIT_PRICING.dubEdgePerMin,
    tint: "border-success-200 bg-success-50 dark:border-success-900 dark:bg-success-950/30",
    priceTint: "text-success-600 dark:text-success-400",
  },
  {
    icon: "🎧",
    price: CREDIT_PRICING.dubGeminiPerMin,
    tint: "border-success-200 bg-success-50 dark:border-success-900 dark:bg-success-950/30",
    priceTint: "text-success-600 dark:text-success-400",
  },
];

const T = {
  vi: {
    title: "Nạp tiền",
    balance: (n: string) => `Số dư: ${n} credits`,
    priceTitle: "📒 Chi phí thao tác (Tham khảo)",
    cards: [
      { label: "Tách phụ đề cứng (Video OCR)", unit: "credits / phút video" },
      { label: "Tách phụ đề từ âm thanh (STT)", unit: "credits / phút âm thanh" },
      { label: "Dịch AI (mọi ngôn ngữ, mọi model)", unit: "credits / dòng" },
      { label: "Render video (phụ đề + che chữ + logo)", unit: "credits / phút" },
      {
        label: "Lồng tiếng AI — giọng thường / Google / ElevenLabs",
        unit: "credits / phút",
      },
      { label: "Lồng tiếng AI — giọng cao cấp Gemini", unit: "credits / phút" },
    ],
    footnote1: "Credits không hết hạn · job lỗi hoàn 100% tự động · xem chi tiết trừ/hoàn trong",
    footnoteLink: "Lịch sử giao dịch",
  },
  en: {
    title: "Top up",
    balance: (n: string) => `Balance: ${n} credits`,
    priceTitle: "📒 Feature pricing (reference)",
    cards: [
      { label: "Hardcoded subtitle extraction (Video OCR)", unit: "credits / video minute" },
      { label: "Speech-to-text subtitle extraction (STT)", unit: "credits / audio minute" },
      { label: "AI translation (any language, any model)", unit: "credits / line" },
      { label: "Video render (subtitles + masking + logo)", unit: "credits / minute" },
      {
        label: "AI dubbing — standard / Google / ElevenLabs voices",
        unit: "credits / minute",
      },
      { label: "AI dubbing — premium Gemini voices", unit: "credits / minute" },
    ],
    footnote1: "Credits never expire · failed jobs are auto-refunded 100% · see every charge/refund in",
    footnoteLink: "Transaction history",
  },
} as const;

export default async function CreditsPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  const lang = await getLang();
  const t = T[lang];

  const [userRow] = await db
    .select({ balance: schema.user.creditBalance })
    .from(schema.user)
    .where(eq(schema.user.id, session.user.id));

  const code = `DV${session.user.id.slice(0, 8)}`.toUpperCase();
  const balance = userRow?.balance ?? 0;

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold tracking-tight">{t.title}</h1>
        <p className="flex items-center gap-2 rounded-lg bg-primary-50 px-4 py-2 text-sm font-semibold text-primary-700 dark:bg-primary-950/40 dark:text-primary-300">
          <Coins className="h-4 w-4" /> {t.balance(balance.toLocaleString("vi-VN"))}
        </p>
      </div>

      <TopupPanel
        code={code}
        bank={process.env.SEPAY_BANK ?? null}
        account={process.env.SEPAY_ACCOUNT ?? null}
        accountName={process.env.SEPAY_ACCOUNT_NAME ?? null}
        initialBalance={balance}
        lang={lang}
      />

      {/* bảng chi phí tham khảo */}
      <section className="rounded-2xl border border-neutral-200 bg-white p-5 dark:border-neutral-800 dark:bg-neutral-900">
        <h2 className="text-sm font-semibold">{t.priceTitle}</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {CARD_STYLES.map((c, i) => (
            <div key={t.cards[i].label} className={`rounded-xl border p-3.5 ${c.tint}`}>
              <p className="text-xs font-medium text-neutral-600 dark:text-neutral-300">
                {c.icon} {t.cards[i].label}
              </p>
              <p className="mt-1.5">
                <span className={`text-2xl font-extrabold ${c.priceTint}`}>
                  {c.price}
                </span>{" "}
                <span className="text-xs text-neutral-500 dark:text-neutral-400">
                  {t.cards[i].unit}
                </span>
              </p>
            </div>
          ))}
        </div>
        <p className="mt-4 text-xs text-neutral-400">
          {t.footnote1}{" "}
          <Link
            href="/transactions"
            className="underline hover:text-neutral-600 dark:hover:text-neutral-200"
          >
            {t.footnoteLink}
          </Link>
          .
        </p>
      </section>
    </div>
  );
}
