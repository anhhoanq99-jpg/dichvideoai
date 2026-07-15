"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Lock, Mail, User } from "lucide-react";
import { SIGNUP_TRIAL_CREDITS } from "@dichvideo/shared";
import { BrandLogo } from "@/components/brand-logo";
import { signIn, signUp } from "@/lib/auth-client";
import { LangSwitcher } from "@/components/lang-switcher";
import type { Lang } from "@/lib/i18n";
import { cn } from "@/lib/utils";

const T = {
  vi: {
    title: "Chào mừng trở lại",
    subtitle: "Đăng nhập để tiếp tục dịch video",
    tabGoogle: "Google",
    tabEmail: "Email",
    email: "Email",
    emailPh: "Nhập email của bạn",
    password: "Mật khẩu",
    passwordPh: "Nhập mật khẩu",
    name: "Tên hiển thị",
    namePh: "Tên của bạn",
    signIn: "Đăng nhập →",
    signUp: "Tạo tài khoản →",
    noAccount: "Chưa có tài khoản?",
    hasAccount: "Đã có tài khoản?",
    register: "Đăng ký",
    login: "Đăng nhập",
    googleBtn: "Đăng nhập với Google",
    bonus: `*Đăng ký lần đầu tặng ${SIGNUP_TRIAL_CREDITS.toLocaleString("vi-VN")} xu!`,
    errLogin: "Email hoặc mật khẩu không đúng",
    errSignup: "Không tạo được tài khoản — email có thể đã dùng",
  },
  en: {
    title: "Welcome Back",
    subtitle: "Sign in to continue translating",
    tabGoogle: "Google",
    tabEmail: "Email",
    email: "Email",
    emailPh: "Enter your email",
    password: "Password",
    passwordPh: "Enter your password",
    name: "Display name",
    namePh: "Your name",
    signIn: "Sign In →",
    signUp: "Create account →",
    noAccount: "Don't have an account?",
    hasAccount: "Already have an account?",
    register: "Register",
    login: "Sign in",
    googleBtn: "Sign in with Google",
    bonus: `*New accounts get ${SIGNUP_TRIAL_CREDITS.toLocaleString("en-US")} free credits!`,
    errLogin: "Wrong email or password",
    errSignup: "Could not create account — email may be taken",
  },
} as const;

