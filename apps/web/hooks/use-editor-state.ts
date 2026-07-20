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

  /**
   * Thêm 1 dòng phụ đề mới vào khoảng thời gian chỉ định
   * (giữ `i` duy nhất, danh sách luôn sắp theo startMs).
   */
  const insertSegment = useCallback(
    (startMs: number, endMs: number, text = "") => {
      setSegments((prev) => {
        const maxI = prev.reduce((max, s) => Math.max(max, s.i), -1);
        const next = [...prev, { i: maxI + 1, startMs, endMs, text }].sort(
          (a, b) => a.startMs - b.startMs,
        );
        setSaveState("dirty");
        if (timerRef.current) clearTimeout(timerRef.current);
        timerRef.current = setTimeout(() => void persist(next), 1500);
        return next;
      });
    },
    [persist],
  );

  /**
   * Sửa khoảng thời gian của MỘT dòng phụ đề.
   * Bắt buộc sắp lại theo startMs: preview và studio-shell dùng tìm kiếm nhị phân
   * để biết câu nào đang chạy — danh sách lộn xộn sẽ làm phụ đề hiện sai lúc.
   */
  const updateSegmentTime = useCallback(
    (i: number, startMs: number, endMs: number) => {
      setSegments((prev) => {
        const next = prev
          .map((s) => (s.i === i ? { ...s, startMs, endMs } : s))
          .sort((a, b) => a.startMs - b.startMs);
        setSaveState("dirty");
        if (timerRef.current) clearTimeout(timerRef.current);
        timerRef.current = setTimeout(() => void persist(next), 1500);
        return next;
      });
    },
    [persist],
  );

  /**
   * Đặt/bỏ vị trí RIÊNG và cỡ chữ RIÊNG cho một dòng (ghi đè thiết lập chung).
   * Truyền null để trả dòng đó về dùng vị trí/cỡ chung.
   */
  const setSegmentLayout = useCallback(
    (
      i: number,
      layout: { pos?: SubtitleSegment["pos"] | null; size?: number | null },
    ) => {
      setSegments((prev) => {
        const next = prev.map((s) => {
          if (s.i !== i) return s;
          const out = { ...s };
          if (layout.pos !== undefined) {
            if (layout.pos === null) delete out.pos;
            else out.pos = layout.pos;
          }
          if (layout.size !== undefined) {
            if (layout.size === null) delete out.size;
            else out.size = layout.size;
          }
          return out;
        });
        setSaveState("dirty");
        if (timerRef.current) clearTimeout(timerRef.current);
        timerRef.current = setTimeout(() => void persist(next), 1500);
        return next;
      });
    },
    [persist],
  );

  /**
   * Gắn/gỡ vùng che chữ gốc cho MỘT dòng phụ đề (`box`, toạ độ 0..1 hệ video nguồn).
   * Vùng này chỉ che trong đúng khoảng thời gian dòng đó chạy — dùng cho video có
   * chữ nước ngoài xuất hiện rải rác ở nhiều chỗ/nhiều lúc khác nhau.
   */
  const setSegmentBox = useCallback(
    (i: number, box: SubtitleSegment["box"] | null) => {
      setSegments((prev) => {
        const next = prev.map((s) => {
          if (s.i !== i) return s;
          if (!box) {
            // bỏ hẳn khoá `box` thay vì để undefined — JSON gửi lên API sạch hơn
            const rest = { ...s };
            delete rest.box;
            return rest;
          }
          return { ...s, box };
        });
        setSaveState("dirty");
        if (timerRef.current) clearTimeout(timerRef.current);
        timerRef.current = setTimeout(() => void persist(next), 1500);
        return next;
      });
    },
    [persist],
  );

  /** Gán nhân vật đọc dòng này (0/1/2) khi lồng tiếng nhiều giọng. */
  const setSegmentSpeaker = useCallback(
    (i: number, speaker: number) => {
      setSegments((prev) => {
        const next = prev.map((s) => {
          if (s.i !== i) return s;
          // 0 là mặc định → bỏ hẳn khoá cho JSON gọn
          if (speaker === 0) {
            const rest = { ...s };
            delete rest.speaker;
            return rest;
          }
          return { ...s, speaker };
        });
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
    updateSegmentTime,
    insertSegment,
    setSegmentLayout,
    setSegmentSpeaker,
    setSegmentBox,
    deleteSegment,
    replaceAll,
    saveNow,
  };
}
