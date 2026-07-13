import Link from "next/link";
import { desc, eq, inArray, isNull, and } from "drizzle-orm";
import { ChevronRight, Clock, Loader2, Plus, Video as VideoIcon } from "lucide-react";
import { jobs, videos } from "@dichvideo/db";
import { db } from "@/lib/db";
import { getSession } from "@/lib/session";
import { getLang, type Lang } from "@/lib/i18n";
import { JOB_TYPE_PROGRESS_LABELS } from "@/lib/job-labels";
import { formatDuration } from "@/lib/utils";
import { AutoRefresh } from "@/components/videos/auto-refresh";
import { VideoStatusBadge } from "@/components/videos/video-status-badge";

const T = {
  vi: {
    processing: "Đang xử lý…",
    errUnknown: "Không rõ nguyên nhân — mở video để thử lại",
    errOcrQuota:
      "Nguồn AI đọc chữ trên hình tạm hết hạn mức — mở video thử lại (video có lời thoại sẽ tự chuyển sang nhận dạng giọng nói)",
    title: "Video của tôi",
    upload: "Tải video lên",
    empty: "Chưa có video nào — tải video đầu tiên lên để bắt đầu Việt hóa.",
  },
  en: {
    processing: "Processing…",
    errUnknown: "Unknown error — open the video to retry",
    errOcrQuota:
      "The on-screen text AI is temporarily out of quota — open the video to retry (videos with speech will fall back to speech recognition)",
    title: "My Videos",
    upload: "Upload video",
    empty: "No videos yet — upload your first video to get started.",
  },
} as const;

export const dynamic = "force-dynamic";

/** Lỗi job lưu trong DB có thể là JSON thô của API — dịch sang câu dễ hiểu. */
function friendlyJobError(error: string | null, lang: Lang): string {
  const t = T[lang];
  if (!error) return t.errUnknown;
  if (/prepayment credits are depleted|RESOURCE_EXHAUSTED|"code":\s*429/i.test(error)) {
    return t.errOcrQuota;
  }
  return error.length > 150 ? `${error.slice(0, 150)}…` : error;
}

export default async function VideosPage() {
  const session = (await getSession())!;
  const lang = await getLang();
  const t = T[lang];
  const rows = await db
    .select()
    .from(videos)
    .where(and(eq(videos.userId, session.user.id), isNull(videos.deletedAt)))
    .orderBy(desc(videos.createdAt))
    .limit(100);

  // job mới nhất của mỗi video → hiển thị bước pipeline đang chạy
  const latestJob = new Map<
    string,
    { type: string; status: string; error: string | null }
  >();
  if (rows.length > 0) {
    const recent = await db
      .select({
        videoId: jobs.videoId,
        type: jobs.type,
        status: jobs.status,
        error: jobs.error,
      })
      .from(jobs)
      .where(inArray(jobs.videoId, rows.map((video) => video.id)))
      .orderBy(desc(jobs.createdAt))
      .limit(300);
    for (const job of recent) {
      if (!latestJob.has(job.videoId)) latestJob.set(job.videoId, job);
    }
  }
  const anyBusy = [...latestJob.values()].some(
    (job) => job.status === "queued" || job.status === "active",
  );

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <AutoRefresh enabled={anyBusy} />
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold tracking-tight">{t.title}</h1>
        <Link
          href="/videos/upload"
          className="inline-flex items-center gap-2 rounded-full bg-primary-600 px-5 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-primary-700"
        >
          <Plus className="h-4 w-4" /> {t.upload}
        </Link>
      </div>

      {rows.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-neutral-300 py-16 text-center dark:border-neutral-700">
          <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary-50 dark:bg-primary-950/50">
            <VideoIcon className="h-7 w-7 text-primary-500" />
          </span>
          <p className="mt-4 max-w-xs text-sm text-neutral-500 dark:text-neutral-400">
            {t.empty}
          </p>
          <Link
            href="/videos/upload"
            className="mt-5 inline-flex items-center gap-2 rounded-full bg-primary-600 px-5 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-primary-700"
          >
            <Plus className="h-4 w-4" /> {t.upload}
          </Link>
        </div>
      ) : (
        <ul className="space-y-3">
          {rows.map((video) => {
            const lastJob = latestJob.get(video.id);
            const busy = lastJob && (lastJob.status === "queued" || lastJob.status === "active");
            const failed = lastJob?.status === "failed";
            return (
              <li key={video.id}>
                <Link
                  href={`/videos/${video.id}`}
                  className="group flex items-center gap-4 rounded-2xl border border-neutral-200 bg-white p-4 transition-all hover:-translate-y-0.5 hover:border-primary-300 hover:shadow-md hover:shadow-primary-500/5 dark:border-neutral-800 dark:bg-neutral-900 dark:hover:border-primary-800"
                >
                  {/* biểu tượng video bo cong */}
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-primary-500/15 to-accent-500/15 text-primary-600 dark:text-primary-400">
                    {busy ? (
                      <Loader2 className="h-5 w-5 animate-spin" />
                    ) : (
                      <VideoIcon className="h-5 w-5" />
                    )}
                  </span>

                  <div className="min-w-0 flex-1">
                    {/* mobile cho xuống 2 dòng để tên video Trung/dài không bị cụt hết */}
                    <p className="line-clamp-2 text-sm font-semibold sm:line-clamp-1">
                      {video.originalName}
                    </p>
                    <p className="mt-0.5 flex items-center gap-1.5 text-xs text-neutral-500 dark:text-neutral-400">
                      <Clock className="h-3 w-3" />
                      {formatDuration(video.durationSec)}
                      {video.width && video.height ? ` · ${video.width}×${video.height}` : ""}
                      {video.createdAt
                        ? ` · ${video.createdAt.toLocaleDateString("vi-VN")}`
                        : ""}
                    </p>
                    {busy && (
                      <p className="mt-1.5 inline-flex items-center gap-1.5 rounded-full bg-primary-50 px-2.5 py-0.5 text-xs font-medium text-primary-700 dark:bg-primary-950/40 dark:text-primary-300">
                        <Loader2 className="h-3 w-3 animate-spin" />
                        {JOB_TYPE_PROGRESS_LABELS[lang][lastJob.type] ?? t.processing}
                      </p>
                    )}
                    {failed && (
                      <p className="mt-1.5 rounded-lg bg-red-50 px-2.5 py-1.5 text-xs text-red-700 dark:bg-red-950/30 dark:text-red-300">
                        ⚠ {friendlyJobError(lastJob.error, lang)}
                      </p>
                    )}
                  </div>

                  <span className="flex shrink-0 items-center gap-2">
                    <VideoStatusBadge status={video.status} lang={lang} />
                    <ChevronRight className="hidden h-4 w-4 text-neutral-300 transition-transform group-hover:translate-x-0.5 group-hover:text-primary-500 sm:block dark:text-neutral-600" />
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
