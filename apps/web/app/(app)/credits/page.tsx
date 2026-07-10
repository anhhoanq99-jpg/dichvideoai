import Link from "next/link";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { Coins } from "lucide-react";
import { schema } from "@dichvideo/db";
import { CREDIT_PRICING } from "@dichvideo/shared";
import { db } from "@/lib/db";
import { getSession } from "@/lib/session";
import { TopupPanel } from "@/components/credits/topup-panel";

export const dynamic = "force-dynamic";

const PRICE_ROWS = [
  { label: "Tách phụ đề từ giọng nói (STT)", price: `${CREDIT_PRICING.sttPerMin} credits/phút` },
  { label: "Tách phụ đề cứng trên hình (OCR)", price: `${CREDIT_PRICING.ocrPerMin} credits/phút` },
  { label: "Dịch AI (mọi ngôn ngữ)", price: `${CREDIT_PRICING.translatePerLine} credits/dòng` },
  { label: "Render video (phụ đề + che chữ)", price: `${CREDIT_PRICING.renderPerMin} credits/phút` },
  { label: "Lồng tiếng — giọng thường", price: `${CREDIT_PRICING.dubEdgePerMin} credits/phút` },
  { label: "Lồng tiếng — giọng cao cấp AI", price: `${CREDIT_PRICING.dubGeminiPerMin} credits/phút` },
];

export default async function CreditsPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const [u] = await db
    .select({ balance: schema.user.creditBalance })
    .from(schema.user)
    .where(eq(schema.user.id, session.user.id));

  const code = `DV${session.user.id.slice(0, 8)}`.toUpperCase();

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">Nạp tiền</h1>
        <p className="flex items-center gap-2 rounded-lg bg-indigo-50 px-4 py-2 text-sm font-semibold text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300">
          <Coins className="h-4 w-4" /> Số dư: {(u?.balance ?? 0).toLocaleString("vi-VN")} credits
        </p>
      </div>

      <TopupPanel
        code={code}
        bank={process.env.SEPAY_BANK ?? null}
        account={process.env.SEPAY_ACCOUNT ?? null}
      />

      {/* bảng giá tham khảo */}
      <section className="rounded-xl border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900">
        <h2 className="text-sm font-semibold">Chi phí thao tác (tham khảo)</h2>
        <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {PRICE_ROWS.map((r) => (
            <div
              key={r.label}
              className="rounded-lg border border-neutral-100 bg-neutral-50 px-3 py-2.5 dark:border-neutral-800 dark:bg-neutral-800/50"
            >
              <p className="text-xs text-neutral-500 dark:text-neutral-400">{r.label}</p>
              <p className="mt-0.5 text-sm font-semibold">{r.price}</p>
            </div>
          ))}
        </div>
        <p className="mt-3 text-xs text-neutral-400">
          Credits không hết hạn · job lỗi hoàn 100% tự động · xem chi tiết trừ/hoàn trong{" "}
          <Link href="/transactions" className="underline hover:text-neutral-600 dark:hover:text-neutral-200">
            Lịch sử giao dịch
          </Link>
          .
        </p>
      </section>
    </div>
  );
}
