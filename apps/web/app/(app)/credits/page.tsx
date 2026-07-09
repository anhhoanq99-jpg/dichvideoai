import { redirect } from "next/navigation";
import { desc, eq } from "drizzle-orm";
import { Coins, Landmark } from "lucide-react";
import { creditLedger, schema } from "@dichvideo/db";
import { CREDIT_PRICING, VND_PER_CREDIT, type CreditReason } from "@dichvideo/shared";
import { db } from "@/lib/db";
import { getSession } from "@/lib/session";

export const dynamic = "force-dynamic";

const REASON_LABEL: Record<CreditReason, string> = {
  signup_trial: "Tặng khi đăng ký",
  topup: "Nạp tiền",
  job_charge: "Trừ phí xử lý",
  job_refund: "Hoàn phí (job lỗi)",
  admin_adjust: "Điều chỉnh",
};

const PRICE_ROWS = [
  { label: "Trích phụ đề từ giọng nói (STT)", price: `${CREDIT_PRICING.sttPerMin} credits/phút` },
  { label: "Trích phụ đề trên hình (OCR)", price: `${CREDIT_PRICING.ocrPerMin} credits/phút` },
  { label: "Dịch AI sang tiếng Việt", price: `${CREDIT_PRICING.translatePerLine} credits/dòng` },
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

  const ledger = await db
    .select()
    .from(creditLedger)
    .where(eq(creditLedger.userId, session.user.id))
    .orderBy(desc(creditLedger.createdAt))
    .limit(50);

  const code = `DV${session.user.id.slice(0, 8)}`.toUpperCase();
  const bank = process.env.SEPAY_BANK;
  const account = process.env.SEPAY_ACCOUNT;
  const qrUrl =
    bank && account
      ? `https://qr.sepay.vn/img?acc=${encodeURIComponent(account)}&bank=${encodeURIComponent(bank)}&des=${encodeURIComponent(code)}`
      : null;

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">Credits</h1>
        <p className="flex items-center gap-2 rounded-lg bg-indigo-50 px-4 py-2 text-sm font-semibold text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300">
          <Coins className="h-4 w-4" /> Số dư: {(u?.balance ?? 0).toLocaleString("vi-VN")} credits
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Nạp tiền */}
        <section className="rounded-lg border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900">
          <h2 className="flex items-center gap-2 text-sm font-semibold">
            <Landmark className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
            Nạp credits qua chuyển khoản
          </h2>
          <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm text-neutral-600 dark:text-neutral-300">
            <li>
              Chuyển khoản với nội dung:{" "}
              <code className="rounded bg-neutral-100 px-2 py-0.5 font-mono font-semibold text-indigo-700 dark:bg-neutral-800 dark:text-indigo-300">
                {code}
              </code>
            </li>
            <li>
              Tỷ lệ: <b>1.000đ = {(1000 / VND_PER_CREDIT).toLocaleString("vi-VN")} credits</b>{" "}
              — nạp nhiều tặng thêm:
              <span className="mt-1 block text-xs text-neutral-500 dark:text-neutral-400">
                200.000đ +10% · 500.000đ +20% · 1 triệu +40% · 2 triệu +60% · 5 triệu +80%
              </span>
            </li>
            <li>Credits tự cộng trong ~1 phút sau khi tiền vào tài khoản.</li>
          </ol>
          {qrUrl ? (
            <div className="mt-4 flex flex-col items-center gap-2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={qrUrl} alt="QR chuyển khoản" className="h-48 w-48 rounded-lg border border-neutral-200 dark:border-neutral-700" />
              <p className="text-xs text-neutral-400">
                Quét QR — nội dung chuyển khoản đã điền sẵn mã của bạn
              </p>
            </div>
          ) : (
            <p className="mt-4 rounded-md bg-amber-50 px-3 py-2 text-xs text-amber-700 dark:bg-amber-950/40 dark:text-amber-300">
              Tài khoản nhận tiền chưa được cấu hình (SEPAY_BANK / SEPAY_ACCOUNT /
              SEPAY_WEBHOOK_KEY trong .env) — hoàn tất khi đăng ký SePay.
            </p>
          )}
        </section>

        {/* Bảng giá */}
        <section className="rounded-lg border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900">
          <h2 className="text-sm font-semibold">Bảng giá</h2>
          <table className="mt-3 w-full text-sm">
            <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
              {PRICE_ROWS.map((r) => (
                <tr key={r.label}>
                  <td className="py-2 text-neutral-600 dark:text-neutral-300">{r.label}</td>
                  <td className="py-2 text-right font-medium">{r.price}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="mt-2 text-xs text-neutral-400">
            Job lỗi được hoàn lại toàn bộ credits tự động.
          </p>
        </section>
      </div>

      {/* Lịch sử */}
      <section className="rounded-lg border border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900">
        <h2 className="border-b border-neutral-200 px-4 py-3 text-sm font-semibold dark:border-neutral-800">
          Lịch sử giao dịch
        </h2>
        {ledger.length === 0 ? (
          <p className="px-4 py-8 text-center text-sm text-neutral-400">Chưa có giao dịch nào.</p>
        ) : (
          <ul className="divide-y divide-neutral-100 dark:divide-neutral-800">
            {ledger.map((e) => (
              <li key={e.id} className="flex items-center justify-between px-4 py-2.5 text-sm">
                <span className="text-neutral-600 dark:text-neutral-300">
                  {REASON_LABEL[e.reason as CreditReason] ?? e.reason}
                  <span className="ml-2 text-xs text-neutral-400">
                    {e.createdAt?.toLocaleString("vi-VN")}
                  </span>
                </span>
                <span className="flex items-center gap-3">
                  <span
                    className={
                      e.delta >= 0
                        ? "font-semibold text-emerald-600 dark:text-emerald-400"
                        : "font-semibold text-red-600 dark:text-red-400"
                    }
                  >
                    {e.delta >= 0 ? "+" : ""}
                    {e.delta.toLocaleString("vi-VN")}
                  </span>
                  <span className="w-24 text-right text-xs text-neutral-400">
                    dư {e.balanceAfter.toLocaleString("vi-VN")}
                  </span>
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
