"use client";

import { useState } from "react";
import Link from "next/link";
import { CheckCircle2, Send } from "lucide-react";
import type { Lang } from "@/lib/i18n";
import { Button } from "@/components/ui/button";

const T = {
  vi: {
    label: "Nội dung cần hỗ trợ",
    placeholder:
      "Ví dụ: tôi đã chuyển khoản 100.000đ lúc 14:20 nhưng chưa thấy xu vào tài khoản…",
    send: "Gửi cho admin",
    sending: "Đang gửi…",
    sent: "Đã gửi! Admin sẽ trả lời trong kênh hỗ trợ của bạn.",
    openChat: "Mở kênh hỗ trợ",
    needLogin: "Đăng nhập để nhắn thẳng cho admin — tin nhắn lưu trong tài khoản của bạn.",
    login: "Đăng nhập",
    empty: "Hãy nhập nội dung trước khi gửi.",
    fail: "Gửi không được — thử lại hoặc nhắn qua Zalo.",
    counter: (n: number) => `${n}/1.000 ký tự`,
  },
  en: {
    label: "How can we help?",
    placeholder:
      "e.g. I transferred 100,000₫ at 14:20 but the credits haven't arrived…",
    send: "Send to admin",
    sending: "Sending…",
    sent: "Sent! The admin will reply in your support channel.",
    openChat: "Open support channel",
    needLogin: "Sign in to message the admin directly — messages are kept in your account.",
    login: "Sign in",
    empty: "Please write something first.",
    fail: "Could not send — try again or reach us on Zalo.",
    counter: (n: number) => `${n}/1,000 characters`,
  },
} as const;

const MAX = 1000;

/**
 * Form nhắn thẳng cho admin, dùng lại đúng kênh hỗ trợ sẵn có
 * (POST /api/chat room="support" → phòng riêng "support:<userId>").
 * Không dựng bảng "contact_submissions" riêng: khách nhắn ở đây hay ở trang
 * Chat đều rơi vào cùng một hộp thư, admin không phải nhớ hai chỗ.
 */
export function SupportMessageForm({
  signedIn,
  lang = "vi",
}: {
  signedIn: boolean;
  lang?: Lang;
}) {
  const t = T[lang];
  const [draft, setDraft] = useState("");
  const [state, setState] = useState<"idle" | "sending" | "sent">("idle");
  const [error, setError] = useState<string | null>(null);

  if (!signedIn) {
    return (
      <div className="rounded-xl border border-white/10 bg-white/5 p-5">
        <p className="text-sm text-neutral-300">{t.needLogin}</p>
        <Link
          href="/login"
          className="mt-4 inline-flex items-center gap-2 rounded-lg bg-primary-700 px-5 py-2 text-sm font-semibold text-white transition-colors hover:bg-primary-800"
        >
          {t.login}
        </Link>
      </div>
    );
  }

  if (state === "sent") {
    return (
      <div className="rounded-xl border border-success-700/40 bg-success-950/30 p-5">
        <p className="flex items-center gap-2 text-sm font-semibold text-success-300">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          {t.sent}
        </p>
        <Link
          href="/chat"
          className="mt-4 inline-flex items-center gap-2 rounded-lg border border-white/15 px-5 py-2 text-sm font-semibold text-white transition-colors hover:border-white/30"
        >
          {t.openChat}
        </Link>
      </div>
    );
  }

  async function send() {
    const body = draft.trim();
    if (!body) {
      setError(t.empty);
      return;
    }
    setState("sending");
    setError(null);
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ room: "support", body }),
      });
      if (!res.ok) {
        // route trả { error } tiếng Việt cho cả 429 (gửi quá nhanh)
        const data = await res.json().catch(() => null);
        setError(data?.error ?? t.fail);
        setState("idle");
        return;
      }
      setDraft("");
      setState("sent");
    } catch {
      setError(t.fail);
      setState("idle");
    }
  }

  return (
    <div className="rounded-xl border border-white/10 bg-white/5 p-5">
      <label htmlFor="support-body" className="block text-sm font-medium text-white">
        {t.label}
      </label>
      <textarea
        id="support-body"
        rows={5}
        maxLength={MAX}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        placeholder={t.placeholder}
        className="mt-2 w-full rounded-lg border border-white/10 bg-cinema/60 px-3 py-2 text-sm text-neutral-100 placeholder:text-neutral-500 focus:border-primary-500 focus:outline-none"
      />
      <div className="mt-3 flex items-center justify-between gap-4">
        <span className="text-xs text-neutral-500">{t.counter(draft.length)}</span>
        <Button onClick={send} disabled={state === "sending"}>
          <Send className="h-4 w-4" />
          {state === "sending" ? t.sending : t.send}
        </Button>
      </div>
      {error && <p className="mt-3 text-sm text-red-400">{error}</p>}
    </div>
  );
}
