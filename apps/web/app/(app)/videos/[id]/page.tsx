import { notFound, redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { subtitleTracks } from "@dichvideo/db";
import type { SubtitleSegment } from "@dichvideo/shared";
import { db } from "@/lib/db";
import { getSession } from "@/lib/session";
import { getOwnVideo } from "@/lib/video-access";
import { VideoStatusBadge } from "@/components/videos/video-status-badge";
import { ExtractPanel } from "@/components/videos/extract-panel";
import { TranslatePanel } from "@/components/videos/translate-panel";

export const dynamic = "force-dynamic";

export default async function VideoDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await getSession();
  if (!session) redirect("/login");

  const { id } = await params;
  const video = await getOwnVideo(id, session.user.id);
  if (!video) notFound();

  const tracks = await db
    .select()
    .from(subtitleTracks)
    .where(eq(subtitleTracks.videoId, video.id));
  const original = tracks.find((t) => t.kind === "original");
  const translated = tracks.find((t) => t.kind === "translated");

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h1 className="truncate text-2xl font-semibold tracking-tight">
            {video.originalName}
          </h1>
          <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
            {video.durationSec
              ? `${Math.floor(video.durationSec / 60)}:${String(video.durationSec % 60).padStart(2, "0")} phút`
              : "Đang đọc thông tin video…"}
            {video.width && video.height ? ` · ${video.width}×${video.height}` : ""}
          </p>
        </div>
        <VideoStatusBadge status={video.status} />
      </div>

      <ExtractPanel
        videoId={video.id}
        videoStatus={video.status}
        hasOriginalTrack={Boolean(original)}
      />

      <TranslatePanel
        videoId={video.id}
        hasOriginalTrack={Boolean(original)}
        hasTranslatedTrack={Boolean(translated)}
        initialGlossary={video.glossary}
      />

      {original && (
        <section className="rounded-lg border border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900">
          <div className="border-b border-neutral-200 px-4 py-3 dark:border-neutral-800">
            <h2 className="text-sm font-semibold">
              Phụ đề gốc ({original.lang}) —{" "}
              {(original.segments as SubtitleSegment[]).length} dòng
            </h2>
          </div>
          <ul className="max-h-96 divide-y divide-neutral-100 overflow-y-auto text-sm dark:divide-neutral-800">
            {(original.segments as SubtitleSegment[]).slice(0, 500).map((s) => (
              <li key={s.i} className="flex gap-4 px-4 py-2">
                <span className="w-24 shrink-0 font-mono text-xs text-neutral-400">
                  {new Date(s.startMs).toISOString().slice(11, 19)}
                </span>
                <span>{s.text}</span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
