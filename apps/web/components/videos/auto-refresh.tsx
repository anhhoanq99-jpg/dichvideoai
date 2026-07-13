"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

/**
 * Poll-refresh the server-rendered list while any video is still processing.
 * Giãn dần 5s → 15s để không dội truy vấn khi job chạy lâu.
 */
export function AutoRefresh({ enabled }: { enabled: boolean }) {
  const router = useRouter();
  const delayRef = useRef(5000);

  useEffect(() => {
    if (!enabled) return;
    delayRef.current = 5000;
    let timer: ReturnType<typeof setTimeout>;
    const tick = () => {
      router.refresh();
      delayRef.current = Math.min(delayRef.current * 1.5, 15_000);
      timer = setTimeout(tick, delayRef.current);
    };
    timer = setTimeout(tick, delayRef.current);
    return () => clearTimeout(timer);
  }, [enabled, router]);

  return null;
}
