"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { usePoll } from "@/hooks/use-poll";
import {
  Check,
  CheckCircle2,
  Copy,
  CreditCard,
  Gift,
  Loader2,
  QrCode,
} from "lucide-react";
import { CREDIT_PRICING, topupPacks } from "@dichvideo/shared";
import { useToast } from "@/components/ui/toaster";
import type { Lang } from "@/lib/i18n";
import { cn } from "@/lib/utils";

function fmt(n: number) {
  return n.toLocaleString("vi-VN");
}

const T = {
  vi: {
    packNames: ["STARTER", "CƠ BẢN", "TIÊU CHUẨN", "CHUYÊN NGHIỆP", "STUDIO", "DOANH NGHIỆP"],
    features: {
      noExpiry: "Xu KHÔNG hết hạn — dùng lúc nào cũng được",
      translate: (n: string) => `Dịch AI: ~${n} dòng phụ đề`,
      stt: (n: string) => `Tách phụ đề từ âm thanh: ~${n} phút`,
      ocr: (n: string) => `Tách phụ đề cứng (OCR): ~${n} phút`,
      dub: (n: string) => `Lồng tiếng video AI: ~${n} phút`,
      full: (n: string) => `Việt hóa trọn gói: ~${n} phút video`,
    },
    toastTopup: (n: string) => `Nạp thành công! +${n} xu đã vào tài khoản 🎉`,
    paidTitle: "Nạp thành công! 🎉",
    paidAmount: (n: string) => `+${n} xu đã vào tài khoản của bạn`,
    paidThanks: "Cảm ơn bạn đã ủng hộ Dịch Video AI ❤️ Chúc bạn làm video thật vui!",
    topupMore: "Nạp thêm",
    methodTitle: "Phương thức thanh toán",
    comingSoon: "Sắp ra mắt",
    qrAlt: "QR chuyển khoản VietQR",
    waiting: "Đang chờ nhận tiền…",
    notConfigured:
      "Tài khoản nhận tiền chưa cấu hình (SEPAY_BANK / SEPAY_ACCOUNT trong .env).",
    manualTitle: "Thông tin chuyển khoản thủ công",
    bank: "Ngân hàng",
    accountNo: "Số tài khoản",
    accountHolder: "Chủ tài khoản",
    amount: "Số tiền",
    receiveCredits: "Nhận Xu",
    transferContent: "Nội dung chuyển khoản (Bắt buộc):",
    copy: "Sao chép",
    transferNote:
      "* Lưu ý: nhập chính xác nội dung để hệ thống tự động cộng tiền (~1 phút sau khi tiền vào).",
    bonusPacks: "Gói Thưởng",
    neverExpire: "Xu không bao giờ hết hạn",
    popular: "Popular",
    bonusExtra: (pct: number) => `+${pct}% Tặng thêm`,
    selected: "✓ Đang chọn — quét QR phía trên để nạp",
  },
  en: {
    packNames: ["STARTER", "BASIC", "STANDARD", "PRO", "STUDIO", "ENTERPRISE"],
    features: {
      noExpiry: "Credits NEVER expire — use them anytime",
      translate: (n: string) => `AI translation: ~${n} subtitle lines`,
      stt: (n: string) => `Speech-to-text extraction: ~${n} minutes`,
      ocr: (n: string) => `Hardcoded subtitle extraction (OCR): ~${n} minutes`,
      dub: (n: string) => `AI video dubbing: ~${n} minutes`,
      full: (n: string) => `Full localization: ~${n} minutes of video`,
    },
    toastTopup: (n: string) => `Top-up successful! +${n} credits added to your account 🎉`,
    paidTitle: "Top-up successful! 🎉",
    paidAmount: (n: string) => `+${n} credits added to your account`,
    paidThanks: "Thank you for supporting Dịch Video AI ❤️ Happy video-making!",
    topupMore: "Top up more",
    methodTitle: "Payment method",
    comingSoon: "Coming soon",
    qrAlt: "VietQR bank transfer QR code",
    waiting: "Waiting for payment…",
    notConfigured:
      "Receiving account not configured (SEPAY_BANK / SEPAY_ACCOUNT in .env).",
    manualTitle: "Manual bank transfer details",
    bank: "Bank",
    accountNo: "Account number",
    accountHolder: "Account holder",
    amount: "Amount",
    receiveCredits: "Credits received",
    transferContent: "Transfer memo (required):",
    copy: "Copy",
    transferNote:
      "* Note: enter the memo exactly so the system can credit you automatically (~1 minute after the money arrives).",
    bonusPacks: "Bonus Packs",
    neverExpire: "Credits never expire",
    popular: "Popular",
    bonusExtra: (pct: number) => `+${pct}% bonus`,
    selected: "✓ Selected — scan the QR above to top up",
  },
} as const;