export function LoginCard({ lang }: { lang: Lang }) {
  const t = T[lang];
  const router = useRouter();
  const [tab, setTab] = useState<"google" | "email">("google");
  const [mode, setMode] = useState<"login" | "register">("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submitEmail(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res =
        mode === "login"
          ? // rememberMe: cookie 30 ngày (không có thì thành cookie phiên — đóng trình duyệt là mất)
            await signIn.email({ email, password, rememberMe: true })
          : await signUp.email({ email, password, name: name.trim() || email.split("@")[0] });
      if (res.error) {
        setError(
          res.error.message ?? (mode === "login" ? t.errLogin : t.errSignup),
        );
        return;
      }
      router.push("/videos/upload");
      router.refresh();
    } catch {
      setError(mode === "login" ? t.errLogin : t.errSignup);
    } finally {
      setBusy(false);
    }
  }

  const inputWrap =
    "flex items-center gap-2 rounded-lg border border-neutral-300 bg-white px-3 py-2.5 text-sm focus-within:border-primary-500 dark:border-neutral-700 dark:bg-neutral-800";

  return (
    <main className="flex min-h-dvh items-center justify-center bg-neutral-50 px-4 dark:bg-neutral-950">
      <div className="w-full max-w-sm rounded-2xl border border-neutral-200 bg-white p-7 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
        <div className="flex items-center justify-between">
          <BrandLogo textClassName="hidden" />
          <LangSwitcher lang={lang} />
        </div>
        <h1 className="mt-4 text-center text-2xl font-bold tracking-tight">
          {t.title}
        </h1>

        {/* tab Google | Email */}
        <div className="mt-5 grid grid-cols-2 border-b border-neutral-200 text-center text-sm font-semibold dark:border-neutral-800">
          {(
            [
              { id: "google", label: t.tabGoogle },
              { id: "email", label: t.tabEmail },
            ] as const
          ).map((tb) => (
            <button
              key={tb.id}
              type="button"
              onClick={() => {
                setTab(tb.id);
                setError(null);
              }}
              className={cn(
                "-mb-px border-b-2 pb-2.5",
                tab === tb.id
                  ? "border-primary-500 text-primary-600 dark:text-primary-400"
                  : "border-transparent text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300",
              )}
            >
              {tb.label}
            </button>
          ))}
        </div>

        {tab === "google" ? (
          <div className="mt-6 space-y-4 text-center">
            <p className="text-sm text-neutral-500 dark:text-neutral-400">
              {t.subtitle}
            </p>
            <button
              type="button"
              onClick={() =>
                signIn.social({ provider: "google", callbackURL: "/videos/upload" })
              }
              className="flex w-full items-center justify-center gap-2 rounded-lg border border-neutral-300 bg-white px-4 py-2.5 text-sm font-medium text-neutral-800 hover:bg-neutral-100 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100 dark:hover:bg-neutral-700"
            >
              <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.27-4.74 3.27-8.1Z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23Z" />
                <path fill="#FBBC05" d="M5.84 14.1a6.6 6.6 0 0 1 0-4.2V7.06H2.18a11 11 0 0 0 0 9.88l3.66-2.84Z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15A11 11 0 0 0 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52Z" />
              </svg>
              {t.googleBtn}
            </button>
          </div>
        ) : (
          <form onSubmit={submitEmail} className="mt-6 space-y-3.5">
            {mode === "register" && (
              <label className="block text-sm">
                <span className="mb-1 block font-medium">{t.name}</span>
                <span className={inputWrap}>
                  <User className="h-4 w-4 shrink-0 text-neutral-400" />
                  <input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder={t.namePh}
                    className="w-full bg-transparent outline-none"
                  />
                </span>
              </label>
            )}
            <label className="block text-sm">
              <span className="mb-1 block font-medium">{t.email}</span>
              <span className={inputWrap}>
                <Mail className="h-4 w-4 shrink-0 text-neutral-400" />
                <input
                  type="email"
                  required
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={t.emailPh}
                  className="w-full bg-transparent outline-none"
                />
              </span>
            </label>
            <label className="block text-sm">
              <span className="mb-1 block font-medium">{t.password}</span>
              <span className={inputWrap}>
                <Lock className="h-4 w-4 shrink-0 text-neutral-400" />
                <input
                  type="password"
                  required
                  minLength={6}
                  autoComplete={mode === "login" ? "current-password" : "new-password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={t.passwordPh}
                  className="w-full bg-transparent outline-none"
                />
              </span>
            </label>

            {error && (
              <p className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700 dark:bg-red-950/40 dark:text-red-300">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={busy}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary-500 py-2.5 text-sm font-bold text-white hover:bg-primary-600 disabled:opacity-60"
            >
              {busy && <Loader2 className="h-4 w-4 animate-spin" />}
              {mode === "login" ? t.signIn : t.signUp}
            </button>

            <p className="text-center text-xs text-neutral-500 dark:text-neutral-400">
              {mode === "login" ? t.noAccount : t.hasAccount}{" "}
              <button
                type="button"
                onClick={() => {
                  setMode(mode === "login" ? "register" : "login");
                  setError(null);
                }}
                className="font-semibold text-primary-600 underline dark:text-primary-400"
              >
                {mode === "login" ? t.register : t.login}
              </button>
            </p>
          </form>
        )}

        <p className="mt-5 text-center text-xs font-semibold text-amber-600 dark:text-amber-400">
          {t.bonus}
        </p>
      </div>
    </main>
  );
}
