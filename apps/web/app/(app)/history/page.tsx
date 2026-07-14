import Link from "next/link";
import { redirect } from "next/navigation";
import { desc, eq } from "drizzle-orm";
import { Download, History as HistoryIcon } from "lucide-react";
import { jobs, videos } from "@dichvideo/db";
import { db } from "@/lib/db";
import { getSession } from "@/lib/session";
import { getLang } from "@/lib/i18n";
import { JOB_TYPE_LABELS } from "@/lib/job-labels";

export const dynamic = "force-dynamic";

const T = {
  vi: {
    status: {
      done: "Thành công",
      failed: "Thất bại",
      active: "Đang chạy",
      queued: "Chờ xử lý",
      cancelled: "Đã hủy",
    },
    title: "Lịch sử xử lý",
    empty: "Chưa có job nào — tải video lên để bắt đầu.",
    thVideo: "Video",
    thType: "Xử lý",
    thStatus: "Trạng thái",
    thCredits: "Xu",
    thTime: "Thời gian",
    thResult: "Kết quả",
    refunded: "Đã hoàn xu",
    refundedShort: "(hoàn)",
    download: "Tải về",
    footnote: "Hiển thị 100 job gần nhất. File kết quả tự xóa sau 7 ngày — hãy tải về máy.",
  },
  en: {
    status: {
      done: "Succeeded",
      failed: "Failed",
      active: "Running",
      queued: "Queued",
      cancelled: "Cancelled",
    },
    title: "Processing history",
    empty: "No jobs yet — upload a video to get started.",
    thVideo: "Video",
    thType: "Task",
    thStatus: "Status",
    thCredits: "Credits",
    thTime: "Time",
    thResult: "Result",
    refunded: "Credits refunded",
    refundedShort: "(refunded)",
    download: "Download",
    footnote: "Showing the 100 most recent jobs. Result files are deleted after 7 days — download them to your device.",
  },
} as const;

const STATUS_CLS: Record<string, string> = {
  done: "bg-success-100 text-success-700 dark:bg-success-950/50 dark:text-success-300",
  failed: "bg-red-100 text-red-700 dark:bg-red-950/50 dark:text-red-300",
  active: "bg-primary-100 text-primary-700 dark:bg-primary-950/50 dark:text-primary-300",
  queued: "bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300",
  cancelled: "bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400",
};

