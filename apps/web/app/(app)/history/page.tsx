import Link from "next/link";
import { redirect } from "next/navigation";
import { desc, eq } from "drizzle-orm";
import { Download, History as HistoryIcon } from "lucide-react";
import { jobs, videos } from "@dichvideo/db";
import { db } from "@/lib/db";
import { getSession } from "@/lib/session";

export const dynamic = "force-dynamic";

const TYPE_LABEL: Record<string, string> = {
  probe: "Đọc thông số",
  stt: "Tách phụ đề (giọng nói)",
  ocr: "Tách phụ đề (trên hình)",
  translate: "Dịch AI",
  render: "Render video",
  dub: "Lồng tiếng",
};

const STATUS_BADGE: Record<string, { label: string; cls: string }> = {
  done: {
    label: "Thành công",
    cls: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300",
  },
  failed: {
    label: "Thất bại",
    cls: "bg-red-100 text-red-700 dark:bg-red-950/50 dark:text-red-300",
  },
  active: {
    label: "Đang chạy",
    cls: "bg-indigo-100 text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-300",
  },
  queued: {
    label: "Chờ xử lý",
    cls: "bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300",
  },
  cancelled: {
    label: "Đã hủy",
    cls: "bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400",
  },
};

export default async function HistoryPage() {
  const session = await getSession();
  if (!session) redirect("/login");

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
    <div className="mx-auto max-w-5xl space-y-6">
      <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight">
        <HistoryIcon className="h-6 w-6 text-indigo-600 dark:text-indigo-400" />
        Lịch sử xử lý
      </h1>

      {rows.length === 0 ? (
        <p className="rounded-lg border border-dashed border-neutral-300 py-16 text-center text-sm text-neutral-400 dark:border-neutral-700">
          Chưa có job nào — tải video lên để bắt đầu.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900">
          <table className="w-full min-w-[720px] text-sm">
            <thead>
              <tr className="border-b border-neutral-200 text-left text-xs text-neutral-500 dark:border-neutral-800 dark:text-neutral-400">
                <th className="px-4 py-3 font-medium">Video</th>
                <th className="px-4 py-3 font-medium">Xử lý</th>
                <th className="px-4 py-3 font-medium">Trạng thái</th>
                <th className="px-4 py-3 text-right font-medium">Credits</th>
                <th className="px-4 py-3 font-medium">Thời gian</th>
                <th className="px-4 py-3 text-right font-medium">Kết quả</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
              {rows.map((r) => {
                const badge = STATUS_BADGE[r.status] ?? STATUS_BADGE.queued;
                const hasFile =
                  r.status === "done" &&
                  Boolean((r.result as { r2Key?: string } | null)?.r2Key);
                return (
                  <tr key={r.id} className="hover:bg-neutral-50 dark:hover:bg-neutral-800/40">
                    <td className="max-w-56 px-4 py-2.5">
                      <Link
                        href={`/videos/${r.videoId}`}
                        className="block truncate font-medium hover:text-indigo-600 dark:hover:text-indigo-400"
                      >
                        {r.videoName}
                      </Link>
                    </td>
                    <td className="px-4 py-2.5 text-neutral-600 dark:text-neutral-300">
                      {TYPE_LABEL[r.type] ?? r.type}
                    </td>
                    <td className="px-4 py-2.5">
                      <span
                        title={r.status === "failed" ? (r.error ?? "") : undefined}
                        className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${badge.cls}`}
                      >
                        {badge.label}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-right font-mono text-xs">
                      {r.creditsCharged > 0 ? (
                        <span>
                          {r.creditsCharged.toLocaleString("vi-VN")}
                          {r.status === "failed" && (
                            <span className="ml-1 text-emerald-500" title="Đã hoàn credits">
                              (hoàn)
                            </span>
                          )}
                        </span>
                      ) : (
                        <span className="text-neutral-400">0</span>
                      )}
                    </td>
                    <td className="whitespace-nowrap px-4 py-2.5 text-xs text-neutral-500 dark:text-neutral-400">
                      {r.createdAt?.toLocaleString("vi-VN")}
                    </td>
                    <td className="px-4 py-2.5 text-right">
                      {hasFile && (
                        <a
                          href={`/api/jobs/${r.id}/download`}
                          className="inline-flex items-center gap-1 rounded-md border border-neutral-300 px-2.5 py-1 text-xs font-medium hover:bg-neutral-100 dark:border-neutral-700 dark:hover:bg-neutral-800"
                        >
                          <Download className="h-3 w-3" /> Tải về
                        </a>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      <p className="text-xs text-neutral-400">
        Hiển thị 100 job gần nhất. File kết quả tự xóa sau 7 ngày — hãy tải về máy.
      </p>
    </div>
  );
}
