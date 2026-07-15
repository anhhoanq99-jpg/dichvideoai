import { notFound, redirect } from "next/navigation";
import { Shield } from "lucide-react";
import { getSession } from "@/lib/session";
import { getLang } from "@/lib/i18n";
import { isAdminEmail } from "@/lib/admin";
import { AdminDemoClient } from "./admin-demo-client";

export const dynamic = "force-dynamic";

const T = {
  vi: { title: "Quản trị", demoTitle: "Video demo trang chủ" },
  en: { title: "Admin", demoTitle: "Homepage demo videos" },
} as const;

export default async function AdminPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  // không phải admin → 404 (không lộ sự tồn tại của trang)
  if (!isAdminEmail(session.user.email)) notFound();
  const lang = await getLang();
  const t = T[lang];

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <h1 className="flex items-center gap-2.5 text-2xl font-bold tracking-tight">
        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary-50 dark:bg-primary-950/50">
          <Shield className="h-5 w-5 text-primary-600 dark:text-primary-400" />
        </span>
        {t.title}
      </h1>
      <div>
        <h2 className="mb-3 text-sm font-semibold text-neutral-500 dark:text-neutral-400">
          {t.demoTitle}
        </h2>
        <AdminDemoClient lang={lang} />
      </div>
    </div>
  );
}
