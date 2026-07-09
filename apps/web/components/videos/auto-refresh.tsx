"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/** Poll-refresh the server-rendered list while any video is still processing. */
export function AutoRefresh({ enabled }: { enabled: boolean }) {
  const router = useRouter();
  useEffect(() => {
    if (!enabled) return;
    const t = setInterval(() => router.refresh(), 4000);
    return () => clearInterval(t);
  }, [enabled, router]);
  return null;
}
