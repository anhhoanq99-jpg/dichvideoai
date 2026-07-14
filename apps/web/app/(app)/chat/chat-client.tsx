"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Headset, Send, Users } from "lucide-react";
import type { Lang } from "@/lib/i18n";
import { inputClass } from "@/components/ui/form-styles";
import { cn } from "@/lib/utils";
import { CommunityFeed } from "./community-feed";

const T = {
  vi: {
    community: "Cộng đồng",
    support: "Chat với Admin",
    supportHint: "Kênh riêng giữa bạn và admin — cần hỗ trợ gì cứ nhắn, admin sẽ trả lời sớm.",
    threadsTitle: "Kênh hỗ trợ",
    emptySupport: "Chưa có tin nhắn — nhắn gì đó cho admin nhé.",
    emptyThreads: "Chưa có user nào nhắn hỗ trợ.",
    placeholder: "Nhập tin nhắn…",
    send: "Gửi",
    admin: "Admin",
    you: "Bạn",
    sendFail: "Gửi không được — thử lại",
  },
  en: {
    community: "Community",
    support: "Chat with Admin",
    supportHint: "Private channel between you and the admin — ask anything.",
    threadsTitle: "Support threads",
    emptySupport: "No messages yet — send the admin a note.",
    emptyThreads: "No support threads yet.",
    placeholder: "Type a message…",
    send: "Send",
    admin: "Admin",
    you: "You",
    sendFail: "Could not send — try again",
  },
} as const;

interface ChatMessage {
  id: string;
  body: string;
  isAdmin: boolean;
  createdAt: string;
  userId: string;
  userName: string;
  userImage: string | null;
}

interface Thread {
  userId: string;
  name: string;
  email: string;
  lastAt: string | null;
}

const POLL_MS = 4000;

interface ChatClientProps {
  isAdmin: boolean;
  lang?: Lang;
}

/**
 * Hai kênh: Cộng đồng (bài đăng + bình luận, xem CommunityFeed)
 * và Hỗ trợ (chat riêng user ↔ admin, polling).
 */
