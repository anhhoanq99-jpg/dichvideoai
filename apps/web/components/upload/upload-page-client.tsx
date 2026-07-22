"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { CloudUpload, Gift, GraduationCap, Loader2, Play, X } from "lucide-react";
import { BrandMark } from "@/components/brand-logo";
import {
  CREDIT_PRICING,
  UPLOAD_ALLOWED_TYPES,
  UPLOAD_MAX_BYTES,
} from "@dichvideo/shared";

/**
 * Xu cho MỘT phút Việt hóa trọn gói — tính từ đơn giá thật thay vì gõ số cứng,
 * để lời chào không bao giờ nói lệch bảng giá khi giá đổi.
 * Trọn gói 1 phút ≈ tách phụ đề cứng + render + lồng tiếng thường + ~15 dòng dịch
 * (cùng công thức trang Nạp xu đang dùng).
 */
const FULL_LOCALIZE_PER_MIN =
  CREDIT_PRICING.ocrPerMin +
  CREDIT_PRICING.renderPerMin +
  CREDIT_PRICING.dubEdgePerMin +
  15 * CREDIT_PRICING.translatePerLine;
import {
  useMultipartUpload,
  type PipelineSettings,
} from "@/hooks/use-multipart-upload";
import {
  DEFAULT_PIPELINE_VALUES,
  PipelineSettingsCard,
  toPipelineSettings,
  type UploadPipelineValues,
} from "@/components/upload/pipeline-settings-card";
import { LinkImportCard } from "@/components/upload/link-import-card";
import {
  UploadFileList,
  fileKey,
  type UploadFileStatus,
} from "@/components/upload/upload-file-list";
import type { Lang } from "@/lib/i18n";
import { cn } from "@/lib/utils";

const T = {
  vi: {
    title: "Dịch & lồng tiếng video",
    tutorialTitle: "Video hướng dẫn sử dụng",
    welcomeTitle: "Chào bạn! Tài khoản đã có sẵn xu để dùng thử",
    welcomeBody: (xu: string, phut: string) =>
      `Bạn đang có ${xu} xu — đủ Việt hóa trọn gói khoảng ${phut} phút video. Xu không bao giờ hết hạn.`,
    welcomeHint: "Chưa có video sẵn? Dán link YouTube/TikTok/Facebook ở ô bên dưới là làm được ngay.",
    errFormat: (name: string) =>
      `"${name}": định dạng không hỗ trợ (MP4, MOV, MKV, WebM).`,
    errSize: (name: string) => `"${name}": vượt giới hạn 2GB.`,
    dropTitle: "Kéo thả video hoặc bấm để chọn",
    dropHint: "Chọn được nhiều video cùng lúc — MP4, MOV, MKV, WebM, tối đa 2GB/video",
    uploading: "Đang tải lên…",
    start: "Bắt Đầu",
    cancel: "Hủy",
    footnote:
      "Sau khi tải lên, từng video sẽ tự chạy: đọc thông số → trích phụ đề gốc → dịch sang tiếng Việt. Theo dõi tiến trình trong danh sách video.",
  },
  en: {
    title: "Translate & dub videos",
    tutorialTitle: "How-to video",
    welcomeTitle: "Welcome! Your account already has trial credits",
    welcomeBody: (xu: string, phut: string) =>
      `You have ${xu} credits — enough to fully localize about ${phut} minutes of video. Credits never expire.`,
    welcomeHint:
      "No video handy? Paste a YouTube/TikTok/Facebook link in the box below.",
    errFormat: (name: string) =>
      `"${name}": unsupported format (MP4, MOV, MKV, WebM).`,
    errSize: (name: string) => `"${name}": exceeds the 2GB limit.`,
    dropTitle: "Drag & drop videos or click to browse",
    dropHint: "Select multiple videos at once — MP4, MOV, MKV, WebM, up to 2GB each",
    uploading: "Uploading…",
    start: "Start",
    cancel: "Cancel",
    footnote:
      "After upload, each video runs automatically: read metadata → extract original subtitles → translate. Track progress in your video list.",
  },
} as const;

/**
 * Video hướng dẫn sử dụng — nội dung do admin upload ở trang Quản trị.
 * Hỏi trước /api/demo/huong-dan?check=1 để chỉ hiện khi đã có video (đỡ player rỗng).
 */
