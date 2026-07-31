"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, CheckCircle2, Loader2 } from "lucide-react";
import { BrandLogo } from "@/components/brand-logo";
import { requestPasswordReset } from "@/lib/auth-client";
import { CopyrightLine } from "@/components/copyright-line";
import type { Lang } from "@/lib/i18n";

const T = {
  vi: {
    title: "Quên mật khẩu",
    subtitle: "Nhập email tài khoản — chúng tôi sẽ gửi link đặt lại mật khẩu.",
    email: "Email",
    emailPh: "Nhập email của bạn",
    submit: "Gửi link đặt lại",
    sending: "Đang gửi…",
    backToLogin: "Quay lại đăng nhập",
    sentTitle: "Đã gửi email!",
    sentBody: (email: string) =>
      `Nếu ${email} có tài khoản, chúng tôi vừa gửi link đặt lại mật khẩu. Kiểm tra hộp thư (cả mục Spam).`,
    fail: "Không gửi được, thử lại sau ít phút.",
  },
  en: {
    title: "Forgot password",
    subtitle: "Enter your account email — we'll send a reset link.",
    email: "Email",
    emailPh: "Enter your email",
    submit: "Send reset link",
    sending: "Sending…",
    backToLogin: "Back to sign in",
    sentTitle: "Email sent!",
    sentBody: (email: string) =>
      `If ${email} has an account, we've sent a password reset link. Check your inbox (and Spam).`,
    fail: "Could not send, try again shortly.",
  },
} as const;

export function ForgotPasswordCard({ lang = "vi" }: { lang?: Lang }) {
  const t = T[lang];
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const { error } = await requestPasswordReset({
      email: email.trim(),
      redirectTo: "/reset-password",
    });
    setBusy(false);
    // KHÔNG lộ email có tồn tại hay không — luôn báo "đã gửi" nếu request OK
    if (error) setError(t.fail);
    else setSent(true);
  }

  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-5 bg-neutral-50 px-4 py-8 dark:bg-neutral-950">
      <div className="w-full max-w-sm rounded-2xl border border-neutral-200 bg-white p-7 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
        <BrandLogo textClassName="hidden" />
        {sent ? (
          <div className="mt-5 text-center">
            <CheckCircle2 className="mx-auto h-12 w-12 text-success-500" />
            <h1 className="mt-3 text-xl font-bold">{t.sentTitle}</h1>
            <p className="mt-2 text-sm text-neutral-500 dark:text-neutral-400">
              {t.sentBody(email.trim())}
            </p>
            <Link
              href="/login"
              className="mt-6 inline-flex items-center gap-1.5 text-sm font-semibold text-primary-600 hover:text-primary-700 dark:text-primary-400"
            >
              <ArrowLeft className="h-4 w-4" /> {t.backToLogin}
            </Link>
          </div>
        ) : (
          <>
            <h1 className="mt-4 text-center text-2xl font-bold tracking-tight">{t.title}</h1>
            <p className="mt-2 text-center text-sm text-neutral-500 dark:text-neutral-400">
              {t.subtitle}
            </p>
            <form onSubmit={submit} className="mt-6 space-y-3">
              <div>
                <label className="text-sm font-medium">{t.email}</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={t.emailPh}
                  className="mt-1 w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm outline-none focus:border-primary-500 dark:border-neutral-700 dark:bg-neutral-800"
                />
              </div>
              {error && <p className="text-sm text-red-500">{error}</p>}
              <button
                type="submit"
                disabled={busy}
                className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary-700 py-2.5 text-sm font-semibold text-white hover:bg-primary-800 disabled:opacity-60"
              >
                {busy && <Loader2 className="h-4 w-4 animate-spin" />}
                {busy ? t.sending : t.submit}
              </button>
            </form>
            <Link
              href="/login"
              className="mt-5 flex items-center justify-center gap-1.5 text-sm text-neutral-500 hover:text-neutral-800 dark:text-neutral-400 dark:hover:text-neutral-200"
            >
              <ArrowLeft className="h-4 w-4" /> {t.backToLogin}
            </Link>
          </>
        )}
      </div>
      <CopyrightLine lang={lang} />
    </main>
  );
}
