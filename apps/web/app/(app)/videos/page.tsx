import Link from "next/link";
import { desc, eq, isNull, and } from "drizzle-orm";
import { Plus, Video as VideoIcon } from "lucide-react";
import { videos } from "@dichvideo/db";
import { db } from "@/lib/db";
import { getSession } from "@/lib/session";
import { VideoStatusBadge } from "@/components/videos/video-status-badge";

export const dynamic = "force-dynamic";

function formatDuration(sec: number | null) {
  if (!sec) return "—";
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

export default async function VideosPage() {
  const session = (await getSession())!;
  const rows = await db
    .select()
    .from(videos)
    .where(and(eq(videos.userId, session.user.id), isNull(videos.deletedAt)))
    .orderBy(desc(videos.createdAt))
    .limit(100);

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">Video của tôi</h1>
        <Link
          href="/videos/upload"
          className="inline-flex items-center gap-2 rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-indigo-700"
        >
          <Plus className="h-4 w-4" /> Tải video lên
        </Link>
      </div>

      {rows.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-neutral-300 py-16 text-center dark:border-neutral-700">
          <VideoIcon className="h-8 w-8 text-neutral-400" />
          <p className="mt-3 text-sm text-neutral-500 dark:text-neutral-400">
            Chưa có video nào — tải video đầu tiên lên để bắt đầu Việt hóa.
          </p>
        </div>
      ) : (
        <ul className="divide-y divide-neutral-200 rounded-lg border border-neutral-200 bg-white dark:divide-neutral-800 dark:border-neutral-800 dark:bg-neutral-900">
          {rows.map((v) => (
            <li key={v.id}>
              <Link
                href={`/videos/${v.id}`}
                className="flex items-center justify-between gap-4 px-4 py-3 transition-colors hover:bg-neutral-50 dark:hover:bg-neutral-800/50"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{v.originalName}</p>
                  <p className="mt-0.5 text-xs text-neutral-500 dark:text-neutral-400">
                    {formatDuration(v.durationSec)}
                    {v.width && v.height ? ` · ${v.width}×${v.height}` : ""}
                  </p>
                </div>
                <VideoStatusBadge status={v.status} />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