export function ChatClient({ isAdmin, lang = "vi" }: ChatClientProps) {
  const t = T[lang];
  const [tab, setTab] = useState<"community" | "support">("community");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [me, setMe] = useState<string>("");
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // admin: kênh hỗ trợ của user nào đang mở
  const [threads, setThreads] = useState<Thread[]>([]);
  const [threadUser, setThreadUser] = useState<string | null>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const stickToBottom = useRef(true);

  const load = useCallback(async () => {
    try {
      const params = new URLSearchParams({ room: "support" });
      if (isAdmin && threadUser) params.set("u", threadUser);
      const res = await fetch(`/api/chat?${params}`);
      if (!res.ok) return;
      const data = await res.json();
      setMe(data.me);
      setMessages(data.messages);
    } catch {
      /* mạng chập chờn — giữ tin cũ, lần poll sau thử lại */
    }
  }, [isAdmin, threadUser]);

  const loadThreads = useCallback(async () => {
    if (!isAdmin) return;
    try {
      const res = await fetch("/api/chat/threads");
      if (!res.ok) return;
      const data = await res.json();
      setThreads(data.threads);
      // tự mở kênh mới nhất nếu chưa chọn
      if (!threadUser && data.threads[0]) setThreadUser(data.threads[0].userId);
    } catch {
      /* thử lại ở lần poll sau */
    }
  }, [isAdmin, threadUser]);

  // chỉ kênh hỗ trợ mới poll — feed cộng đồng tự quản lý dữ liệu
  useEffect(() => {
    if (tab !== "support") return;
    load();
    loadThreads();
    const timer = setInterval(() => {
      load();
      loadThreads();
    }, POLL_MS);
    return () => clearInterval(timer);
  }, [load, loadThreads, tab]);

  // tự cuộn xuống cuối khi có tin mới (chỉ khi user đang ở đáy)
  useEffect(() => {
    const el = listRef.current;
    if (el && stickToBottom.current) el.scrollTop = el.scrollHeight;
  }, [messages]);

  async function send() {
    const body = draft.trim();
    if (!body || sending) return;
    setSending(true);
    setError(null);
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          room: "support",
          body,
          ...(isAdmin && threadUser ? { u: threadUser } : {}),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? t.sendFail);
        return;
      }
      setDraft("");
      stickToBottom.current = true;
      await load();
    } catch {
      setError(t.sendFail);
    } finally {
      setSending(false);
    }
  }

  const tabs = [
    { id: "community" as const, label: t.community, icon: Users },
    { id: "support" as const, label: t.support, icon: Headset },
  ];

  return (
    <div className="space-y-3">
      {/* chọn kênh */}
      <div className="flex items-center gap-1 self-start rounded-full border border-neutral-200 p-1 text-sm dark:border-neutral-700">
        {tabs.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            className={cn(
              "flex items-center gap-1.5 rounded-full px-4 py-1.5 font-semibold transition-colors",
              tab === id
                ? "bg-primary-600 text-white"
                : "text-neutral-500 hover:bg-neutral-100 dark:text-neutral-400 dark:hover:bg-neutral-800",
            )}
          >
            <Icon className="h-4 w-4" /> {label}
          </button>
        ))}
      </div>

      {tab === "community" ? (
        <CommunityFeed lang={lang} />
      ) : (
        <div className="flex h-[calc(100dvh-13.5rem)] min-h-96 flex-col gap-3">
          <p className="text-xs text-neutral-400">{t.supportHint}</p>

          <div className="flex min-h-0 flex-1 gap-3">
            {/* admin: danh sách kênh hỗ trợ bên trái */}
            {isAdmin && (
              <aside className="hidden w-56 shrink-0 overflow-y-auto rounded-2xl border border-neutral-200 bg-white p-2 sm:block dark:border-neutral-800 dark:bg-neutral-900">
                <p className="px-2 pb-1.5 text-[11px] font-semibold uppercase tracking-wider text-neutral-400">
                  {t.threadsTitle}
                </p>
                {threads.length === 0 && (
                  <p className="px-2 text-xs text-neutral-400">{t.emptyThreads}</p>
                )}
                {threads.map((th) => (
                  <button
                    key={th.userId}
                    type="button"
                    onClick={() => {
                      setThreadUser(th.userId);
                      setMessages([]);
                    }}
                    className={cn(
                      "block w-full rounded-xl px-2.5 py-2 text-left text-sm transition-colors",
                      threadUser === th.userId
                        ? "bg-primary-50 font-semibold text-primary-700 dark:bg-primary-950/60 dark:text-primary-300"
                        : "hover:bg-neutral-100 dark:hover:bg-neutral-800",
                    )}
                  >
                    <span className="block truncate">{th.name}</span>
                    <span className="block truncate text-xs font-normal text-neutral-400">
                      {th.email}
                    </span>
                  </button>
                ))}
              </aside>
            )}

            {/* khung tin nhắn */}
            <div className="flex min-w-0 flex-1 flex-col rounded-2xl border border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900">
              <div
                ref={listRef}
                onScroll={(e) => {
                  const el = e.currentTarget;
                  stickToBottom.current =
                    el.scrollHeight - el.scrollTop - el.clientHeight < 60;
                }}
                className="min-h-0 flex-1 space-y-3 overflow-y-auto p-4"
              >
                {messages.length === 0 && (
                  <p className="py-10 text-center text-sm text-neutral-400">{t.emptySupport}</p>
                )}
                {messages.map((m) => {
                  const mine = m.userId === me;
                  return (
                    <div key={m.id} className={cn("flex gap-2.5", mine && "flex-row-reverse")}>
                      {m.userImage ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={m.userImage}
                          alt=""
                          className="h-8 w-8 shrink-0 rounded-full"
                          referrerPolicy="no-referrer"
                        />
                      ) : (
                        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary-100 text-xs font-bold text-primary-700 dark:bg-primary-950/60 dark:text-primary-300">
                          {(m.userName || "?").charAt(0).toUpperCase()}
                        </span>
                      )}
                      <div className={cn("max-w-[75%]", mine && "text-right")}>
                        <p className="flex items-baseline gap-2 text-xs text-neutral-400">
                          <span
                            className={cn(
                              "font-semibold text-neutral-600 dark:text-neutral-300",
                              mine && "order-2",
                            )}
                          >
                            {mine ? t.you : m.userName}
                          </span>
                          {m.isAdmin && (
                            <span className="rounded-full bg-primary-600 px-1.5 py-px text-[10px] font-bold text-white">
                              {t.admin}
                            </span>
                          )}
                          <span>
                            {new Date(m.createdAt).toLocaleTimeString("vi-VN", {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </span>
                        </p>
                        <p
                          className={cn(
                            "mt-1 inline-block whitespace-pre-wrap break-words rounded-2xl px-3.5 py-2 text-left text-sm",
                            mine
                              ? "rounded-tr-sm bg-primary-600 text-white"
                              : m.isAdmin
                                ? "rounded-tl-sm bg-primary-50 text-neutral-800 dark:bg-primary-950/50 dark:text-neutral-100"
                                : "rounded-tl-sm bg-neutral-100 text-neutral-800 dark:bg-neutral-800 dark:text-neutral-100",
                          )}
                        >
                          {m.body}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* ô nhập */}
              <div className="border-t border-neutral-100 p-3 dark:border-neutral-800">
                {error && (
                  <p className="mb-2 text-xs text-red-600 dark:text-red-400">{error}</p>
                )}
                <div className="flex gap-2">
                  <input
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        void send();
                      }
                    }}
                    placeholder={t.placeholder}
                    maxLength={1000}
                    className={cn(inputClass, "w-full rounded-full px-4")}
                  />
                  <button
                    type="button"
                    disabled={sending || !draft.trim()}
                    onClick={() => void send()}
                    className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-primary-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-primary-700 disabled:opacity-50"
                  >
                    <Send className="h-4 w-4" /> {t.send}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
