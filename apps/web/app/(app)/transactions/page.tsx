import { redirect } from "next/navigation";
import { desc, eq } from "drizzle-orm";
import { Receipt } from "lucide-react";
import { creditLedger, schema } from "@dichvideo/db";
import type { CreditReason } from "@dichvideo/shared";
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

export default async function TransactionsPage() {
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
    .limit(200);

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight">
          <Receipt className="h-6 w-6 text-indigo-600 dark:text-indigo-400" />
          Lịch sử giao dịch
        </h1>
        <p className="rounded-lg bg-indigo-50 px-4 py-2 text-sm font-semibold text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300">
          Số dư: {(u?.balance ?? 0).toLocaleString("vi-VN")} credits
        </p>
      </div>

      <div className="overflow-x-auto rounded-lg border border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900">
        {ledger.length === 0 ? (
          <p className="px-4 py-12 text-center text-sm text-neutral-400">
            Chưa có giao dịch nào.
          </p>
        ) : (
          <table className="w-full min-w-[560px] text-sm">
            <thead>
              <tr className="border-b border-neutral-200 text-left text-xs text-neutral-500 dark:border-neutral-800 dark:text-neutral-400">
                <th className="px-4 py-3 font-medium">Thời gian</th>
                <th className="px-4 py-3 font-medium">Loại</th>
                <th className="px-4 py-3 text-right font-medium">Thay đổi</th>
                <th className="px-4 py-3 text-right font-medium">Số dư sau</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
              {ledger.map((e) => (
                <tr key={e.id}>
                  <td className="whitespace-nowrap px-4 py-2.5 text-xs text-neutral-500 dark:text-neutral-400">
                    {e.createdAt?.toLocaleString("vi-VN")}
                  </td>
                  <td className="px-4 py-2.5 text-neutral-600 dark:text-neutral-300">
                    {REASON_LABEL[e.reason as CreditReason] ?? e.reason}
                  </td>
                  <td
                    className={
                      e.delta >= 0
                        ? "px-4 py-2.5 text-right font-semibold text-emerald-600 dark:text-emerald-400"
                        : "px-4 py-2.5 text-right font-semibold text-red-600 dark:text-red-400"
                    }
                  >
                    {e.delta >= 0 ? "+" : ""}
                    {e.delta.toLocaleString("vi-VN")}
                  </td>
                  <td className="px-4 py-2.5 text-right font-mono text-xs text-neutral-500 dark:text-neutral-400">
                    {e.balanceAfter.toLocaleString("vi-VN")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      <p className="text-xs text-neutral-400">Hiển thị 200 giao dịch gần nhất.</p>
    </div>
  );
}
