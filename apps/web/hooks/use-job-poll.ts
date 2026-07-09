"use client";

import { useEffect, useState } from "react";

export interface JobStatusInfo {
  id: string;
  type: string;
  status: "queued" | "active" | "done" | "failed" | "cancelled";
  progress: number;
  error: string | null;
  videoId: string;
}

/** Poll GET /api/jobs/:id every 2s until terminal state. SSE replaces this in Phase 4. */
export function useJobPoll(jobId: string | null) {
  const [job, setJob] = useState<JobStatusInfo | null>(null);

  useEffect(() => {
    if (!jobId) return;
    let stop = false;

    async function tick() {
      const res = await fetch(`/api/jobs/${jobId}`);
      if (!res.ok) return;
      const data: JobStatusInfo = await res.json();
      if (stop) return;
      setJob(data);
      if (data.status === "queued" || data.status === "active") {
        setTimeout(tick, 2000);
      }
    }

    void tick();
    return () => {
      stop = true;
    };
  }, [jobId]);

  return job;
}
