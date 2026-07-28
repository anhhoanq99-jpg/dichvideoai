import type { Metadata } from "next";
import { getLang } from "@/lib/i18n";
import { ResetPasswordCard } from "@/components/auth/reset-password-card";

export const metadata: Metadata = {
  title: "Đặt lại mật khẩu — SubVideo AI",
  robots: { index: false },
};

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const [lang, sp] = await Promise.all([getLang(), searchParams]);
  return <ResetPasswordCard token={sp.token ?? null} lang={lang} />;
}
