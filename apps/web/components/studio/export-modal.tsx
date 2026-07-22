"use client";

import { useEffect, useState } from "react";
import { Clapperboard, Download, FileText, Wallet } from "lucide-react";
import {
  estimateJobCredits,
  isPremiumVoice,
  type CoverRegion,
  type JobStatus,
} from "@dichvideo/shared";
import { useJobRunner } from "@/hooks/use-job-runner";
import { JobError, JobProgress } from "@/components/jobs/job-ui";
import { Modal } from "@/components/ui/modal";
import type { RenderSettings } from "@/components/render/render-settings";
import { resolveVoice, type VoiceSelection } from "@/components/dub/voice-picker";
import type { Lang } from "@/lib/i18n";
import { cn } from "@/lib/utils";

const T = {
  vi: {
    startFail: "Không bắt đầu được xuất video",
    title: "Xuất video",
    lineRender: "Render phụ đề",
    lineRenderCover: "+ che chữ gốc",
    lineRenderLogo: "+ logo kênh",
    lineDub: "Lồng tiếng AI lên bản đã render",
    total: "Tổng:",
    missingRegions:
      "Đang chọn chế độ che chữ nhưng chưa khoanh vùng nào — video sẽ xuất KHÔNG che. Nếu cần che, đóng hộp này và kéo chuột khoanh vùng trên video.",
    wysiwyg:
      "Video xuất đúng như những gì bạn thấy trong khung xem trước. Job lỗi được hoàn xu tự động.",
    exportNow: "Xuất video ngay",
    balance: "Xu của bạn:",
    shortfall: (n: string) => `Còn thiếu ${n} xu`,
    topupNow: "Nạp thêm xu",
    rendering: "Đang render video…",
    dubbing: "Đang lồng tiếng lên bản đã render…",
    done: "Hoàn tất! Video đã sẵn sàng.",
    download: "Tải video về máy",
    keep7days: "File lưu 7 ngày — cũng tải lại được ở trang video.",
    exportFail: "Xuất video thất bại",
    dubFail: "Lồng tiếng thất bại — bản render phụ đề vẫn tải được ở trang video.",
    subsOnly: "Hoặc chỉ tải file phụ đề (miễn phí)",
    translatedSrt: "Bản dịch .SRT",
    translatedVtt: "Bản dịch .VTT",
    translatedTxt: "Bản dịch .TXT",
    originalSrt: "Bản gốc .SRT",
  },
  en: {
    startFail: "Could not start the export",
    title: "Export video",
    lineRender: "Render subtitles",
    lineRenderCover: "+ cover original text",
    lineRenderLogo: "+ channel logo",
    lineDub: "AI dubbing on the rendered video",
    total: "Total:",
    missingRegions:
      "Cover mode is on but no regions are drawn — the video will export WITHOUT covering. To cover text, close this dialog and drag on the video to draw regions.",
    wysiwyg:
      "The export matches exactly what you see in the preview. Failed jobs are refunded automatically.",
    exportNow: "Export now",
    balance: "Your credits:",
    shortfall: (n: string) => `${n} credits short`,
    topupNow: "Top up",
    rendering: "Rendering video…",
    dubbing: "Dubbing over the rendered video…",
    done: "Done! Your video is ready.",
    download: "Download video",
    keep7days: "Files are kept for 7 days — also downloadable from the video page.",
    exportFail: "Export failed",
    dubFail: "Dubbing failed — the subtitled render is still downloadable from the video page.",
    subsOnly: "Or just download subtitle files (free)",
    translatedSrt: "Translation .SRT",
    translatedVtt: "Translation .VTT",
    translatedTxt: "Translation .TXT",
    originalSrt: "Original .SRT",
  },
} as const;

export interface DubConfig {
  enabled: boolean;
  selection: VoiceSelection;
  /**
   * Giọng 2 & 3 cho phim nhiều nhân vật (null = chưa bật slot đó).
   * Dòng phụ đề gán `speaker = 1|2` sẽ đọc bằng các giọng này.
   */
  selection2: VoiceSelection | null;
  selection3: VoiceSelection | null;
  speed: number;
  /** -10..10 nửa cung — trầm/cao hơn giọng gốc */
  pitch: number;
  aiVolume: number;
  /** % nhạc nền gốc giữa các câu */
  bgVolume: number;
  /** % giọng nói gốc trong lúc AI đọc */
  origVoiceVolume: number;
}

interface ExportModalProps {
  videoId: string;
  trackId: string;
  originalTrackId: string | null;
  durationSec: number | null;
  settings: RenderSettings;
  regions: CoverRegion[];
  subBox: CoverRegion | null;
  dub: DubConfig;
  onClose: () => void;
  lang?: Lang;
}

interface ChainedDubJob {
  id: string;
  status: JobStatus;
  progress: number;
  error: string | null;
}

/**
 * Bước cuối của studio: xuất video đã render phụ đề (kèm lồng tiếng nếu bật).
 * Credits chỉ bị trừ tại đây — mọi chỉnh sửa trước đó đều miễn phí.
 */
