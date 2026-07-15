import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { eq } from "drizzle-orm";
import { subtitleTracks } from "@dichvideo/db";
import type { SubtitleSegment } from "@dichvideo/shared";
import { db } from "@/lib/db";
import { getLang } from "@/lib/i18n";
import { getR2, r2Bucket } from "@/lib/r2";
import { getSession } from "@/lib/session";
import { getOwnVideo } from "@/lib/video-access";
import { ProcessingView } from "@/components/studio/processing-view";
import { StudioShell } from "@/components/studio/studio-shell";

export const dynamic = "force-dynamic";

/**
 * Studio: đang xử lý thì hiện màn tiến độ, xử lý xong thành trình chỉnh sửa
 * + xem trước + xuất video (luồng upload → xử lý → chỉnh → xuất).
 */
export default async function EditorPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await getSession();
  if (!session) redirect("/login");

  const lang = await getLang();
  const { id } = await params;
  const video = await getOwnVideo(id, session.user.id);
  if (!video) notFound();

  const tracks = await db
    .select()
    .from(subtitleTracks)
    .where(eq(subtitleTracks.videoId, video.id));
  const original = tracks.find((t) => t.kind === "original");
  const translated = tracks.find((t) => t.kind === "translated");

  // pipeline chưa chạy tới bước dịch → màn "đang xử lý", xong tự vào studio
  if (!translated) {
    return <ProcessingView videoId={video.id} videoName={video.originalName} lang={lang} />;
  }

  const previewUrl = video.r2Key
    ? await getSignedUrl(
        getR2(),
        new GetObjectCommand({ Bucket: r2Bucket(), Key: video.r2Key }),
        { expiresIn: 3600 },
      )
    : null;

  // track OCR có tọa độ chữ trên hình → cần che; track STT (chỉ tiếng nói) → không
  const hasOnScreenText = ((original?.segments ?? []) as SubtitleSegment[]).some(
    (s) => s.box,
  );

  return (
    <div className="space-y-2">
      {/* chỉ nút quay lại gọn — tên video dài (nhất là tên Trung) chiếm 2 dòng
          màn hình điện thoại; tên vẫn hiện ở header bảng phụ đề */}
      <Link
        href={`/videos/${video.id}`}
        className="inline-flex items-center gap-1 text-sm text-neutral-500 hover:text-neutral-800 dark:text-neutral-400 dark:hover:text-neutral-200"
      >
        <ArrowLeft className="h-4 w-4" /> {lang === "vi" ? "Quay lại" : "Back"}
      </Link>
      <StudioShell
        videoId={video.id}
        videoName={video.originalName}
        defaultCoverMode={hasOnScreenText ? "blur" : "none"}
        previewUrl={previewUrl}
        trackId={translated.id}
        originalTrackId={original?.id ?? null}
        trackVersion={translated.version}
        durationSec={video.durationSec}
        original={(original?.segments ?? []) as SubtitleSegment[]}
        translated={translated.segments as SubtitleSegment[]}
        lang={lang}
      />
    </div>
  );
}
