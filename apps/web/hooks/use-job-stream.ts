"use client";

import { useEffect, useState } from "react";

export interface JobStreamInfo {
  status: "queued" | "active" | "done" | "failed" | "cancelled";
  progress: number;
  error: string | null;
  result: unknown;
}

/**
 * Live job progress via SSE (EventSource auto-reconnects); falls back to
 * 2s polling if EventSource errors out entirely.
 */
export function useJobStream(jobId: string | null) {
  const [job, setJob] = useState<JobStreamInfo | null>(null);

  useEffect(() => {
    if (!jobId) return;
    let stop = false;
    let pollTimer: ReturnType<typeof setTimeout> | null = null;

    const es = new EventSource(`/api/jobs/${jobId}/stream`);

    es.onmessage = (ev) => {
      if (stop) return;
      const data: JobStreamInfo = JSON.parse(ev.data);
      setJob(data);
      if (data.status === "done" || data.status === "failed" || data.status === "cancelled") {
        es.close();
      }
    };

    es.onerror = () => {
      // EventSource retries by itself; add polling as belt-and-braces
      if (stop || pollTimer) return;
      const poll = async () => {
        if (stop) return;
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
            if (data.status === "done" || data.status === "failed") {
              es.close();
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
      stop = true;
      es.close();
      if (pollTimer) clearTimeout(pollTimer);
    };
  }, [jobId]);

  return job;
}
