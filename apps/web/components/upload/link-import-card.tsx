"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Link2, Loader2, Play } from "lucide-react";
import { detectVideoSource, isImportableUrl } from "@dichvideo/shared";
import type { PipelineSettings } from "@/hooks/use-multipart-upload";
import { httpError, readJson } from "@/lib/http-json";
import type { Lang } from "@/lib/i18n";

const T = {
  vi: {
    title: "Hoặc dán link video",
    placeholder:
      "https://v.douyin.com/… — Douyin, Kuaishou, Bilibili, TikTok, YouTube… mỗi dòng một link",
    hint: "Hỗ trợ ~1.800 trang video. Hệ thống tự tải video về rồi chạy pipeline như video upload tay — tải link miễn phí.",
    submit: "Tải & xử lý",
    importing: "Đang gửi…",
    badLink: (line: string) => `Link không hợp lệ: ${line}`,
    failed: (line: string) => `Không gửi được: ${line}`,
    detected: "Nguồn nhận diện:",
    generic: "Trang khác (thử qua yt-dlp)",
  },
  en: {
    title: "Or paste video links",
    placeholder:
      "https://v.douyin.com/… — Douyin, Kuaishou, Bilibili, TikTok, YouTube… one link per line",
    hint: "~1,800 sites supported. The system downloads the video and runs the same pipeline as a manual upload — importing is free.",
    submit: "Import & process",
    importing: "Submitting…",
    badLink: (line: string) => `Invalid link: ${line}`,
    failed: (line: string) => `Failed to submit: ${line}`,
    detected: "Detected sources:",
    generic: "Other site (via yt-dlp)",
  },
} as const;

interface LinkImportCardProps {
  /** thiết lập pipeline hiện tại của trang upload — áp cho mọi link */
  buildSettings: () => PipelineSettings;
  disabled?: boolean;
  initialUrl?: string;
  lang?: Lang;
}

/** Ô dán link video: mỗi dòng một link → POST /api/videos/import từng link. */
export function LinkImportCard({
  buildSettings,
  disabled = false,
  initialUrl = "",
  lang = "vi",
}: LinkImportCardProps) {
  const t = T[lang];
  const router = useRouter();
  const [text, setText] = useState(initialUrl);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const links = useMemo(
    () => text.split("\n").map((s) => s.trim()).filter(Boolean),
    [text],
  );
  const sources = useMemo(
    () =>
      [...new Set(
        links
          .filter(isImportableUrl)
          .map((l) => detectVideoSource(l)?.name ?? t.generic),
      )],
    [links, t.generic],
  );

  async function submit() {
    if (links.length === 0 || busy) return;
    const bad = links.find((l) => !isImportableUrl(l));
    if (bad) {
      setError(t.badLink(bad));
      return;
    }
    setBusy(true);
    setError(null);
    const settings = buildSettings();
    let firstVideoId: string | null = null;
    let okCount = 0;
    for (const url of links) {
      try {
        const res = await fetch("/api/videos/import", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ url, pipeline: settings }),
        });
        // `throw new Error()` rỗng + catch nuốt sạch → mọi lỗi đều ra đúng một
        // câu "tải link thất bại", không biết vì sao. Giữ lại lý do thật.
        if (!res.ok) throw await httpError(res, t.failed(url));
        const data = await readJson<{ videoId: string }>(res, t.failed(url));
        okCount++;
        firstVideoId ??= data.videoId;
      } catch (err) {
        setError(err instanceof Error ? err.message : t.failed(url));
      }
    }
    setBusy(false);
    if (okCount === 1 && firstVideoId && links.length === 1) {
      router.push(`/videos/${firstVideoId}/editor`);
    } else if (okCount > 0) {
      router.push("/videos");
    }
  }

  return (
    <div className="space-y-3 rounded-xl border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900">
      <p className="flex items-center gap-2 text-sm font-semibold">
        <Link2 className="h-4 w-4 text-primary-500" /> {t.title}
      </p>
      <textarea
        value={text}
        onChange={(e) => {
          setText(e.target.value);
          setError(null);
        }}
        rows={Math.min(5, Math.max(2, links.length + 1))}
        placeholder={t.placeholder}
        disabled={disabled || busy}
        className="w-full resize-y rounded-lg border border-neutral-300 bg-transparent px-3 py-2 font-mono text-xs leading-relaxed placeholder:font-sans focus:outline-none dark:border-neutral-700"
      />
      {sources.length > 0 && (
        <p className="flex flex-wrap items-center gap-1.5 text-xs text-neutral-500 dark:text-neutral-400">
          {t.detected}
          {sources.map((s) => (
            <span
              key={s}
              className="rounded-full bg-primary-50 px-2 py-0.5 font-medium text-primary-700 dark:bg-primary-950/40 dark:text-primary-300"
            >
              {s}
            </span>
          ))}
        </p>
      )}
      <div className="flex items-center gap-3">
        <button
          type="button"
          disabled={links.length === 0 || disabled || busy}
          onClick={() => void submit()}
          className="inline-flex items-center gap-2 rounded-lg bg-primary-600 px-5 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {busy ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" /> {t.importing}
            </>
          ) : (
            <>
              <Play className="h-4 w-4" /> {t.submit}
            </>
          )}
        </button>
        <p className="flex-1 text-xs text-neutral-400">{t.hint}</p>
      </div>
      {error && (
        <p className="rounded-md bg-red-50 px-3 py-2 text-xs text-red-700 dark:bg-red-950/40 dark:text-red-300">
          {error}
        </p>
      )}
    </div>
  );
}