export function ExportModal({
  videoId,
  trackId,
  originalTrackId,
  durationSec,
  settings,
  regions,
  subBox,
  dub,
  onClose,
  lang = "vi",
}: ExportModalProps) {
  const t = T[lang];
  const { job, jobId, running, error, start } = useJobRunner();
  // job lồng tiếng được worker nối tự động sau render → theo dõi qua latestJob
  const [dubJob, setDubJob] = useState<ChainedDubJob | null>(null);

  // bật che nhưng chưa khoanh vùng nào (vd video STT không có chữ trên hình)
  // → tự xuất không che thay vì chặn nút xuất
  const missingRegions = settings.coverMode !== "none" && regions.length === 0;
  const coverMode = missingRegions ? "none" : settings.coverMode;
  const covering = coverMode !== "none";
  const renderDone = job?.status === "done";
  const waitingDub = dub.enabled && renderDone && dubJob?.status !== "done";

  const renderCredits = durationSec
    ? estimateJobCredits("render", { durationSec })
    : 0;
  const dubCredits =
    dub.enabled && durationSec
      ? estimateJobCredits("dub", {
          durationSec,
          premiumVoice: isPremiumVoice(resolveVoice(dub.selection)),
        })
      : 0;

  /**
   * Số dư để đối chiếu với chi phí NGAY tại đây.
   * Trước đây khách bấm "Xuất video ngay" rồi mới biết thiếu xu — đúng vào lúc
   * họ sẵn sàng trả tiền thì lại nhận về một job hỏng. Giờ thấy trước, và thiếu
   * thì có ngay nút nạp.
   */
  const [balance, setBalance] = useState<number | null>(null);
  useEffect(() => {
    let cancelled = false;
    void fetch("/api/credits/balance")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (!cancelled && typeof d?.balance === "number") setBalance(d.balance);
      })
      .catch(() => {
        // không lấy được số dư thì im lặng — server vẫn chặn bằng 402
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const totalCredits = renderCredits + dubCredits;
  const shortfall = balance !== null ? Math.max(0, totalCredits - balance) : 0;

  // render xong + có lồng tiếng → chờ job dub nối tiếp hoàn tất
  useEffect(() => {
    if (!waitingDub) return;
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout>;
    const poll = async () => {
      try {
        const res = await fetch(`/api/videos/${videoId}`);
        if (res.ok) {
          const data = await res.json();
          if (cancelled) return;
          if (data.latestJob?.type === "dub") setDubJob(data.latestJob);
          if (data.latestJob?.type === "dub" && data.latestJob.status === "done") return;
        }
      } catch {
        // thử lại vòng sau
      }
      timer = setTimeout(poll, 2000);
    };
    void poll();
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [waitingDub, videoId]);

  function startExport() {
    void start(
      `/api/videos/${videoId}/render`,
      {
        trackId,
        styleId: settings.styleId,
        aspect: settings.aspect,
        coverMode,
        ...(covering && regions.length > 0
          ? { regions, blurStrength: settings.blurStrength }
          : {}),
        ...(subBox ? { subBox } : {}),
        ...(settings.logoOn && settings.logoType === "text" && settings.logoText.trim()
          ? {
              logo: {
                text: settings.logoText.trim(),
                position: settings.logoPosition,
                fontSize: settings.logoSize,
                color: settings.logoColor,
                opacity: settings.logoOpacity,
                ...(settings.logoFx !== null && settings.logoFy !== null
                  ? { fx: settings.logoFx, fy: settings.logoFy }
                  : {}),
              },
            }
          : {}),
        ...(settings.logoOn && settings.logoType === "image" && settings.logoImageKey
          ? {
              logoImage: {
                r2Key: settings.logoImageKey,
                position: settings.logoPosition,
                scalePct: settings.logoScale,
                opacity: settings.logoOpacity,
                ...(settings.logoFx !== null && settings.logoFy !== null
                  ? { fx: settings.logoFx, fy: settings.logoFy }
                  : {}),
              },
            }
          : {}),
        ...(settings.customize
          ? {
              font: settings.font,
              fontSize: settings.fontSize,
              bold: settings.bold,
              primaryColor: settings.primaryColor,
              outlineColor: settings.outlineColor,
              boxed: settings.boxed,
              boxColor: settings.boxColor,
              boxOpacity: settings.boxOpacity,
              marginV: settings.marginV,
              effect: settings.effect,
              accentColor: settings.accentColor,
            }
          : {}),
        ...(dub.enabled
          ? {
              finish: {
                dub: true,
                voice: resolveVoice(dub.selection),
                speed: dub.speed,
                voices: [dub.selection2, dub.selection3]
                  .filter((s): s is VoiceSelection => s !== null)
                  .map(resolveVoice),
                pitch: dub.pitch,
                aiVolume: dub.aiVolume,
                bgVolume: dub.bgVolume,
                origVoiceVolume: dub.origVoiceVolume,
              },
            }
          : {}),
      },
      t.startFail,
    );
  }

  const finalJobId = dub.enabled ? dubJob?.id : jobId;
  const allDone = renderDone && (!dub.enabled || dubJob?.status === "done");

  return (
    <Modal
      title={
        <>
          <Clapperboard className="h-4 w-4 text-success-500" /> {t.title}
        </>
      }
      onClose={onClose}
      lang={lang}
    >
      {!jobId && (
        <div className="space-y-3">
          <ul className="space-y-1.5 rounded-lg bg-neutral-50 p-3 text-sm text-neutral-600 dark:bg-neutral-800/60 dark:text-neutral-300">
            <li>
              • {t.lineRender} {covering ? `${t.lineRenderCover} ` : ""}
              {settings.logoOn && settings.logoText.trim() ? `${t.lineRenderLogo} ` : ""}—{" "}
              <b>{renderCredits.toLocaleString("vi-VN")} xu</b>
            </li>
            {dub.enabled && (
              <li>
                • {t.lineDub} —{" "}
                <b>{dubCredits.toLocaleString("vi-VN")} xu</b>
              </li>
            )}
            <li className="border-t border-neutral-200 pt-1.5 font-semibold dark:border-neutral-700">
              {t.total} {totalCredits.toLocaleString("vi-VN")} xu
            </li>
            {balance !== null && (
              <li
                className={cn(
                  "flex items-center justify-between border-t border-neutral-200 pt-1.5 text-xs dark:border-neutral-700",
                  shortfall > 0
                    ? "font-semibold text-red-600 dark:text-red-400"
                    : "text-neutral-500 dark:text-neutral-400",
                )}
              >
                <span>
                  {t.balance} {balance.toLocaleString("vi-VN")} xu
                </span>
                {shortfall > 0 && <span>{t.shortfall(shortfall.toLocaleString("vi-VN"))}</span>}
              </li>
            )}
          </ul>
          {missingRegions && (
            <p className="rounded-md bg-amber-50 px-3 py-2 text-xs text-amber-700 dark:bg-amber-950/40 dark:text-amber-300">
              {t.missingRegions}
            </p>
          )}
          <p className="text-xs text-neutral-400">
            {t.wysiwyg}
          </p>
          {shortfall > 0 ? (
            // thiếu xu → mời nạp thay vì để bấm rồi nhận lỗi
            <a
              href="/credits"
              className="flex w-full items-center justify-center gap-2 rounded-md bg-primary-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-primary-800"
            >
              <Wallet className="h-4 w-4" />
              {t.topupNow}
            </a>
          ) : (
            <button
              type="button"
              onClick={startExport}
              className="w-full rounded-md bg-success-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-success-800"
            >
              {t.exportNow}
            </button>
          )}
        </div>
      )}

      {running && (
        <JobProgress label={t.rendering} progress={job?.progress ?? 0} />
      )}
      {waitingDub && (
        <JobProgress
          className="mt-3"
          label={t.dubbing}
          progress={dubJob?.progress ?? 0}
          accent="emerald"
        />
      )}

      {allDone && finalJobId && (
        <div className="text-center">
          <p className="text-sm text-success-600 dark:text-success-400">
            {t.done}
          </p>
          <a
            href={`/api/jobs/${finalJobId}/download`}
            className="mt-3 inline-flex items-center gap-2 rounded-md bg-success-700 px-5 py-2.5 text-sm font-semibold text-white hover:bg-success-800"
          >
            <Download className="h-4 w-4" /> {t.download}
          </a>
          <p className="mt-2 text-xs text-neutral-400">
            {t.keep7days}
          </p>
        </div>
      )}

      <JobError className="mt-3" error={error} job={job} fallback={t.exportFail} />
      {dubJob?.status === "failed" && (
        <p className="mt-3 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-300">
          {dubJob.error ?? t.dubFail}
        </p>
      )}

      <div className="mt-5 border-t border-neutral-200 pt-3 dark:border-neutral-800">
        <p className="flex items-center gap-1.5 text-xs font-medium text-neutral-500 dark:text-neutral-400">
          <FileText className="h-3.5 w-3.5" /> {t.subsOnly}
        </p>
        <div className="mt-2 flex flex-wrap gap-2 text-xs">
          {[
            { href: `/api/tracks/${trackId}/export?format=srt`, label: t.translatedSrt },
            { href: `/api/tracks/${trackId}/export?format=vtt`, label: t.translatedVtt },
            { href: `/api/tracks/${trackId}/export?format=txt`, label: t.translatedTxt },
            ...(originalTrackId
              ? [{ href: `/api/tracks/${originalTrackId}/export?format=srt`, label: t.originalSrt }]
              : []),
          ].map((f) => (
            <a
              key={f.href}
              href={f.href}
              className="rounded-md border border-neutral-300 px-2.5 py-1 hover:bg-neutral-100 dark:border-neutral-700 dark:hover:bg-neutral-800"
            >
              {f.label}
            </a>
          ))}
        </div>
      </div>
    </Modal>
  );
}
