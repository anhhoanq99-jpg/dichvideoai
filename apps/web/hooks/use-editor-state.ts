"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { SubtitleSegment } from "@dichvideo/shared";

export type SaveState = "saved" | "dirty" | "saving" | "conflict" | "error";

/**
 * Holds the editable segment list for a track, with debounced autosave (1.5s)
 * and optimistic-concurrency conflict detection.
 */
export function useEditorState(
  trackId: string,
  initialSegments: SubtitleSegment[],
  initialVersion: number,
) {
  const [segments, setSegments] = useState(initialSegments);
  const [saveState, setSaveState] = useState<SaveState>("saved");
  const versionRef = useRef(initialVersion);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inflightRef = useRef(false);

  const persist = useCallback(
    async (segs: SubtitleSegment[]) => {
      if (inflightRef.current) return;
      inflightRef.current = true;
      setSaveState("saving");
      try {
        const res = await fetch(`/api/tracks/${trackId}`, {
          method: "PATCH",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ version: versionRef.current, segments: segs }),
        });
        if (res.status === 409) {
          setSaveState("conflict");
          return;
        }
        if (!res.ok) {
          setSaveState("error");
          return;
        }
        const data = await res.json();
        versionRef.current = data.version;
        setSaveState("saved");
      } catch {
        setSaveState("error");
      } finally {
        inflightRef.current = false;
      }
    },
    [trackId],
  );

  const updateSegmentText = useCallback(
    (i: number, text: string) => {
      setSegments((prev) => {
        const next = prev.map((s) => (s.i === i ? { ...s, text } : s));
        setSaveState("dirty");
        if (timerRef.current) clearTimeout(timerRef.current);
        timerRef.current = setTimeout(() => void persist(next), 1500);
        return next;
      });
    },
    [persist],
  );

  const replaceAll = useCallback(
    (find: string, replace: string) => {
      if (!find) return 0;
      let count = 0;
      setSegments((prev) => {
        const next = prev.map((s) => {
          if (!s.text.includes(find)) return s;
          count += s.text.split(find).length - 1;
          return { ...s, text: s.text.split(find).join(replace) };
        });
        if (count > 0) {
          setSaveState("dirty");
          if (timerRef.current) clearTimeout(timerRef.current);
          timerRef.current = setTimeout(() => void persist(next), 1500);
        }
        return next;
      });
      return count;
    },
    [persist],
  );

  /** Thêm 1 dòng phụ đề mới tại mốc thời gian (giữ i duy nhất, sắp theo startMs). */
  const insertSegment = useCallback(
    (startMs: number) => {
      setSegments((prev) => {
        const maxI = prev.reduce((max, s) => Math.max(max, s.i), -1);
        const next = [
          ...prev,
          { i: maxI + 1, startMs, endMs: startMs + 2000, text: "" },
        ].sort((a, b) => a.startMs - b.startMs);
        setSaveState("dirty");
        if (timerRef.current) clearTimeout(timerRef.current);
        timerRef.current = setTimeout(() => void persist(next), 1500);
        return next;
      });
    },
    [persist],
  );

  const deleteSegment = useCallback(
    (i: number) => {
      setSegments((prev) => {
        const next = prev.filter((s) => s.i !== i);
        setSaveState("dirty");
        if (timerRef.current) clearTimeout(timerRef.current);
        timerRef.current = setTimeout(() => void persist(next), 1500);
        return next;
      });
    },
    [persist],
  );

  const saveNow = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    void persist(segments);
  }, [persist, segments]);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  return {
    segments,
    saveState,
    updateSegmentText,
    insertSegment,
    deleteSegment,
    replaceAll,
    saveNow,
  };
}
