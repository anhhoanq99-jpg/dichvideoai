"use client";

import { useCallback, useEffect, useState } from "react";
import { ChevronDown, ChevronUp, Loader2, MessageCircle, PencilLine, RefreshCw, Send } from "lucide-react";
import type { Lang } from "@/lib/i18n";
import { inputClass } from "@/components/ui/form-styles";
import { cn } from "@/lib/utils";

const T = {
  vi: {
    hint: "Đăng bài hỏi đáp hoặc chia sẻ kinh nghiệm dịch & lồng tiếng — mọi người bình luận trao đổi bên dưới từng bài.",
    composerTitle: "Đăng bài mới",
    titlePh: "Tiêu đề — bạn muốn hỏi/chia sẻ gì?",
    bodyPh: "Nội dung chi tiết (không bắt buộc)…",
    post: "Đăng bài",
    refresh: "Tải lại",
    empty: "Chưa có bài viết nào — đăng bài đầu tiên đi! ✍️",
    comments: (n: number) => `${n} bình luận`,
    hideComments: "Thu gọn",
    commentPh: "Viết bình luận…",
    sendFail: "Gửi không được — thử lại",
    admin: "Admin",
    you: "Bạn",
  },
  en: {
    hint: "Post a question or share your dubbing & translation tips — discuss in the comments under each post.",
    composerTitle: "New post",
    titlePh: "Title — what do you want to ask/share?",
    bodyPh: "Details (optional)…",
    post: "Post",
    refresh: "Refresh",
    empty: "No posts yet — write the first one! ✍️",
    comments: (n: number) => `${n} comment${n === 1 ? "" : "s"}`,
    hideComments: "Collapse",
    commentPh: "Write a comment…",
    sendFail: "Could not send — try again",
    admin: "Admin",
    you: "You",
  },
} as const;

interface Post {
  id: string;
  title: string;
  body: string;
  isAdmin: boolean;
  createdAt: string;
  userId: string;
  userName: string;
  userImage: string | null;
  commentCount: number;
}

interface Comment {
  id: string;
  body: string;
  isAdmin: boolean;
  createdAt: string;
  userId: string;
  userName: string;
  userImage: string | null;
}

function Avatar({ name, image }: { name: string; image: string | null }) {
  return image ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={image} alt="" className="h-9 w-9 shrink-0 rounded-full" referrerPolicy="no-referrer" />
  ) : (
    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary-100 text-sm font-bold text-primary-700 dark:bg-primary-950/60 dark:text-primary-300">
      {(name || "?").charAt(0).toUpperCase()}
    </span>
  );
}

function AdminBadge({ label }: { label: string }) {
  return (
    <span className="rounded-full bg-primary-600 px-1.5 py-px text-[10px] font-bold text-white">
      {label}
    </span>
  );
}

/** thời gian kiểu "14:02 15/7" — gọn cho feed */
function shortTime(iso: string) {
  const d = new Date(iso);
  return `${d.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })} ${d.getDate()}/${d.getMonth() + 1}`;
}