function TutorialVideo({ title }: { title: string }) {
  const [exists, setExists] = useState(false);
  useEffect(() => {
    let cancelled = false;
    fetch("/api/demo/huong-dan?check=1")
      .then((r) => r.json())
      .then((d) => {
        if (!cancelled) setExists(Boolean(d?.exists));
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);
  if (!exists) return null;
  return (
    <div className="rounded-2xl border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900">
      <p className="flex items-center gap-2 text-sm font-semibold">
        <GraduationCap className="h-4 w-4 text-primary-500" /> {title}
      </p>
      <video
        src="/api/demo/huong-dan"
        controls
        playsInline
        preload="metadata"
        className="mt-3 max-h-[70vh] w-full rounded-lg bg-black"
      />
    </div>
  );
}

/** Đọc thời lượng video (giây) ngay trên trình duyệt để ước tính credits. */
function readDuration(file: File): Promise<number | null> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const video = document.createElement("video");
    video.preload = "metadata";
    video.onloadedmetadata = () => {
      URL.revokeObjectURL(url);
      resolve(Number.isFinite(video.duration) ? Math.round(video.duration) : null);
    };
    video.onerror = () => {
      URL.revokeObjectURL(url);
      resolve(null);
    };
    video.src = url;
  });
}

export function UploadPageClient({
  lang = "vi",
  initialUrl = "",
  firstTime = false,
  balance = 0,
}: {
  lang?: Lang;
  initialUrl?: string;
  /** chưa có video nào → hiện lời chào + số xu đang có */
  firstTime?: boolean;
  balance?: number;
}) {
  const t = T[lang];
  const { state, upload, cancel } = useMultipartUpload();
  const [dragOver, setDragOver] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const router = useRouter();

  // thiết lập pipeline (áp cho tất cả video trong danh sách)
  const [pipeline, setPipeline] = useState<UploadPipelineValues>(
    DEFAULT_PIPELINE_VALUES,
  );

  const [files, setFiles] = useState<File[]>([]);
  const [statuses, setStatuses] = useState<UploadFileStatus[]>([]);
  const [durations, setDurations] = useState<Record<string, number | null>>({});
  const [running, setRunning] = useState(false);

  const addFiles = useCallback(
    (list: FileList | null) => {
      if (!list) return;
      setLocalError(null);
      const accepted: File[] = [];
      for (const file of Array.from(list)) {
        if (!UPLOAD_ALLOWED_TYPES[file.type]) {
          setLocalError(t.errFormat(file.name));
          continue;
        }
        if (file.size > UPLOAD_MAX_BYTES) {
          setLocalError(t.errSize(file.name));
          continue;
        }
        accepted.push(file);
      }
      if (accepted.length) {
        setFiles((prev) => [...prev, ...accepted]);
        setStatuses((prev) => [
          ...prev,
          ...accepted.map(() => "waiting" as UploadFileStatus),
        ]);
        // đọc thời lượng nền để hiện ước tính credits
        for (const file of accepted) {
          void readDuration(file).then((durationSec) =>
            setDurations((prev) => ({ ...prev, [fileKey(file)]: durationSec })),
          );
        }
      }
    },
    [t],
  );

  async function startAll() {
    if (files.length === 0 || running) return;
    setRunning(true);
    setLocalError(null);
    const settings: PipelineSettings = toPipelineSettings(pipeline);

    let okCount = 0;
    let firstVideoId: string | null = null;
    for (let i = 0; i < files.length; i++) {
      setStatuses((prev) => prev.map((s, k) => (k === i ? "uploading" : s)));
      const videoId = await upload(files[i], settings);
      setStatuses((prev) =>
        prev.map((s, k) => (k === i ? (videoId ? "done" : "error") : s)),
      );
      if (videoId) {
        okCount++;
        firstVideoId ??= videoId;
      }
    }
    setRunning(false);
    // 1 video → vào thẳng màn xử lý rồi tự mở trình chỉnh sửa; nhiều video → danh sách
    if (okCount === 1 && firstVideoId) router.push(`/videos/${firstVideoId}/editor`);
    else if (okCount > 0) router.push("/videos");
  }

  const uploadingPct = state.phase === "uploading" ? state.pct : null;

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <div className="text-center">
        <h1 className="flex items-center justify-center gap-2.5 text-2xl font-semibold tracking-tight">
          <BrandMark className="h-9 w-9 shrink-0" />
          {t.title}
        </h1>
      </div>

      {/* Lần đầu vào: nói rõ đang có bao nhiêu xu và làm được gì với số đó.
          Con số quy đổi tính từ ĐƠN GIÁ THẬT nên không bao giờ lệch bảng giá. */}
      {firstTime && balance > 0 && (
        <div className="rounded-2xl border border-primary-200 bg-primary-50 p-4 dark:border-primary-900 dark:bg-primary-950/30">
          <p className="flex items-center gap-2 text-sm font-semibold text-primary-800 dark:text-primary-200">
            <Gift className="h-4 w-4 shrink-0" /> {t.welcomeTitle}
          </p>
          <p className="mt-1.5 text-sm text-primary-900/80 dark:text-primary-100/80">
            {t.welcomeBody(
              balance.toLocaleString("vi-VN"),
              Math.max(1, Math.floor(balance / FULL_LOCALIZE_PER_MIN)).toLocaleString("vi-VN"),
            )}
          </p>
          <p className="mt-1 text-xs text-primary-800/70 dark:text-primary-200/70">
            {t.welcomeHint}
          </p>
        </div>
      )}

      {/* video hướng dẫn — admin thêm ở trang Quản trị; chỉ hiện khi đã có */}
      <TutorialVideo title={t.tutorialTitle} />

      <PipelineSettingsCard
        values={pipeline}
        onChange={(patch) => setPipeline((prev) => ({ ...prev, ...patch }))}
        disabled={running}
        lang={lang}
      />

      {/* Nhập từ đường link (Douyin, Bilibili, YouTube…) */}
      <LinkImportCard
        buildSettings={() => toPipelineSettings(pipeline)}
        disabled={running}
        initialUrl={initialUrl}
        lang={lang}
      />

      {/* Khu thả file */}
      <label
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          addFiles(e.dataTransfer.files);
        }}
        className={cn(
          "flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed py-12 transition-colors",
          dragOver
            ? "border-primary-500 bg-primary-50 dark:bg-primary-950/30"
            : "border-neutral-300 hover:border-neutral-400 dark:border-neutral-700 dark:hover:border-neutral-600",
        )}
      >
        <CloudUpload className="h-10 w-10 text-neutral-400" />
        <p className="mt-3 text-sm font-medium">{t.dropTitle}</p>
        <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
          {t.dropHint}
        </p>
        <input
          type="file"
          multiple
          accept="video/mp4,video/quicktime,video/x-matroska,video/webm"
          className="hidden"
          disabled={running}
          onChange={(e) => {
            addFiles(e.target.files);
            e.target.value = "";
          }}
        />
      </label>

      <UploadFileList
        files={files}
        statuses={statuses}
        durations={durations}
        method={pipeline.method}
        uploadingPct={uploadingPct}
        running={running}
        lang={lang}
        onRemove={(index) => {
          setFiles((prev) => prev.filter((_, k) => k !== index));
          setStatuses((prev) => prev.filter((_, k) => k !== index));
        }}
      />

      {/* Nút bắt đầu */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          disabled={files.length === 0 || running}
          onClick={() => void startAll()}
          className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-primary-600 to-accent-600 px-6 py-3 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {running ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" /> {t.uploading}
            </>
          ) : (
            <>
              <Play className="h-4 w-4" /> {t.start}
            </>
          )}
        </button>
        {running && (
          <button
            type="button"
            onClick={() => void cancel()}
            className="flex items-center gap-1 rounded-lg border border-neutral-300 px-4 py-3 text-sm text-red-600 hover:bg-red-50 dark:border-neutral-700 dark:text-red-400 dark:hover:bg-red-950/40"
          >
            <X className="h-4 w-4" /> {t.cancel}
          </button>
        )}
      </div>
      <p className="text-center text-xs text-neutral-400">
        {t.footnote}
      </p>

      {(localError || state.phase === "error") && (
        <p className="rounded-md bg-red-50 px-4 py-3 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-300">
          {localError ?? (state.phase === "error" ? state.message : "")}
        </p>
      )}
    </div>
  );
}