/** Gói nạp — nguồn duy nhất từ shared, quyền lợi tính từ đơn giá thật. */
const PACKS = topupPacks();

/** Ước tính dùng được bao nhiêu với số credits (từ đơn giá thật, không hardcode). */
function packFeatures(credits: number, lang: Lang): string[] {
  const f = T[lang].features;
  // Việt hóa trọn gói 1 phút ≈ OCR + render + lồng tiếng thường + ~15 dòng dịch
  const fullPerMin =
    CREDIT_PRICING.ocrPerMin +
    CREDIT_PRICING.renderPerMin +
    CREDIT_PRICING.dubEdgePerMin +
    15 * CREDIT_PRICING.translatePerLine;
  return [
    f.noExpiry,
    f.translate(fmt(Math.floor(credits / CREDIT_PRICING.translatePerLine))),
    f.stt(fmt(Math.floor(credits / CREDIT_PRICING.sttPerMin))),
    f.ocr(fmt(Math.floor(credits / CREDIT_PRICING.ocrPerMin))),
    f.dub(fmt(Math.floor(credits / CREDIT_PRICING.dubEdgePerMin))),
    f.full(fmt(Math.floor(credits / fullPerMin))),
  ];
}

interface TopupPanelProps {
  code: string;
  bank: string | null;
  account: string | null;
  accountName: string | null;
  initialBalance: number;
  lang?: Lang;
}

/**
 * Trang nạp tiền kiểu gensubai: tab phương thức → khung QR + thông tin CK thủ
 * công → gói thưởng. Poll số dư 5s/lần — tiền vào là báo ngay không cần F5.
 */