export default async function HistoryPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  const lang = await getLang();
  const t = T[lang];
  const jobTypeLabel = JOB_TYPE_LABELS[lang];

  const rows = await db
    .select({
      id: jobs.id,
      type: jobs.type,
      status: jobs.status,
      creditsCharged: jobs.creditsCharged,
      error: jobs.error,
      result: jobs.result,
      createdAt: jobs.createdAt,
      videoId: jobs.videoId,
      videoName: videos.originalName,
    })
    .from(jobs)
    .innerJoin(videos, eq(jobs.videoId, videos.id))
    .where(eq(jobs.userId, session.user.id))
    .orderBy(desc(jobs.createdAt))
    .limit(100);

  return (
    <div className="mx-auto max-w-5xl space-y-5">
      <h1 className="flex items-center gap-2.5 text-2xl font-bold tracking-tight">
        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary-50 dark:bg-primary-950/50">
          <HistoryIcon className="h-5 w-5 text-primary-600 dark:text-primary-400" />
        </span>
        {t.title}
      </h1>

      {rows.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-neutral-300 py-16 text-center text-sm text-neutral-400 dark:border-neutral-700">
          {t.empty}
        </p>
      ) : (
        <div className="rounded-2xl border border-neutral-200 bg-white shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
          {/* Mobile: mỗi job là một card xếp dọc — không phải cuộn ngang */}
          <ul className="divide-y divide-neutral-100 md:hidden dark:divide-neutral-800">
            {rows.map((job) => {
              const statusLabel =
                t.status[job.status as keyof typeof t.status] ?? t.status.queued;
              const statusCls = STATUS_CLS[job.status] ?? STATUS_CLS.queued;
              const hasFile =
                job.status === "done" &&
                Boolean((job.result as { r2Key?: string } | null)?.r2Key);
              return (
                <li key={job.id} className="space-y-2 px-4 py-3">
                  <div className="flex items-start justify-between gap-3">
                    <Link
                      href={`/videos/${job.videoId}`}
                      className="min-w-0 flex-1 truncate text-sm font-semibold hover:text-primary-600 dark:hover:text-primary-400"
                    >
                      {job.videoName}
                    </Link>
                    <span
                      title={job.status === "failed" ? (job.error ?? "") : undefined}
                      className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-semibold ${statusCls}`}
                    >
                      {statusLabel}
                    </span>
                  </div>
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-neutral-500 dark:text-neutral-400">
                    <span className="font-medium text-neutral-600 dark:text-neutral-300">
                      {jobTypeLabel[job.type] ?? job.type}
                    </span>
                    <span>·</span>
                    <span>{job.createdAt?.toLocaleString("vi-VN")}</span>
                    {job.creditsCharged > 0 && (
                      <>
                        <span>·</span>
                        <span className="font-mono">
                          {job.creditsCharged.toLocaleString("vi-VN")} xu
                          {job.status === "failed" && (
                            <span className="ml-1 text-success-500">{t.refundedShort}</span>
                          )}
                        </span>
                      </>
                    )}
                  </div>
                  {hasFile && (
                    <a
                      href={`/api/jobs/${job.id}/download`}
                      className="inline-flex items-center gap-1.5 rounded-full border border-neutral-200 px-3 py-1 text-xs font-semibold hover:bg-neutral-100 dark:border-neutral-700 dark:hover:bg-neutral-800"
                    >
                      <Download className="h-3 w-3" /> {t.download}
                    </a>
                  )}
                </li>
              );
            })}
          </ul>

          {/* Desktop: bảng đầy đủ 6 cột */}
          <div className="hidden overflow-x-auto md:block">
            <table className="w-full min-w-[720px] text-sm">
              <thead>
                <tr className="border-b border-neutral-100 text-left text-xs uppercase tracking-wide text-neutral-400 dark:border-neutral-800 dark:text-neutral-500">
                  <th className="px-5 py-3.5 font-semibold">{t.thVideo}</th>
                  <th className="px-5 py-3.5 font-semibold">{t.thType}</th>
                  <th className="px-5 py-3.5 font-semibold">{t.thStatus}</th>
                  <th className="px-5 py-3.5 text-right font-semibold">{t.thCredits}</th>
                  <th className="px-5 py-3.5 font-semibold">{t.thTime}</th>
                  <th className="px-5 py-3.5 text-right font-semibold">{t.thResult}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
                {rows.map((job) => {
                  const statusLabel =
                    t.status[job.status as keyof typeof t.status] ?? t.status.queued;
                  const statusCls = STATUS_CLS[job.status] ?? STATUS_CLS.queued;
                  const hasFile =
                    job.status === "done" &&
                    Boolean((job.result as { r2Key?: string } | null)?.r2Key);
                  return (
                    <tr key={job.id} className="hover:bg-neutral-50 dark:hover:bg-neutral-800/40">
                      <td className="max-w-56 px-5 py-3">
                        <Link
                          href={`/videos/${job.videoId}`}
                          className="block truncate font-medium hover:text-primary-600 dark:hover:text-primary-400"
                        >
                          {job.videoName}
                        </Link>
                      </td>
                      <td className="px-5 py-3 text-neutral-600 dark:text-neutral-300">
                        {jobTypeLabel[job.type] ?? job.type}
                      </td>
                      <td className="px-5 py-3">
                        <span
                          title={job.status === "failed" ? (job.error ?? "") : undefined}
                          className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold ${statusCls}`}
                        >
                          {statusLabel}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-right font-mono text-xs">
                        {job.creditsCharged > 0 ? (
                          <span>
                            {job.creditsCharged.toLocaleString("vi-VN")}
                            {job.status === "failed" && (
                              <span className="ml-1 text-success-500" title={t.refunded}>
                                {t.refundedShort}
                              </span>
                            )}
                          </span>
                        ) : (
                          <span className="text-neutral-400">0</span>
                        )}
                      </td>
                      <td className="whitespace-nowrap px-5 py-3 text-xs text-neutral-500 dark:text-neutral-400">
                        {job.createdAt?.toLocaleString("vi-VN")}
                      </td>
                      <td className="px-5 py-3 text-right">
                        {hasFile && (
                          <a
                            href={`/api/jobs/${job.id}/download`}
                            className="inline-flex items-center gap-1.5 rounded-full border border-neutral-200 px-3 py-1 text-xs font-semibold hover:bg-neutral-100 dark:border-neutral-700 dark:hover:bg-neutral-800"
                          >
                            <Download className="h-3 w-3" /> {t.download}
                          </a>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
      <p className="text-xs text-neutral-400">
        {t.footnote}
      </p>
    </div>
  );
}
