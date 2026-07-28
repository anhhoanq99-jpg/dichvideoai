"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Coins, Pencil, Users } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { inputClass } from "@/components/ui/form-styles";
import { useToast } from "@/components/ui/toaster";
import type { Lang } from "@/lib/i18n";
import { cn } from "@/lib/utils";

export interface AdminUserRow {
  id: string;
  name: string;
  email: string;
  balance: number;
  videos: number;
  topups: number;
  isAdmin: boolean;
  joined: string;
}

const T = {
  vi: {
    totalUsers: "Tổng người dùng",
    colUser: "Người dùng",
    colBalance: "Số dư xu",
    colVideos: "Video",
    colTopup: "Tổng nạp",
    colJoined: "Tham gia",
    colAction: "",
    adminTag: "Admin",
    xu: "xu",
    edit: "Sửa xu",
    modalTitle: (name: string) => `Điều chỉnh xu — ${name}`,
    current: (n: string) => `Số dư hiện tại: ${n} xu`,
    amountLabel: "Số xu",
    amountPh: "Ví dụ: 10000",
    add: "Cộng",
    sub: "Trừ",
    note: "Ghi vào sổ cái dưới dạng admin_adjust — có thể xem trong lịch sử giao dịch của khách.",
    invalid: "Nhập số xu lớn hơn 0",
    done: (n: number) => `Đã ${n > 0 ? "cộng" : "trừ"} ${Math.abs(n).toLocaleString("vi-VN")} xu`,
    failed: "Không điều chỉnh được — thử lại",
  },
  en: {
    totalUsers: "Total users",
    colUser: "User",
    colBalance: "Credit balance",
    colVideos: "Videos",
    colTopup: "Total top-ups",
    colJoined: "Joined",
    colAction: "",
    adminTag: "Admin",
    xu: "credits",
    edit: "Adjust",
    modalTitle: (name: string) => `Adjust credits — ${name}`,
    current: (n: string) => `Current balance: ${n} credits`,
    amountLabel: "Credits",
    amountPh: "e.g. 10000",
    add: "Add",
    sub: "Subtract",
    note: "Recorded in the ledger as admin_adjust — visible in the user's transaction history.",
    invalid: "Enter an amount greater than 0",
    done: (n: number) => `${n > 0 ? "Added" : "Subtracted"} ${Math.abs(n).toLocaleString("en-US")} credits`,
    failed: "Could not adjust — try again",
  },
} as const;

const num = (n: number) => n.toLocaleString("vi-VN");

export function AdminUsersClient({
  users,
  lang = "vi",
}: {
  users: AdminUserRow[];
  lang?: Lang;
}) {
  const t = T[lang];
  const router = useRouter();
  const { toast } = useToast();
  const [editing, setEditing] = useState<AdminUserRow | null>(null);
  const [amount, setAmount] = useState("");
  const [busy, setBusy] = useState(false);

  async function adjust(sign: 1 | -1) {
    if (!editing) return;
    const n = Math.round(Number(amount));
    if (!Number.isFinite(n) || n <= 0) {
      toast(t.invalid, "error");
      return;
    }
    setBusy(true);
    try {
      const res = await fetch(`/api/admin/users/${editing.id}/credits`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ delta: sign * n }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        toast(data?.error ?? t.failed, "error");
        setBusy(false);
        return;
      }
      toast(t.done(sign * n));
      setEditing(null);
      setAmount("");
      router.refresh();
    } catch {
      toast(t.failed, "error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <div className="rounded-2xl border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900">
          <div className="flex items-center gap-2 text-xs font-medium text-neutral-500 dark:text-neutral-400">
            <Users className="h-4 w-4" />
            {t.totalUsers}
          </div>
          <p className="mt-1.5 text-xl font-bold tracking-tight">{num(users.length)}</p>
        </div>
      </div>

      <div className="mt-5 overflow-x-auto rounded-2xl border border-neutral-200 dark:border-neutral-800">
        <table className="w-full min-w-[640px] text-sm">
          <thead className="border-b border-neutral-200 text-left text-xs text-neutral-500 dark:border-neutral-800 dark:text-neutral-400">
            <tr>
              <th className="px-3 py-2.5 font-medium">{t.colUser}</th>
              <th className="px-3 py-2.5 text-right font-medium">{t.colBalance}</th>
              <th className="px-3 py-2.5 text-right font-medium">{t.colVideos}</th>
              <th className="px-3 py-2.5 text-right font-medium">{t.colTopup}</th>
              <th className="px-3 py-2.5 text-right font-medium">{t.colJoined}</th>
              <th className="px-3 py-2.5" />
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr
                key={u.id}
                className="border-b border-neutral-100 last:border-0 dark:border-neutral-800/60"
              >
                <td className="px-3 py-2">
                  <p className="flex items-center gap-1.5 font-medium">
                    {u.name}
                    {u.isAdmin && (
                      <span className="rounded bg-primary-100 px-1.5 py-0.5 text-[10px] font-semibold text-primary-700 dark:bg-primary-950/50 dark:text-primary-300">
                        {t.adminTag}
                      </span>
                    )}
                  </p>
                  <p className="truncate text-xs text-neutral-400">{u.email}</p>
                </td>
                <td className="whitespace-nowrap px-3 py-2 text-right font-semibold tabular-nums">
                  {num(u.balance)} {t.xu}
                </td>
                <td className="px-3 py-2 text-right tabular-nums text-neutral-500 dark:text-neutral-400">
                  {num(u.videos)}
                </td>
                <td className="whitespace-nowrap px-3 py-2 text-right tabular-nums text-neutral-500 dark:text-neutral-400">
                  {u.topups > 0 ? `${num(u.topups)} ${t.xu}` : "—"}
                </td>
                <td className="whitespace-nowrap px-3 py-2 text-right text-xs text-neutral-400">
                  {u.joined}
                </td>
                <td className="px-3 py-2 text-right">
                  <button
                    type="button"
                    onClick={() => {
                      setEditing(u);
                      setAmount("");
                    }}
                    className="inline-flex items-center gap-1 rounded-md border border-neutral-300 px-2 py-1 text-xs font-medium hover:bg-neutral-100 dark:border-neutral-700 dark:hover:bg-neutral-800"
                  >
                    <Pencil className="h-3 w-3" />
                    {t.edit}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {editing && (
        <Modal title={t.modalTitle(editing.name)} onClose={() => setEditing(null)} lang={lang}>
          <p className="flex items-center gap-2 text-sm text-neutral-500 dark:text-neutral-400">
            <Coins className="h-4 w-4" />
            {t.current(num(editing.balance))}
          </p>
          <label className="mt-4 block text-xs font-medium text-neutral-500 dark:text-neutral-400">
            {t.amountLabel}
          </label>
          <input
            type="number"
            min={1}
            inputMode="numeric"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder={t.amountPh}
            className={cn(inputClass, "mt-1 w-full")}
          />
          <div className="mt-4 flex gap-2">
            <Button onClick={() => adjust(1)} disabled={busy} className="flex-1">
              + {t.add}
            </Button>
            <Button variant="danger" onClick={() => adjust(-1)} disabled={busy} className="flex-1">
              − {t.sub}
            </Button>
          </div>
          <p className="mt-3 text-xs text-neutral-400">{t.note}</p>
        </Modal>
      )}
    </>
  );
}
