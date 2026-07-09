"use client";

import { Clapperboard } from "lucide-react";
import { SIGNUP_TRIAL_CREDITS } from "@dichvideo/shared";
import { signIn } from "@/lib/auth-client";

export default function LoginPage() {
  return (
    <main className="flex min-h-dvh items-center justify-center bg-neutral-50 px-4 dark:bg-neutral-950">
      <div className="w-full max-w-sm rounded-xl border border-neutral-200 bg-white p-8 text-center shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
        <Clapperboard className="mx-auto h-10 w-10 text-indigo-600 dark:text-indigo-400" />
        <h1 className="mt-4 text-xl font-semibold tracking-tight">
          Đăng nhập Dịch Video AI
        </h1>
        <p className="mt-2 text-sm text-neutral-500 dark:text-neutral-400">
          Việt hóa &amp; lồng tiếng video bằng AI
        </p>
        <button
          type="button"
          onClick={() =>
            signIn.social({ provider: "google", callbackURL: "/dashboard" })
          }
          className="mt-6 flex w-full items-center justify-center gap-2 rounded-md border border-neutral-300 bg-white px-4 py-2.5 text-sm font-medium text-neutral-800 transition-colors hover:bg-neutral-100 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100 dark:hover:bg-neutral-700"
        >
          <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true">
            <path
              fill="#4285F4"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.27-4.74 3.27-8.1Z"
            />
            <path
              fill="#34A853"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23Z"
            />
            <path
              fill="#FBBC05"
              d="M5.84 14.1a6.6 6.6 0 0 1 0-4.2V7.06H2.18a11 11 0 0 0 0 9.88l3.66-2.84Z"
            />
            <path
              fill="#EA4335"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15A11 11 0 0 0 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52Z"
            />
          </svg>
          Đăng nhập với Google
        </button>
        <p className="mt-4 text-xs text-neutral-400 dark:text-neutral-500">
          Nhận {SIGNUP_TRIAL_CREDITS} credits dùng thử khi đăng ký lần đầu
        </p>
      </div>
    </main>
  );
}
