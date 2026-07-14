import Link from "next/link";
import { redirect } from "next/navigation";
import { and, desc, eq, inArray } from "drizzle-orm";
import { Clock, Download, FileVideo } from "lucide-react";
import { jobs, videos } from "@dichvideo/db";
import { db } from "@/lib/db";
import { getSession } from "@/lib/session";
import { getLang } from "@/lib/i18n";

export const dynamic = "force-dynamic";

const T = {
  vi: {
    title: "Video đã xuất",
    subtitle: "File kết quả tự xóa sau 7 ngày — hãy tải về máy sớm.",
    empty: "Chưa có video nào được xuất — mở một video và bấm “Xuất File”.",
    download: "Tải về",
    openVideo: "Mở video gốc",
    daysLeft: (n: number) => `còn ${n} ngày`,
    expired: "có thể đã hết hạn",
    feature: {
      subtitle: "Phụ đề",
      dub: "Lồng tiếng",
      blur: "Làm mờ chữ gốc",
      box: "Che chữ gốc",
      logo: "Logo",
    },
  },
  en: {
    title: "Exported videos",
    subtitle: "Result files are deleted after 7 days — download them soon.",
    empty: "Nothing exported yet — open a video and press “Export”.",
    download: "Download",
    openVideo: "Open source video",
    daysLeft: (n: number) => `${n} day${n === 1 ? "" : "s"} left`,
    expired: "may have expired",
    feature: {
      subtitle: "Subtitles",
      dub: "Dubbing",
      blur: "Blur original text",
      box: "Cover original text",
      logo: "Logo",
    },
  },
} as const;

/** params job lưu thiết lập lúc xuất — đọc "lỏng tay" vì cấu trúc có thể thiếu trường cũ */
interface ExportParams {
  coverMode?: string;
  logoOn?: boolean;
  logoText?: string;
  logoImageKey?: string;
  voice?: string;
}

/** Ghi chú các tính năng đã áp cho bản xuất này (đọc từ type + params của job). */
function exportFeatures(
  type: string,
  params: ExportParams,
  t: (typeof T)[keyof typeof T],
): string[] {
  if (type === "dub") return [t.feature.dub];
  const out: string[] = [t.feature.subtitle];
  if (params.coverMode === "blur") out.push(t.feature.blur);
  if (params.coverMode === "box") out.push(t.feature.box);
  if (params.logoOn) out.push(t.feature.logo);
  if (params.voice) out.push(t.feature.dub);
  return out;
}

const FEATURE_BADGE =
  "rounded-full bg-primary-50 px-2.5 py-0.5 text-xs font-semibold text-primary-700 dark:bg-primary-950/50 dark:text-primary-300";

export default async function ExportsPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  const lang = await getLang();
  const t = T[lang];

  const rows = await db
    .select({
      id: jobs.id,
      type: jobs.type,
      params: jobs.params,
      result: jobs.result,
      finishedAt: jobs.finishedAt,
      videoId: jobs.videoId,
      videoName: videos.originalName,
    })
    .from(jobs)
    .innerJoin(videos, eq(jobs.videoId, videos.id))
    .where(
      and(
        eq(jobs.userId, session.user.id),
        inArray(jobs.type, ["render", "dub"]),
        eq(jobs.status, "done"),
      ),
    )
    .orderBy(desc(jobs.finishedAt))
    .limit(100);

  // chỉ hiện job thật sự có file kết quả trên R2
  const exports_ = rows.filter(
    (r) => (r.result as { r2Key?: string } | null)?.r2Key,
  );

  const now = Date.now();

  return (
    <div className="mx-auto max-w-4xl space-y-5">
      <div>
        <h1 className="flex items-center gap-2.5 text-2xl font-bold tracking-tight">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary-50 dark:bg-primary-950/50">
            <FileVideo className="h-5 w-5 text-primary-600 dark:text-primary-400" />
          </span>
          {t.title}
        </h1>
        <p className="mt-1.5 text-sm text-neutral-500 dark:text-neutral-400">{t.subtitle}</p>
      </div>

      {exports_.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-neutral-300 py-16 text-center dark:border-neutral-700">
          <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary-50 dark:bg-primary-950/50">
            <FileVideo className="h-7 w-7 text-primary-500" />
          </span>
          <p className="mt-4 max-w-xs text-sm text-neutral-500 dark:text-neutral-400">{t.empty}</p>
        </div>
      ) : (
        <ul className="space-y-3">
          {exports_.map((job) => {
            const size = (job.result as { sizeBytes?: number } | null)?.sizeBytes;
            const features = exportFeatures(job.type, (job.params ?? {}) as ExportParams, t);
            // file tự xóa sau 7 ngày kể từ lúc xuất xong
            const daysLeft = job.finishedAt
              ? 7 - Math.floor((now - job.finishedAt.getTime()) / 86_400_000)
              : null;
            return (
              <li
                key={job.id}
                className="flex flex-wrap items-center gap-3 rounded-2xl border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900"
              >
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-primary-500/15 to-accent-500/15 text-primary-600 dark:text-primary-400">
                  <FileVideo className="h-5 w-5" />
                </span>

                <div className="min-w-0 flex-1 basis-52">
                  <Link
                    href={`/videos/${job.videoId}`}
                    title={t.openVideo}
                    className="line-clamp-2 text-sm font-semibold hover:text-primary-600 sm:line-clamp-1 dark:hover:text-primary-400"
                  >
                    {job.videoName}
                  </Link>
                  {/* ghi chú tính năng đã áp cho bản xuất này */}
                  <p className="mt-1.5 flex flex-wrap items-center gap-1.5">
                    {features.map((f) => (
                      <span key={f} className={FEATURE_BADGE}>
                        {f}
                      </span>
                    ))}
                  </p>
                  <p className="mt-1.5 flex flex-wrap items-center gap-x-1.5 text-xs text-neutral-500 dark:text-neutral-400">
                    <Clock className="h-3 w-3" />
                    {job.finishedAt?.toLocaleString("vi-VN")}
                    {size ? ` · ${Math.round(size / 1e6)} MB` : ""}
                    {daysLeft !== null && (
                      <span
                        className={
                          daysLeft <= 1
                            ? "font-semibold text-red-600 dark:text-red-400"
                            : daysLeft <= 3
                              ? "font-semibold text-amber-600 dark:text-amber-400"
                              : ""
                        }
                      >
                        · {daysLeft > 0 ? t.daysLeft(daysLeft) : t.expired}
                      </span>
                    )}
                  </p>
                </div>

                <a
                  href={`/api/jobs/${job.id}/download`}
                  className="inline-flex shrink-0 items-center gap-2 rounded-full bg-primary-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-primary-700"
                >
                  <Download className="h-4 w-4" /> {t.download}
                </a>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
