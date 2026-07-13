"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useJobStream } from "./use-job-stream";

const TERMINAL_STATUSES = ["done", "failed", "cancelled"] as const;

/**
 * Vòng đời chung của một job pipeline phía client, dùng cho mọi panel
 * (dịch, render, lồng tiếng, trích xuất...): POST khởi động job, theo dõi
 * tiến độ qua SSE, tự làm mới dữ liệu trang khi job xong.
 */
export function useJobRunner(options?: {
  /** "refresh" (mặc định): router.refresh() — "reload": nạp lại cả trang. */
  onDone?: "refresh" | "reload";
}) {
  const onDone = options?.onDone ?? "refresh";
  const [jobId, setJobId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const job = useJobStream(jobId);
  const router = useRouter();

  useEffect(() => {
    if (job?.status !== "done") return;
    if (onDone === "reload") window.location.reload();
    else router.refresh();
  }, [job?.status, onDone, router]);

  // đã bấm chạy và job chưa về trạng thái cuối (kể cả lúc chờ sự kiện SSE đầu tiên)
  const running =
    jobId !== null &&
    (!job || !TERMINAL_STATUSES.includes(job.status as (typeof TERMINAL_STATUSES)[number]));

  const resultKey = (job?.result as { r2Key?: string } | null)?.r2Key ?? null;

  /** Gọi API khởi động job; trả về false kèm setError khi thất bại. */
  async function start(url: string, body: unknown, fallbackError: string) {
    setError(null);
    const res = await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(data.error ?? fallbackError);
      return false;
    }
    setJobId(data.jobId);
    return true;
  }

  return { job, jobId, running, error, setError, resultKey, start };
}
