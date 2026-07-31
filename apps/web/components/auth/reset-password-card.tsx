"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, CheckCircle2, Loader2 } from "lucide-react";
import { BrandLogo } from "@/components/brand-logo";
import { resetPassword } from "@/lib/auth-client";
import { CopyrightLine } from "@/components/copyright-line";
import type { Lang } from "@/lib/i18n";

const T = {
  vi: {
    title: "Đặt mật khẩu mới",
    password: "Mật khẩu mới",
    passwordPh: "Ít nhất 6 ký tự",
    confirm: "Nhập lại mật khẩu",
    submit: "Đổi mật khẩu",
    saving: "Đang lưu…",
    mismatch: "Hai mật khẩu không khớp",
    tooShort: "Mật khẩu tối thiểu 6 ký tự",
    noToken: "Link không hợp lệ hoặc đã hết hạn. Hãy yêu cầu lại.",
    fail: "Không đổi được — link có thể đã hết hạn. Hãy yêu cầu lại.",
    okTitle: "Đổi mật khẩu thành công!",
    okBody: "Bạn có thể đăng nhập bằng mật khẩu mới.",
    toLogin: "Đăng nhập ngay",
    requestNew: "Yêu cầu link mới",
  },
  en: {
    title: "Set a new password",
    password: "New password",
    passwordPh: "At least 6 characters",
    confirm: "Confirm password",
    submit: "Change password",
    saving: "Saving…",
    mismatch: "Passwords do not match",
    tooShort: "Password must be at least 6 characters",
    noToken: "Invalid or expired link. Please request a new one.",
    fail: "Could not reset — the link may have expired. Please request again.",
    okTitle: "Password changed!",
    okBody: "You can now sign in with your new password.",
    toLogin: "Sign in now",
    requestNew: "Request a new link",
  },
} as const;

export function ResetPasswordCard({
  token,
  lang = "vi",
}: {
  token: string | null;
  lang?: Lang;
}) {
  const t = T[lang];
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!token) {
      setError(t.noToken);
      return;
    }
    if (password.length < 6) {
      setError(t.tooShort);
      return;
    }
    if (password !== confirm) {
      setError(t.mismatch);
      return;
    }
    setBusy(true);
    setError(null);
    const { error } = await resetPassword({ newPassword: password, token });
    setBusy(false);
    if (error) {
      setError(t.fail);
      return;
    }
    setDone(true);
    setTimeout(() => router.push("/login"), 2500);
  }

  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-5 bg-neutral-50 px-4 py-8 dark:bg-neutral-950">
      <div className="w-full max-w-sm rounded-2xl border border-neutral-200 bg-white p-7 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
        <BrandLogo textClassName="hidden" />
        {done ? (
          <div className="mt-5 text-center">
            <CheckCircle2 className="mx-auto h-12 w-12 text-success-500" />
            <h1 className="mt-3 text-xl font-bold">{t.okTitle}</h1>
            <p className="mt-2 text-sm text-neutral-500 dark:text-neutral-400">{t.okBody}</p>
            <Link
              href="/login"
              className="mt-6 inline-block rounded-lg bg-primary-700 px-5 py-2 text-sm font-semibold text-white hover:bg-primary-800"
            >
              {t.toLogin}
            </Link>
          </div>
        ) : !token ? (
          <div className="mt-5 text-center">
            <h1 className="text-xl font-bold">{t.title}</h1>
            <p className="mt-3 text-sm text-red-500">{t.noToken}</p>
            <Link
              href="/forgot-password"
              className="mt-5 inline-flex items-center gap-1.5 text-sm font-semibold text-primary-600 hover:text-primary-700 dark:text-primary-400"
            >
              <ArrowLeft className="h-4 w-4" /> {t.requestNew}
            </Link>
          </div>
        ) : (
          <>
            <h1 className="mt-4 text-center text-2xl font-bold tracking-tight">{t.title}</h1>
            <form onSubmit={submit} className="mt-6 space-y-3">
              <div>
                <label className="text-sm font-medium">{t.password}</label>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={t.passwordPh}
                  className="mt-1 w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm outline-none focus:border-primary-500 dark:border-neutral-700 dark:bg-neutral-800"
                />
              </div>
              <div>
                <label className="text-sm font-medium">{t.confirm}</label>
                <input
                  type="password"
                  required
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  placeholder={t.passwordPh}
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
                {busy ? t.saving : t.submit}
              </button>
            </form>
          </>
        )}
      </div>
      <CopyrightLine lang={lang} />
    </main>
  );
}
