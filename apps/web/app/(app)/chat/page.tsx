import { redirect } from "next/navigation";
import { MessagesSquare } from "lucide-react";
import { getSession } from "@/lib/session";
import { getLang } from "@/lib/i18n";
import { isAdminEmail } from "@/lib/admin";
import { ChatClient } from "./chat-client";

export const dynamic = "force-dynamic";

const T = {
  vi: { title: "Trò chuyện" },
  en: { title: "Chat" },
} as const;

export default async function ChatPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  const lang = await getLang();
  const t = T[lang];

  return (
    <div className="mx-auto max-w-4xl space-y-4">
      <h1 className="flex items-center gap-2.5 text-2xl font-bold tracking-tight">
        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary-50 dark:bg-primary-950/50">
          <MessagesSquare className="h-5 w-5 text-primary-600 dark:text-primary-400" />
        </span>
        {t.title}
      </h1>
      <ChatClient isAdmin={isAdminEmail(session.user.email)} lang={lang} />
    </div>
  );
}
