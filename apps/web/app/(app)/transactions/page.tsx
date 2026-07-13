import { redirect } from "next/navigation";
import { desc, eq } from "drizzle-orm";
import { Receipt } from "lucide-react";
import { creditLedger, schema } from "@dichvideo/db";
import type { CreditReason } from "@dichvideo/shared";
import { db } from "@/lib/db";
import { getSession } from "@/lib/session";
import { getLang } from "@/lib/i18n";

export const dynamic = "force-dynamic";

const T = {
  vi: {
    reason: {
      signup_trial: "Tặng khi đăng ký",
      topup: "Nạp tiền",
      job_charge: "Trừ phí xử lý",
      job_refund: "Hoàn phí (job lỗi)",
      admin_adjust: "Điều chỉnh",
    } as Record<CreditReason, string>,
    title: "Lịch sử giao dịch",
    balance: (n: string) => `Số dư: ${n} credits`,
    empty: "Chưa có giao dịch nào.",
    thTime: "Thời gian",
    thType: "Loại",
    thDelta: "Thay đổi",
    thBalanceAfter: "Số dư sau",
    footnote: "Hiển thị 200 giao dịch gần nhất.",
  },
  en: {
    reason: {
      signup_trial: "Sign-up bonus",
      topup: "Top-up",
      job_charge: "Processing charge",
      job_refund: "Refund (failed job)",
      admin_adjust: "Adjustment",
    } as Record<CreditReason, string>,
    title: "Transaction history",
    balance: (n: string) => `Balance: ${n} credits`,
    empty: "No transactions yet.",
    thTime: "Time",
    thType: "Type",
    thDelta: "Change",
    thBalanceAfter: "Balance after",
    footnote: "Showing the 200 most recent transactions.",
  },
} as const;

export default async function TransactionsPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  const lang = await getLang();
  const t = T[lang];

  const [userRow] = await db
    .select({ balance: schema.user.creditBalance })
    .from(schema.user)
    .where(eq(schema.user.id, session.user.id));

  const ledger = await db
    .select()
    .from(creditLedger)
    .where(eq(creditLedger.userId, session.user.id))
    .orderBy(desc(creditLedger.createdAt))
    .limit(200);

  return (
    <div className="mx-auto max-w-4xl space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="flex items-center gap-2.5 text-2xl font-bold tracking-tight">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary-50 dark:bg-primary-950/50">
            <Receipt className="h-5 w-5 text-primary-600 dark:text-primary-400" />
          </span>
          {t.title}
        </h1>
        <p className="rounded-full bg-primary-600 px-4 py-1.5 text-sm font-semibold text-white shadow-sm">
          {t.balance((userRow?.balance ?? 0).toLocaleString("vi-VN"))}
        </p>
      </div>

      <div className="rounded-2xl border border-neutral-200 bg-white shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
        {ledger.length === 0 ? (
          <p className="px-4 py-12 text-center text-sm text-neutral-400">
            {t.empty}
          </p>
        ) : (
          <>
            {/* Mobile: danh sách card xếp dọc — không phải cuộn ngang */}
            <ul className="divide-y divide-neutral-100 sm:hidden dark:divide-neutral-800">
              {ledger.map((entry) => (
                <li key={entry.id} className="flex items-center justify-between gap-3 px-4 py-3">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-neutral-800 dark:text-neutral-200">
                      {t.reason[entry.reason as CreditReason] ?? entry.reason}
                    </p>
                    <p className="mt-0.5 text-xs text-neutral-400">
                      {entry.createdAt?.toLocaleString("vi-VN")}
                    </p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p
                      className={
                        entry.delta >= 0
                          ? "text-sm font-bold text-success-600 dark:text-success-400"
                          : "text-sm font-bold text-red-600 dark:text-red-400"
                      }
                    >
                      {entry.delta >= 0 ? "+" : ""}
                      {entry.delta.toLocaleString("vi-VN")}
                    </p>
                    <p className="mt-0.5 font-mono text-xs text-neutral-400">
                      {entry.balanceAfter.toLocaleString("vi-VN")}
                    </p>
                  </div>
                </li>
              ))}
            </ul>

            {/* Desktop: bảng đầy đủ 4 cột */}
            <table className="hidden w-full text-sm sm:table">
              <thead>
                <tr className="border-b border-neutral-100 text-left text-xs uppercase tracking-wide text-neutral-400 dark:border-neutral-800 dark:text-neutral-500">
                  <th className="px-5 py-3.5 font-semibold">{t.thTime}</th>
                  <th className="px-5 py-3.5 font-semibold">{t.thType}</th>
                  <th className="px-5 py-3.5 text-right font-semibold">{t.thDelta}</th>
                  <th className="px-5 py-3.5 text-right font-semibold">{t.thBalanceAfter}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
                {ledger.map((entry) => (
                  <tr key={entry.id} className="hover:bg-neutral-50 dark:hover:bg-neutral-800/40">
                    <td className="whitespace-nowrap px-5 py-3 text-xs text-neutral-500 dark:text-neutral-400">
                      {entry.createdAt?.toLocaleString("vi-VN")}
                    </td>
                    <td className="px-5 py-3 font-medium text-neutral-700 dark:text-neutral-300">
                      {t.reason[entry.reason as CreditReason] ?? entry.reason}
                    </td>
                    <td
                      className={
                        entry.delta >= 0
                          ? "px-5 py-3 text-right font-bold text-success-600 dark:text-success-400"
                          : "px-5 py-3 text-right font-bold text-red-600 dark:text-red-400"
                      }
                    >
                      {entry.delta >= 0 ? "+" : ""}
                      {entry.delta.toLocaleString("vi-VN")}
                    </td>
                    <td className="px-5 py-3 text-right font-mono text-xs text-neutral-500 dark:text-neutral-400">
                      {entry.balanceAfter.toLocaleString("vi-VN")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        )}
      </div>
      <p className="text-xs text-neutral-400">{t.footnote}</p>
    </div>
  );
}
