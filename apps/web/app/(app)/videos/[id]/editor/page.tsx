import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { eq } from "drizzle-orm";
import { subtitleTracks } from "@dichvideo/db";
import type { SubtitleSegment } from "@dichvideo/shared";
import { db } from "@/lib/db";
import { getSession } from "@/lib/session";
import { getOwnVideo } from "@/lib/video-access";
import { EditorShell } from "@/components/editor/editor-shell";

export const dynamic = "force-dynamic";

export default async function EditorPage({
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

  if (!translated) redirect(`/videos/${video.id}`);

  return (
    <div className="space-y-3">
      <Link
        href={`/videos/${video.id}`}
        className="inline-flex items-center gap-1 text-sm text-neutral-500 hover:text-neutral-800 dark:text-neutral-400 dark:hover:text-neutral-200"
      >
        <ArrowLeft className="h-4 w-4" /> {video.originalName}
      </Link>
      <EditorShell
        videoId={video.id}
        trackId={translated.id}
        originalTrackId={original?.id ?? null}
        trackVersion={translated.version}
        original={(original?.segments ?? []) as SubtitleSegment[]}
        translated={translated.segments as SubtitleSegment[]}
      />
    </div>
  );
}