/** Bình luận của một bài — tải khi mở, kèm ô gửi. */
function CommentSection({ postId, me, lang }: { postId: string; me: string; lang: Lang }) {
  const t = T[lang];
  const [comments, setComments] = useState<Comment[] | null>(null);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/community/posts/${postId}/comments`);
      if (res.ok) setComments((await res.json()).comments);
    } catch {
      /* giữ trạng thái cũ */
    }
  }, [postId]);

  useEffect(() => {
    load();
  }, [load]);

  async function send() {
    const body = draft.trim();
    if (!body || sending) return;
    setSending(true);
    setError(null);
    try {
      const res = await fetch(`/api/community/posts/${postId}/comments`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ body }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? t.sendFail);
        return;
      }
      setDraft("");
      await load();
    } catch {
      setError(t.sendFail);
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="mt-3 space-y-3 border-t border-neutral-100 pt-3 dark:border-neutral-800">
      {comments === null ? (
        <p className="flex items-center gap-2 text-xs text-neutral-400">
          <Loader2 className="h-3.5 w-3.5 animate-spin" /> …
        </p>
      ) : (
        comments.map((c) => (
          <div key={c.id} className="flex gap-2.5">
            <Avatar name={c.userName} image={c.userImage} />
            <div className="min-w-0 flex-1 rounded-2xl rounded-tl-sm bg-neutral-50 px-3 py-2 dark:bg-neutral-800/60">
              <p className="flex flex-wrap items-baseline gap-x-2 text-xs text-neutral-400">
                <span className="font-semibold text-neutral-700 dark:text-neutral-200">
                  {c.userId === me ? t.you : c.userName}
                </span>
                {c.isAdmin && <AdminBadge label={t.admin} />}
                <span>{shortTime(c.createdAt)}</span>
              </p>
              <p className="mt-0.5 whitespace-pre-wrap break-words text-sm">{c.body}</p>
            </div>
          </div>
        ))
      )}

      {error && <p className="text-xs text-red-600 dark:text-red-400">{error}</p>}
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
          placeholder={t.commentPh}
          maxLength={1000}
          className={cn(inputClass, "w-full rounded-full px-4")}
        />
        <button
          type="button"
          disabled={sending || !draft.trim()}
          onClick={() => void send()}
          aria-label={t.post}
          className="inline-flex shrink-0 items-center rounded-full bg-primary-600 px-3.5 text-white transition-colors hover:bg-primary-700 disabled:opacity-50"
        >
          <Send className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

/** Feed cộng đồng: đăng bài hỏi/chia sẻ + bình luận trao đổi dưới từng bài. */
export function CommunityFeed({ lang = "vi" }: { lang?: Lang }) {
  const t = T[lang];
  const [posts, setPosts] = useState<Post[] | null>(null);
  const [me, setMe] = useState("");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [posting, setPosting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [openPost, setOpenPost] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/community/posts");
      if (!res.ok) return;
      const data = await res.json();
      setMe(data.me);
      setPosts(data.posts);
    } catch {
      /* giữ danh sách cũ */
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function publish() {
    if (!title.trim() || posting) return;
    setPosting(true);
    setError(null);
    try {
      const res = await fetch("/api/community/posts", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ title: title.trim(), body: body.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? t.sendFail);
        return;
      }
      setTitle("");
      setBody("");
      await load();
    } catch {
      setError(t.sendFail);
    } finally {
      setPosting(false);
    }
  }

  return (
    <div className="space-y-4 pb-8">
      <p className="text-xs text-neutral-400">{t.hint}</p>

      {/* composer đăng bài */}
      <div className="rounded-2xl border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900">
        <p className="flex items-center gap-2 text-sm font-semibold">
          <PencilLine className="h-4 w-4 text-primary-500" /> {t.composerTitle}
        </p>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder={t.titlePh}
          maxLength={120}
          className={cn(inputClass, "mt-3 w-full")}
        />
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder={t.bodyPh}
          maxLength={2000}
          rows={3}
          className={cn(inputClass, "mt-2 w-full resize-y")}
        />
        {error && <p className="mt-2 text-xs text-red-600 dark:text-red-400">{error}</p>}
        <div className="mt-3 flex items-center justify-between">
          <button
            type="button"
            onClick={() => {
              setRefreshing(true);
              load().finally(() => setRefreshing(false));
            }}
            className="inline-flex items-center gap-1.5 text-xs font-medium text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300"
          >
            <RefreshCw className={cn("h-3.5 w-3.5", refreshing && "animate-spin")} /> {t.refresh}
          </button>
          <button
            type="button"
            disabled={posting || title.trim().length < 3}
            onClick={() => void publish()}
            className="inline-flex items-center gap-2 rounded-full bg-primary-600 px-5 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-primary-700 disabled:opacity-50"
          >
            {posting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            {t.post}
          </button>
        </div>
      </div>

      {/* danh sách bài */}
      {posts === null ? (
        <p className="flex items-center justify-center gap-2 py-10 text-sm text-neutral-400">
          <Loader2 className="h-4 w-4 animate-spin" /> …
        </p>
      ) : posts.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-neutral-300 py-14 text-center text-sm text-neutral-400 dark:border-neutral-700">
          {t.empty}
        </p>
      ) : (
        posts.map((p) => {
          const open = openPost === p.id;
          return (
            <article
              key={p.id}
              className="rounded-2xl border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900"
            >
              <div className="flex gap-3">
                <Avatar name={p.userName} image={p.userImage} />
                <div className="min-w-0 flex-1">
                  <p className="flex flex-wrap items-baseline gap-x-2 text-xs text-neutral-400">
                    <span className="font-semibold text-neutral-700 dark:text-neutral-200">
                      {p.userId === me ? t.you : p.userName}
                    </span>
                    {p.isAdmin && <AdminBadge label={t.admin} />}
                    <span>{shortTime(p.createdAt)}</span>
                  </p>
                  <h3 className="mt-1 break-words text-base font-bold">{p.title}</h3>
                  {p.body && (
                    <p className="mt-1.5 whitespace-pre-wrap break-words text-sm text-neutral-600 dark:text-neutral-300">
                      {p.body}
                    </p>
                  )}
                  <button
                    type="button"
                    onClick={() => setOpenPost(open ? null : p.id)}
                    className="mt-2.5 inline-flex items-center gap-1.5 text-xs font-semibold text-primary-600 hover:text-primary-700 dark:text-primary-400"
                  >
                    <MessageCircle className="h-3.5 w-3.5" />
                    {open ? t.hideComments : t.comments(p.commentCount)}
                    {open ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                  </button>

                  {open && <CommentSection postId={p.id} me={me} lang={lang} />}
                </div>
              </div>
            </article>
          );
        })
      )}
    </div>
  );
}
