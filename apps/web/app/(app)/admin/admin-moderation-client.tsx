"use client";

import { useState } from "react";
import { Loader2, MessageSquare, Trash2 } from "lucide-react";
import type { Lang } from "@/lib/i18n";
import { useToast } from "@/components/ui/toaster";

export type ModPost = {
  id: string;
  title: string;
  body: string;
  userName: string;
  isAdmin: boolean;
  commentCount: number;
  when: string;
};
export type ModComment = {
  id: string;
  body: string;
  userName: string;
  isAdmin: boolean;
  postTitle: string;
  when: string;
};

const T = {
  vi: {
    posts: "Bài đăng gần đây",
    comments: "Bình luận gần đây",
    empty: "Chưa có nội dung.",
    confirmPost: "Xóa bài này và toàn bộ bình luận của nó?",
    confirmComment: "Xóa bình luận này?",
    deleted: "Đã xóa",
    fail: "Xóa không được — thử lại",
    admin: "Admin",
    cmt: (n: number) => `${n} bình luận`,
    on: "về bài",
  },
  en: {
    posts: "Recent posts",
    comments: "Recent comments",
    empty: "Nothing here yet.",
    confirmPost: "Delete this post and all its comments?",
    confirmComment: "Delete this comment?",
    deleted: "Deleted",
    fail: "Delete failed — try again",
    admin: "Admin",
    cmt: (n: number) => `${n} comments`,
    on: "on",
  },
} as const;

function Row({
  children,
  onDelete,
}: {
  children: React.ReactNode;
  onDelete: () => Promise<void>;
}) {
  const [busy, setBusy] = useState(false);
  return (
    <div className="flex items-start gap-3 rounded-xl border border-neutral-200 bg-white p-3 dark:border-neutral-800 dark:bg-neutral-900">
      <div className="min-w-0 flex-1">{children}</div>
      <button
        type="button"
        disabled={busy}
        onClick={() => {
          setBusy(true);
          void onDelete().finally(() => setBusy(false));
        }}
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-neutral-400 transition-colors hover:bg-red-50 hover:text-red-600 disabled:opacity-50 dark:hover:bg-red-950/40"
        aria-label="delete"
      >
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
      </button>
    </div>
  );
}

function Meta({ name, isAdmin, when, adminLabel }: { name: string; isAdmin: boolean; when: string; adminLabel: string }) {
  return (
    <p className="mt-1 flex items-center gap-1.5 text-xs text-neutral-400">
      <span className="font-medium text-neutral-500 dark:text-neutral-400">{name}</span>
      {isAdmin && (
        <span className="rounded bg-primary-100 px-1.5 py-0.5 text-[10px] font-semibold text-primary-700 dark:bg-primary-950 dark:text-primary-300">
          {adminLabel}
        </span>
      )}
      <span>· {when}</span>
    </p>
  );
}

export function AdminModerationClient({
  lang = "vi",
  posts: initialPosts,
  comments: initialComments,
}: {
  lang?: Lang;
  posts: ModPost[];
  comments: ModComment[];
}) {
  const t = T[lang];
  const { toast } = useToast();
  const [posts, setPosts] = useState(initialPosts);
  const [comments, setComments] = useState(initialComments);

  async function del(url: string, ok: () => void) {
    try {
      const res = await fetch(url, { method: "DELETE" });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        toast(data?.error ?? t.fail, "error");
        return;
      }
      ok();
      toast(t.deleted);
    } catch {
      toast(t.fail, "error");
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <section>
        <h3 className="mb-2 text-sm font-semibold text-neutral-500 dark:text-neutral-400">
          {t.posts}
        </h3>
        <div className="space-y-2">
          {posts.length === 0 && <p className="text-sm text-neutral-400">{t.empty}</p>}
          {posts.map((p) => (
            <Row
              key={p.id}
              onDelete={async () => {
                if (!window.confirm(t.confirmPost)) return;
                await del(`/api/admin/community/posts/${p.id}`, () =>
                  setPosts((cur) => cur.filter((x) => x.id !== p.id)),
                );
              }}
            >
              <p className="truncate text-sm font-semibold">{p.title}</p>
              {p.body && (
                <p className="mt-0.5 line-clamp-2 text-xs text-neutral-500 dark:text-neutral-400">
                  {p.body}
                </p>
              )}
              <Meta name={p.userName} isAdmin={p.isAdmin} when={p.when} adminLabel={t.admin} />
              {p.commentCount > 0 && (
                <p className="mt-1 inline-flex items-center gap-1 text-[11px] text-neutral-400">
                  <MessageSquare className="h-3 w-3" /> {t.cmt(p.commentCount)}
                </p>
              )}
            </Row>
          ))}
        </div>
      </section>

      <section>
        <h3 className="mb-2 text-sm font-semibold text-neutral-500 dark:text-neutral-400">
          {t.comments}
        </h3>
        <div className="space-y-2">
          {comments.length === 0 && <p className="text-sm text-neutral-400">{t.empty}</p>}
          {comments.map((c) => (
            <Row
              key={c.id}
              onDelete={async () => {
                if (!window.confirm(t.confirmComment)) return;
                await del(`/api/admin/community/comments/${c.id}`, () =>
                  setComments((cur) => cur.filter((x) => x.id !== c.id)),
                );
              }}
            >
              <p className="text-sm text-neutral-700 dark:text-neutral-200">{c.body}</p>
              <p className="mt-0.5 truncate text-[11px] text-neutral-400">
                {t.on} “{c.postTitle}”
              </p>
              <Meta name={c.userName} isAdmin={c.isAdmin} when={c.when} adminLabel={t.admin} />
            </Row>
          ))}
        </div>
      </section>
    </div>
  );
}
