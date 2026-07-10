"use client";

import { useState } from "react";
import { Check, Copy, Landmark } from "lucide-react";
import { topupBonusPercent } from "@dichvideo/shared";
import { cn } from "@/lib/utils";

const PACKS = [100_000, 200_000, 500_000, 1_000_000, 2_000_000, 5_000_000].map((vnd) => {
  const bonus = topupBonusPercent(vnd);
  return { vnd, bonus, credits: Math.floor(vnd * (1 + bonus / 100)) };
});

function fmt(n: number) {
  return n.toLocaleString("vi-VN");
}

interface TopupPanelProps {
  code: string;
  bank: string | null;
  account: string | null;
}

/** Chọn gói nạp → QR + thông tin chuyển khoản tự điền số tiền và nội dung. */
export function TopupPanel({ code, bank, account }: TopupPanelProps) {
  const [selected, setSelected] = useState(PACKS[1].vnd);
  const [copied, setCopied] = useState<string | null>(null);
  const pack = PACKS.find((p) => p.vnd === selected)!;

  const qrUrl =
    bank && account
      ? `https://qr.sepay.vn/img?acc=${encodeURIComponent(account)}&bank=${encodeURIComponent(bank)}&des=${encodeURIComponent(code)}&amount=${selected}`
      : null;

  function copy(text: string, key: string) {
    void navigator.clipboard.writeText(text).then(() => {
      setCopied(key);
      setTimeout(() => setCopied(null), 1500);
    });
  }

  return (
    <div className="space-y-5">
      {/* các gói */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
        {PACKS.map((p) => (
          <button
            key={p.vnd}
            type="button"
            onClick={() => setSelected(p.vnd)}
            className={cn(
              "rounded-xl border p-3 text-left transition-all",
              selected === p.vnd
                ? "border-indigo-500 bg-indigo-50 shadow-sm dark:bg-indigo-950/40"
                : "border-neutral-200 hover:border-neutral-300 dark:border-neutral-700",
            )}
          >
            <p className="text-lg font-bold">{fmt(p.vnd)}đ</p>
            <p className="text-xs font-medium text-amber-600 dark:text-amber-400">
              Nhận {fmt(p.credits)} credits
            </p>
            {p.bonus > 0 && (
              <span className="mt-1 inline-block rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold text-amber-700 dark:bg-amber-950/50 dark:text-amber-300">
                +{p.bonus}% tặng thêm
              </span>
            )}
          </button>
        ))}
      </div>

      {/* QR + thông tin CK */}
      <div className="grid gap-5 rounded-xl border border-neutral-200 bg-white p-4 sm:grid-cols-2 dark:border-neutral-800 dark:bg-neutral-900">
        <div className="flex flex-col items-center justify-center gap-2">
          {qrUrl ? (
            <>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={qrUrl}
                alt="QR chuyển khoản"
                className="h-52 w-52 rounded-lg border border-neutral-200 dark:border-neutral-700"
              />
              <p className="text-center text-xs text-neutral-400">
                Quét QR — số tiền và nội dung đã điền sẵn
              </p>
            </>
          ) : (
            <p className="rounded-md bg-amber-50 px-3 py-4 text-center text-xs text-amber-700 dark:bg-amber-950/40 dark:text-amber-300">
              Tài khoản nhận tiền chưa cấu hình (SEPAY_BANK / SEPAY_ACCOUNT trong .env).
              Bạn vẫn chuyển khoản thủ công được theo thông tin bên phải sau khi cấu hình.
            </p>
          )}
        </div>
        <div className="space-y-3 text-sm">
          <p className="flex items-center gap-2 text-xs font-semibold text-neutral-500 dark:text-neutral-400">
            <Landmark className="h-4 w-4" /> Chuyển khoản thủ công
          </p>
          <Row label="Ngân hàng" value={bank ?? "—"} />
          <Row
            label="Số tài khoản"
            value={account ?? "—"}
            onCopy={account ? () => copy(account, "acc") : undefined}
            copied={copied === "acc"}
          />
          <Row label="Số tiền" value={`${fmt(selected)}đ`} highlight />
          <Row
            label="Nội dung CK (bắt buộc)"
            value={code}
            mono
            onCopy={() => copy(code, "code")}
            copied={copied === "code"}
          />
          <p className="rounded-md bg-neutral-50 px-3 py-2 text-xs text-neutral-500 dark:bg-neutral-800/60 dark:text-neutral-400">
            Nhận <b>{fmt(pack.credits)} credits</b>
            {pack.bonus > 0 ? ` (đã gồm +${pack.bonus}% tặng thêm)` : ""} — tự cộng trong
            ~1 phút sau khi tiền vào. Nhập sai nội dung sẽ không được cộng tự động.
          </p>
        </div>
      </div>
    </div>
  );
}

function Row({
  label,
  value,
  mono = false,
  highlight = false,
  onCopy,
  copied,
}: {
  label: string;
  value: string;
  mono?: boolean;
  highlight?: boolean;
  onCopy?: () => void;
  copied?: boolean;
}) {
  return (
    <div>
      <p className="text-xs text-neutral-400">{label}</p>
      <p className="mt-0.5 flex items-center gap-2">
        <span
          className={cn(
            "font-semibold",
            mono && "font-mono text-indigo-600 dark:text-indigo-300",
            highlight && "text-amber-600 dark:text-amber-400",
          )}
        >
          {value}
        </span>
        {onCopy && (
          <button
            type="button"
            onClick={onCopy}
            className="rounded border border-neutral-300 p-1 text-neutral-500 hover:bg-neutral-100 dark:border-neutral-700 dark:hover:bg-neutral-800"
            title="Sao chép"
          >
            {copied ? (
              <Check className="h-3 w-3 text-emerald-500" />
            ) : (
              <Copy className="h-3 w-3" />
            )}
          </button>
        )}
      </p>
    </div>
  );
}
