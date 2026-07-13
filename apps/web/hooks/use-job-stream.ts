"use client";

import { useEffect, useState } from "react";
import type { JobStatus } from "@dichvideo/shared";

export interface JobStreamInfo {
  status: JobStatus;
  progress: number;
  error: string | null;
  result: unknown;
}

function isTerminal(status: JobStatus) {
  return status === "done" || status === "failed" || status === "cancelled";
}

/**
 * Live job progress via SSE (EventSource auto-reconnects); falls back to
 * 2s polling if EventSource errors out entirely.
 */
export function useJobStream(jobId: string | null) {
  const [job, setJob] = useState<JobStreamInfo | null>(null);

  useEffect(() => {
    if (!jobId) return;
    let cancelled = false;
    let pollTimer: ReturnType<typeof setTimeout> | null = null;

    const eventSource = new EventSource(`/api/jobs/${jobId}/stream`);

    eventSource.onmessage = (ev) => {
      if (cancelled) return;
      const data: JobStreamInfo = JSON.parse(ev.data);
      setJob(data);
      if (isTerminal(data.status)) eventSource.close();
    };

    eventSource.onerror = () => {
      // EventSource retries by itself; add polling as belt-and-braces
      if (cancelled || pollTimer) return;
      const poll = async () => {
        if (cancelled) return;
        try {
          const res = await fetch(`/api/jobs/${jobId}`);
          if (res.ok) {
            const data = await res.json();
            setJob({
              status: data.status,
              progress: data.progress,
              error: data.error,
              result: null,
            });
            if (isTerminal(data.status)) {
              eventSource.close();
              return;
            }
          }
        } catch {
          // keep polling
        }
        pollTimer = setTimeout(poll, 2000);
      };
      pollTimer = setTimeout(poll, 2000);
    };

    return () => {
      cancelled = true;
      eventSource.close();
      if (pollTimer) clearTimeout(pollTimer);
    };
  }, [jobId]);

  return job;
}
