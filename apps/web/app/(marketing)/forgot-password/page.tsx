import type { Metadata } from "next";
import { getLang } from "@/lib/i18n";
import { ForgotPasswordCard } from "@/components/auth/forgot-password-card";

export const metadata: Metadata = {
  title: "Quên mật khẩu — SubVideo AI",
  robots: { index: false },
};

export default async function ForgotPasswordPage() {
  const lang = await getLang();
  return <ForgotPasswordCard lang={lang} />;
}
