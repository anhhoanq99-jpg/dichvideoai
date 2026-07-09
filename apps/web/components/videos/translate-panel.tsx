"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Languages, Loader2, PencilLine } from "lucide-react";
import Link from "next/link";
import { useJobPoll } from "@/hooks/use-job-poll";

const STYLES = [
  { value: "natural", label: "Tự nhiên (khuyên dùng)" },
  { value: "formal", label: "Trang trọng" },
  { value: "literal", label: "Sát nghĩa" },
] as const;

interface TranslatePanelProps {
  videoId: string;
  hasOriginalTrack: boolean;
  hasTranslatedTrack: boolean;
  initialGlossary: string | null;
}

export function TranslatePanel({
  videoId,
  hasOriginalTrack,
  hasTranslatedTrack,
  initialGlossary,
}: TranslatePanelProps) {
  const [style, setStyle] = useState<string>("natural");
  const [glossary, setGlossary] = useState(initialGlossary ?? "");
  const [showGlossary, setShowGlossary] = useState(false);
  const [jobId, setJobId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const job = useJobPoll(jobId);
  const router = useRouter();

  useEffect(() => {
    if (job?.status === "done") {
      router.refresh();
    }
  }, [job?.status, router]);

  if (!hasOriginalTrack) return null;

  const running = job?.status === "queued" || job?.status === "active";

  async function start() {
    setError(null);
    const res = await fetch(`/api/videos/${videoId}/translate`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ style, ...(glossary.trim() ? { glossary } : {}) }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error ?? "Không bắt đầu được dịch");
      return;
    }
    setJobId(data.jobId);
  }

  return (
    <section className="rounded-lg border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900">
      <div className="flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-sm font-semibold">
          <Languages className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
          Dịch sang tiếng Việt
        </h2>
        {hasTranslatedTrack && !running && (
          <Link
            href={`/videos/${videoId}/editor`}
            className="inline-flex items-center gap-1.5 rounded-md bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-indigo-700"
          >
            <PencilLine className="h-4 w-4" /> Mở trình chỉnh sửa
          </Link>
        )}
      </div>

      {running ? (
        <div className="mt-3">
          <p className="flex items-center gap-2 text-sm">
            <Loader2 className="h-4 w-4 animate-spin" />
            Đang dịch… {job?.progress ?? 0}%
          </p>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-neutral-100 dark:bg-neutral-800">
            <div
              className="h-full rounded-full bg-indigo-600 transition-all dark:bg-indigo-500"
              style={{ width: `${job?.progress ?? 0}%` }}
            />
          </div>
        </div>
      ) : (
        <div className="mt-3 space-y-3">
          <div className="flex flex-wrap items-center gap-3">
            <label className="text-sm text-neutral-600 dark:text-neutral-300">
              Phong cách:
            </label>
            <select
              value={style}
              onChange={(e) => setStyle(e.target.value)}
              className="rounded-md border border-neutral-300 bg-white px-2 py-1.5 text-sm dark:border-neutral-700 dark:bg-neutral-800"
            >
              {STYLES.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={() => setShowGlossary((v) => !v)}
              className="text-sm text-indigo-600 hover:underline dark:text-indigo-400"
            >
              {showGlossary ? "Ẩn thuật ngữ" : "+ Thuật ngữ / tên nhân vật"}
            </button>
          </div>

          {showGlossary && (
            <div>
              <textarea
                value={glossary}
                onChange={(e) => setGlossary(e.target.value)}
                rows={4}
                placeholder={"Mỗi dòng một cặp: thuật ngữ=bản dịch\nVí dụ:\n叶凡=Diệp Phàm\nsenpai=tiền bối"}
                className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-800"
              />
              <p className="mt-1 text-xs text-neutral-400">
                AI sẽ tuân theo bảng này để đồng nhất tên nhân vật và thuật ngữ.
              </p>
            </div>
          )}

          <button
            type="button"
            onClick={() => void start()}
            className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-indigo-700"
          >
            {hasTranslatedTrack ? "Dịch lại" : "Dịch sang tiếng Việt"}
          </button>
          {hasTranslatedTrack && (
            <p className="text-xs text-amber-600 dark:text-amber-400">
              Lưu ý: dịch lại sẽ ghi đè bản dịch hiện tại (kể cả các chỉnh sửa tay).
            </p>
          )}
        </div>
      )}

      {(error || job?.status === "failed") && (
        <p className="mt-3 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-300">
          {error ?? job?.error ?? "Dịch thất bại"}
        </p>
      )}
    </section>
  );
}
