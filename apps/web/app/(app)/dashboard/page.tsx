import { eq } from "drizzle-orm";
import { Coins } from "lucide-react";
import { user } from "@dichvideo/db";
import { db } from "@/lib/db";
import { getSession } from "@/lib/session";
import { getLang } from "@/lib/i18n";

const T = {
  vi: {
    hello: "Xin chào",
    subtitle: "Tải video lên để bắt đầu Việt hóa — tính năng upload sẽ có ở Phase 2.",
    balance: "Số dư credits",
  },
  en: {
    hello: "Hello",
    subtitle: "Upload a video to start localizing — the upload feature arrives in Phase 2.",
    balance: "Credit balance",
  },
} as const;

export default async function DashboardPage() {
  const session = (await getSession())!;
  const lang = await getLang();
  const t = T[lang];

  const [row] = await db
    .select({ creditBalance: user.creditBalance })
    .from(user)
    .where(eq(user.id, session.user.id));

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          {t.hello}, {session.user.name}
        </h1>
        <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
          {t.subtitle}
        </p>
      </div>

      <div className="inline-flex items-center gap-3 rounded-lg border border-neutral-200 bg-white px-4 py-3 dark:border-neutral-800 dark:bg-neutral-900">
        <Coins className="h-5 w-5 text-amber-500" />
        <div>
          <p className="text-xs text-neutral-500 dark:text-neutral-400">
            {t.balance}
          </p>
          <p className="text-lg font-semibold">{row?.creditBalance ?? 0}</p>
        </div>
      </div>
    </div>
  );
}
