import type { Metadata } from "next";
import { Clock, Mail, MessageCircle, ShieldCheck } from "lucide-react";
import {
  SUPPORT_EMAIL,
  SUPPORT_EMAIL_URL,
  SUPPORT_ZALO,
  SUPPORT_ZALO_URL,
} from "@dichvideo/shared";
import { SiteHeader } from "@/components/marketing/site-header";
import { SiteFooter } from "@/components/marketing/site-footer";
import { SupportMessageForm } from "@/components/marketing/support-message-form";
import { getLang } from "@/lib/i18n";
import { getSession } from "@/lib/session";

export const metadata: Metadata = {
  title: "Liên hệ hỗ trợ — Dịch Video AI",
  description:
    "Cần hỗ trợ về dịch video, lồng tiếng hoặc nạp xu? Nhắn Zalo 0365797631, email subdubaiglobal@gmail.com, hoặc gửi tin trực tiếp cho admin trong ứng dụng.",
  alternates: { canonical: "/lien-he" },
};

const T = {
  vi: {
    heading: "Liên hệ hỗ trợ",
    lede: "Có vướng mắc khi dịch video, lồng tiếng hay nạp xu? Nhắn cho chúng tôi theo một trong các cách dưới đây.",
    zaloTitle: "Nhắn Zalo",
    zaloDesc: "Nhanh nhất — hỗ trợ trực tiếp, xử lý được cả việc nạp xu chưa vào.",
    zaloCta: "Mở Zalo",
    emailTitle: "Gửi email",
    emailDesc: "Phù hợp cho yêu cầu chi tiết, gửi kèm ảnh/hoá đơn hoặc hợp tác.",
    emailCta: "Soạn email",
    formTitle: "Nhắn trong ứng dụng",
    formDesc:
      "Tin nhắn vào thẳng kênh hỗ trợ riêng giữa bạn và admin, có lưu lại để đối chiếu sau.",
    notes: [
      { icon: "clock", text: "Giờ hỗ trợ: 8:00 – 22:00 hằng ngày." },
      {
        icon: "shield",
        text: "Nạp xu chưa vào tài khoản? Gửi kèm giờ chuyển khoản và 4 số cuối tài khoản — chúng tôi đối soát và cộng bù.",
      },
    ],
  },
  en: {
    heading: "Contact support",
    lede: "Stuck on a translation, a dub, or a credit top-up? Reach us any way below.",
    zaloTitle: "Message on Zalo",
    zaloDesc: "Fastest route — direct support, including top-ups that haven't landed.",
    zaloCta: "Open Zalo",
    emailTitle: "Send an email",
    emailDesc: "Best for detailed requests, attaching screenshots/receipts, or partnerships.",
    emailCta: "Compose email",
    formTitle: "Message in the app",
    formDesc:
      "Goes straight to your private support channel with the admin, and is kept on record.",
    notes: [
      { icon: "clock", text: "Support hours: 8:00 – 22:00 daily." },
      {
        icon: "shield",
        text: "Top-up missing? Include the transfer time and the last 4 digits of your account — we reconcile and credit it.",
      },
    ],
  },
} as const;

export default async function ContactPage() {
  const [lang, session] = await Promise.all([getLang(), getSession()]);
  const t = T[lang];

  return (
    <div className="min-h-screen bg-cinema text-neutral-200">
      <SiteHeader lang={lang} />
      <main className="mx-auto max-w-3xl px-4 py-16">
        <h1 className="text-3xl font-bold text-white">{t.heading}</h1>
        <p className="mt-3 text-sm leading-relaxed text-neutral-400">{t.lede}</p>

        <section className="mt-10">
          <h2 className="text-lg font-semibold text-white">{t.zaloTitle}</h2>
          <p className="mt-1 text-sm text-neutral-400">{t.zaloDesc}</p>
          <a
            href={SUPPORT_ZALO_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-4 inline-flex items-center gap-2 rounded-lg bg-primary-700 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-primary-800"
          >
            <MessageCircle className="h-4 w-4" />
            {t.zaloCta} — {SUPPORT_ZALO}
          </a>
        </section>

        <section className="mt-12">
          <h2 className="text-lg font-semibold text-white">{t.emailTitle}</h2>
          <p className="mt-1 text-sm text-neutral-400">{t.emailDesc}</p>
          <a
            href={SUPPORT_EMAIL_URL}
            className="mt-4 inline-flex items-center gap-2 rounded-lg border border-white/15 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:border-white/30"
          >
            <Mail className="h-4 w-4" />
            {SUPPORT_EMAIL}
          </a>
        </section>

        <section className="mt-12">
          <h2 className="text-lg font-semibold text-white">{t.formTitle}</h2>
          <p className="mt-1 mb-4 text-sm text-neutral-400">{t.formDesc}</p>
          <SupportMessageForm signedIn={Boolean(session)} lang={lang} />
        </section>

        <ul className="mt-12 space-y-3 border-t border-white/5 pt-8">
          {t.notes.map((n) => (
            <li key={n.text} className="flex gap-3 text-sm text-neutral-400">
              {n.icon === "clock" ? (
                <Clock className="mt-0.5 h-4 w-4 shrink-0 text-primary-400" />
              ) : (
                <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-primary-400" />
              )}
              <span>{n.text}</span>
            </li>
          ))}
        </ul>
      </main>
      <SiteFooter lang={lang} />
    </div>
  );
}