export function TopupPanel({
  code,
  bank,
  account,
  accountName,
  initialBalance,
  lang = "vi",
}: TopupPanelProps) {
  const t = T[lang];
  const [method, setMethod] = useState<"vietqr" | "paypal">("vietqr");
  const [selected, setSelected] = useState(PACKS[0].vnd);
  const [copied, setCopied] = useState<string | null>(null);
  // số xu vừa nhận (khác null → hiện màn cảm ơn thay cho khung QR chờ)
  const [paid, setPaid] = useState<number | null>(null);
  const { toast } = useToast();
  const router = useRouter();
  const balanceRef = useRef(initialBalance);
  const qrSectionRef = useRef<HTMLDivElement>(null);
  const pack = PACKS.find((p) => p.vnd === selected)!;

  const qrUrl =
    bank && account
      ? `https://qr.sepay.vn/img?acc=${encodeURIComponent(account)}&bank=${encodeURIComponent(bank)}&des=${encodeURIComponent(code)}&amount=${selected}`
      : null;

  /**
   * Chờ nhận tiền: hỏi số dư, tăng lên là báo thành công ngay.
   * CHỈ chạy khi đã hiện mã QR và chưa nhận được tiền — trước đây poll vô điều
   * kiện nên kể cả lúc người dùng chưa chọn gói vẫn gọi API 12 lần/phút.
   * usePoll tự tạm dừng khi tab bị ẩn (đỡ pin + 4G cho điện thoại).
   */
  usePoll(
    async () => {
      const res = await fetch("/api/credits/balance");
      if (!res.ok) return;
      const data = await res.json();
      if (typeof data.balance === "number" && data.balance > balanceRef.current) {
        const added = data.balance - balanceRef.current;
        balanceRef.current = data.balance;
        setPaid(added); // hiện màn cảm ơn ở khung QR
        toast(t.toastTopup(fmt(added)));
        router.refresh();
      }
    },
    { intervalMs: 5000, enabled: Boolean(qrUrl) && paid === null },
  );

  function copy(text: string, key: string) {
    void navigator.clipboard.writeText(text).then(() => {
      setCopied(key);
      setTimeout(() => setCopied(null), 1500);
    });
  }

  function pickPack(vnd: number) {
    setSelected(vnd);
    qrSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
  }

  return (
    <div className="space-y-8">
      {/* Phương thức thanh toán */}
      <section className="rounded-2xl border border-neutral-200 bg-white p-5 dark:border-neutral-800 dark:bg-neutral-900">
        <h2 className="text-sm font-semibold">{t.methodTitle}</h2>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <button
            type="button"
            onClick={() => setMethod("vietqr")}
            className={cn(
              "flex items-center justify-center gap-2 rounded-xl border py-3 text-sm font-medium",
              method === "vietqr"
                ? "border-primary-500 bg-primary-50 text-primary-700 dark:bg-primary-950/40 dark:text-primary-300"
                : "border-neutral-200 hover:border-neutral-300 dark:border-neutral-700",
            )}
          >
            <QrCode className="h-4 w-4" /> VietQR (Sepay)
          </button>
          <button
            type="button"
            disabled
            title={t.comingSoon}
            className="flex items-center justify-center gap-2 rounded-xl border border-neutral-200 py-3 text-sm font-medium text-neutral-400 opacity-60 dark:border-neutral-700"
          >
            <CreditCard className="h-4 w-4" /> PayPal
            <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-[10px] font-semibold dark:bg-neutral-800">
              {t.comingSoon}
            </span>
          </button>
        </div>

        {/* QR + thông tin chuyển khoản thủ công */}
        {method === "vietqr" && (
          <div
            ref={qrSectionRef}
            className="mt-4 grid gap-6 rounded-xl border border-dashed border-neutral-300 p-5 sm:grid-cols-2 dark:border-neutral-700"
          >
            <div className="flex flex-col items-center justify-center gap-3">
              {paid !== null ? (
                // đã nhận tiền → màn cảm ơn thay cho QR chờ
                <div className="flex flex-col items-center gap-2 rounded-2xl bg-success-50 px-4 py-8 text-center dark:bg-success-950/30">
                  <CheckCircle2 className="h-14 w-14 text-success-500" />
                  <p className="text-lg font-bold text-success-700 dark:text-success-300">
                    {t.paidTitle}
                  </p>
                  <p className="text-sm font-semibold text-success-600 dark:text-success-400">
                    {t.paidAmount(fmt(paid))}
                  </p>
                  <p className="mt-1 max-w-xs text-xs text-neutral-500 dark:text-neutral-400">
                    {t.paidThanks}
                  </p>
                  <button
                    type="button"
                    onClick={() => setPaid(null)}
                    className="mt-2 rounded-full border border-success-300 px-4 py-1.5 text-xs font-semibold text-success-700 hover:bg-success-100 dark:border-success-800 dark:text-success-300 dark:hover:bg-success-950/50"
                  >
                    {t.topupMore}
                  </button>
                </div>
              ) : qrUrl ? (
                <>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={qrUrl}
                    alt={t.qrAlt}
                    className="h-56 w-56 rounded-xl border border-neutral-200 bg-white p-1 dark:border-neutral-700"
                  />
                  <p className="flex items-center gap-2 rounded-full bg-primary-50 px-4 py-1.5 text-xs font-medium text-primary-700 dark:bg-primary-950/40 dark:text-primary-300">
                    <Loader2 className="h-3.5 w-3.5 animate-spin [animation-duration:2s]" />
                    {t.waiting}
                  </p>
                </>
              ) : (
                <p className="rounded-md bg-amber-50 px-3 py-4 text-center text-xs text-amber-700 dark:bg-amber-950/40 dark:text-amber-300">
                  {t.notConfigured}
                </p>
              )}
            </div>

            <div className="space-y-3 text-sm">
              <p className="border-b border-neutral-200 pb-2 text-xs font-semibold text-neutral-500 dark:border-neutral-700 dark:text-neutral-400">
                {t.manualTitle}
              </p>
              <Row label={t.bank} value={bank ?? "—"} />
              <Row
                label={t.accountNo}
                value={account ?? "—"}
                onCopy={account ? () => copy(account, "acc") : undefined}
                copied={copied === "acc"}
                copyTitle={t.copy}
              />
              {accountName && <Row label={t.accountHolder} value={accountName} />}
              <Row label={t.amount} value={`${fmt(selected)} VND`} highlight />
              <Row
                label={t.receiveCredits}
                value={`+${fmt(pack.credits)}`}
                highlight
              />
              <div>
                <p className="text-xs text-neutral-400">
                  {t.transferContent}
                </p>
                <div className="mt-1 flex items-center gap-2">
                  <span className="flex-1 rounded-md border border-dashed border-primary-400 px-3 py-1.5 text-center font-mono font-bold tracking-wider text-primary-600 dark:text-primary-300">
                    {code}
                  </span>
                  <button
                    type="button"
                    onClick={() => copy(code, "code")}
                    className="flex items-center gap-1 rounded-md border border-neutral-300 px-2.5 py-1.5 text-xs hover:bg-neutral-100 dark:border-neutral-700 dark:hover:bg-neutral-800"
                  >
                    {copied === "code" ? (
                      <Check className="h-3.5 w-3.5 text-success-500" />
                    ) : (
                      <Copy className="h-3.5 w-3.5" />
                    )}
                    {t.copy}
                  </button>
                </div>
                <p className="mt-2 text-xs italic text-red-500">
                  {t.transferNote}
                </p>
              </div>
            </div>
          </div>
        )}
      </section>

      {/* Gói Thưởng */}
      <section>
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="flex items-center gap-2 text-base font-bold">
            <Gift className="h-4 w-4 text-primary-500" /> {t.bonusPacks}
          </h2>
          <span className="rounded-full border border-success-300 px-2.5 py-0.5 text-[11px] font-semibold text-success-600 dark:border-success-800 dark:text-success-400">
            {t.neverExpire}
          </span>
        </div>
        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {PACKS.map((p, i) => (
            <button
              key={p.vnd}
              type="button"
              onClick={() => pickPack(p.vnd)}
              className={cn(
                "relative rounded-2xl border p-4 text-left",
                selected === p.vnd
                  ? "border-primary-500 bg-primary-50/50 shadow-md shadow-primary-500/10 dark:bg-primary-950/30"
                  : "border-neutral-200 bg-white hover:border-neutral-300 dark:border-neutral-800 dark:bg-neutral-900 dark:hover:border-neutral-600",
              )}
            >
              {p.popular && (
                <span className="absolute -top-2.5 left-4 rounded-full bg-primary-600 px-3 py-0.5 text-[10px] font-bold uppercase text-white">
                  {t.popular}
                </span>
              )}
              <p className="text-xs font-bold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
                {t.packNames[i]}
              </p>
              {p.bonus > 0 && (
                <span className="mt-1 inline-block rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-700 dark:bg-amber-950/50 dark:text-amber-300">
                  {t.bonusExtra(p.bonus)}
                </span>
              )}
              <p className="mt-1.5 text-2xl font-extrabold">
                {fmt(p.vnd)} <span className="text-xs font-semibold">VND</span>
              </p>
              <p className="text-sm font-semibold text-primary-600 dark:text-primary-400">
                {fmt(p.credits)} Xu
              </p>
              <ul className="mt-3 space-y-1.5 rounded-lg bg-neutral-50 p-2.5 text-xs text-neutral-600 dark:bg-neutral-800/60 dark:text-neutral-300">
                {packFeatures(p.credits, lang).map((f) => (
                  <li key={f} className="flex items-start gap-1.5">
                    <Check className="mt-0.5 h-3 w-3 shrink-0 text-success-500" />
                    {f}
                  </li>
                ))}
              </ul>
              {selected === p.vnd && (
                <p className="mt-2 text-center text-xs font-semibold text-primary-600 dark:text-primary-400">
                  {t.selected}
                </p>
              )}
            </button>
          ))}
        </div>
      </section>
    </div>
  );
}

function Row({
  label,
  value,
  highlight = false,
  onCopy,
  copied,
  copyTitle,
}: {
  label: string;
  value: string;
  highlight?: boolean;
  onCopy?: () => void;
  copied?: boolean;
  copyTitle?: string;
}) {
  return (
    <div>
      <p className="text-xs text-neutral-400">{label}:</p>
      <p className="mt-0.5 flex items-center gap-2">
        <span
          className={cn(
            "font-bold",
            highlight && "text-amber-600 dark:text-amber-400",
          )}
        >
          {value}
        </span>
        {onCopy && (
          <button
            type="button"
            onClick={onCopy}
            className="flex items-center gap-1 rounded border border-neutral-300 px-1.5 py-0.5 text-[10px] text-neutral-500 hover:bg-neutral-100 dark:border-neutral-700 dark:hover:bg-neutral-800"
            title={copyTitle}
          >
            {copied ? (
              <Check className="h-3 w-3 text-success-500" />
            ) : (
              <Copy className="h-3 w-3" />
            )}
            Copy
          </button>
        )}
      </p>
    </div>
  );
}
