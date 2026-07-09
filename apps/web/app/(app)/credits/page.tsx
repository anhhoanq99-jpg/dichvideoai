import { CreditCard } from "lucide-react";

export default function CreditsPage() {
  return (
    <div className="mx-auto max-w-4xl">
      <h1 className="text-2xl font-semibold tracking-tight">Nạp credits</h1>
      <div className="mt-8 flex flex-col items-center justify-center rounded-lg border border-dashed border-neutral-300 py-16 text-center dark:border-neutral-700">
        <CreditCard className="h-8 w-8 text-neutral-400" />
        <p className="mt-3 text-sm text-neutral-500 dark:text-neutral-400">
          Nạp credits qua chuyển khoản ngân hàng sẽ có ở Phase 6 (SePay).
        </p>
      </div>
    </div>
  );
}
