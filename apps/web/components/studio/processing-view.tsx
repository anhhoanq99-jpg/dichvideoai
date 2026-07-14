"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { RefreshCw, TriangleAlert } from "lucide-react";
import type { JobStatus, JobType } from "@dichvideo/shared";
import type { Lang } from "@/lib/i18n";

/** Nhãn từng bước pipeline hiển thị cho user. */
const T = {
  vi: {
    stageLabels: {
      import: "Đang tải video từ link…",
      probe: "Đang đọc thông số video…",
      ocr: "Đang trích xuất phụ đề…",
      stt: "Đang nhận dạng giọng nói…",
      translate: "Đang dịch sang tiếng Việt…",
    } as Partial<Record<JobType, string>>,
    stageHints: {
      import: "Hệ thống đang tải video gốc từ trang nguồn về",
      ocr: "AI đang đọc chữ trên từng khung hình",
      stt: "AI đang nghe và gỡ băng lời thoại",
      translate: "Dịch theo ngữ cảnh toàn video rồi biên tập lại theo văn nói",
    } as Partial<Record<JobType, string>>,
    failedFallback: "Xử lý thất bại — xu đã được hoàn.",
    preparing: "Đang chuẩn bị xử lý…",
    failedTitle: "Xử lý thất bại",
    tryAnother: "Thử lại với video khác",
    scanArea: "Vùng phụ đề đang quét (khung đỏ):",
    footer:
      "Xong bước dịch sẽ tự mở trình chỉnh sửa để bạn xem trước và xuất video. Có thể rời trang này — tiến trình vẫn chạy.",
  },
  en: {
    stageLabels: {
      import: "Downloading video from link…",
      probe: "Reading video info…",
      ocr: "Extracting subtitles…",
      stt: "Transcribing speech…",
      translate: "Translating…",
    } as Partial<Record<JobType, string>>,
    stageHints: {
      import: "Fetching the original video from the source site",
      ocr: "AI is reading on-screen text frame by frame",
      stt: "AI is listening and transcribing the dialogue",
      translate: "Translating with full-video context, then editing for natural speech",
    } as Partial<Record<JobType, string>>,
    failedFallback: "Processing failed — credits have been refunded.",
    preparing: "Preparing to process…",
    failedTitle: "Processing failed",
    tryAnother: "Try another video",
    scanArea: "Subtitle scan area (red box):",
    footer:
      "Once translation finishes, the editor opens automatically so you can preview and export. You can leave this page — processing keeps running.",
  },
} as const;

interface LatestJob {
  id: string;
  type: JobType;
  status: JobStatus;
  progress: number;
  error: string | null;
}

interface ProcessingViewProps {
  videoId: string;
  videoName: string;
  lang?: Lang;
}

/**
 * Màn "đang xử lý" sau khi upload: hiện bước hiện tại + % tiến độ + khung
 * hình video với dải quét phụ đề. Xong bước dịch → tự mở trình chỉnh sửa
 * (server component render lại thành studio).
 */
export function ProcessingView({ videoId, videoName, lang = "vi" }: ProcessingViewProps) {
  const t = T[lang];
  const router = useRouter();
  const [job, setJob] = useState<LatestJob | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [failed, setFailed] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/videos/${videoId}/preview-url`)
      .then((res) => res.json())
      .then((data) => setPreviewUrl(data.url ?? null))
      .catch(() => {});
  }, [videoId]);

  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout>;

    const poll = async () => {
      try {
        const res = await fetch(`/api/videos/${videoId}`);
        if (res.ok) {
          const data = await res.json();
          if (cancelled) return;
          const hasTranslated = (
            data.tracks as { kind: string }[] | undefined
          )?.some((t) => t.kind === "translated");
          if (hasTranslated) {
            router.refresh(); // server page render lại → vào studio
            return;
          }
          setJob(data.latestJob ?? null);
          if (data.latestJob?.status === "failed" || data.video?.status === "failed") {
            setFailed(data.latestJob?.error ?? t.failedFallback);
            return;
          }
        }
      } catch {
        // mạng chập chờn → thử lại vòng sau
      }
      timer = setTimeout(poll, 2500);
    };
    void poll();
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [videoId, router, t.failedFallback]);

  const label = (job && t.stageLabels[job.type]) ?? t.preparing;
  const hint = job ? t.stageHints[job.type] : undefined;
  const progress = job?.progress ?? 0;

  if (failed) {
    return (
      <div className="mx-auto flex max-w-md flex-col items-center py-16 text-center">
        <TriangleAlert className="h-10 w-10 text-red-500" />
        <h1 className="mt-4 text-lg font-semibold">{t.failedTitle}</h1>
        <p className="mt-2 text-sm text-neutral-500 dark:text-neutral-400">{failed}</p>
        <Link
          href="/videos/upload"
          className="mt-6 rounded-md bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700"
        >
          {t.tryAnother}
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-md py-8">
      <div className="rounded-2xl border border-neutral-200 bg-white p-6 text-center dark:border-neutral-800 dark:bg-neutral-900">
        <RefreshCw className="mx-auto h-8 w-8 animate-spin text-primary-500 [animation-duration:2.5s]" />
        <h1 className="mt-4 text-lg font-semibold">{label}</h1>
        <p className="mt-1 truncate text-xs text-neutral-500 dark:text-neutral-400">
          {videoName}
        </p>

        <div className="mt-4">
          <div className="flex items-center justify-between text-xs">
            <span className="text-neutral-500 dark:text-neutral-400">{hint ?? " "}</span>
            <span className="font-semibold text-primary-600 dark:text-primary-400">
              {progress}%
            </span>
          </div>
          <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-neutral-100 dark:bg-neutral-800">
            <div
              className="h-full rounded-full bg-primary-600 transition-all dark:bg-primary-500"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {previewUrl && (
          <div className="mt-5">
            <p className="text-xs font-medium text-amber-600 dark:text-amber-400">
              {t.scanArea}
            </p>
            <div className="relative mx-auto mt-2 max-h-[420px] w-fit overflow-hidden rounded-lg">
              <video
                src={previewUrl}
                muted
                playsInline
                preload="metadata"
                className="max-h-[420px] w-auto"
              />
              {/* dải đáy — chỗ phụ đề gốc thường nằm */}
              <div
                className="absolute border-2 border-red-500/90"
                style={{ left: "2%", top: "78%", width: "96%", height: "16%" }}
              />
            </div>
          </div>
        )}

        <p className="mt-5 text-xs text-neutral-400">
          {t.footer}
        </p>
      </div>
    </div>
  );
}
