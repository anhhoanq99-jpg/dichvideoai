"use client";

import { useEffect, useRef } from "react";

interface PollOptions {
  intervalMs: number;
  /** false → dừng hẳn (vd chưa hiện mã QR thì chưa cần hỏi số dư) */
  enabled?: boolean;
}

/**
 * Gọi `fn` lặp lại theo chu kỳ, nhưng TẠM DỪNG khi tab bị ẩn và chạy lại ngay
 * khi người dùng quay lại tab.
 *
 * Lý do: người dùng chủ yếu vào bằng điện thoại. Tab ẩn hoặc khóa màn hình mà
 * vẫn poll thì tốn pin + 4G của họ, và mỗi lần gọi là một lượt serverless +
 * một truy vấn DB của mình — trả tiền cho thứ không ai nhìn.
 */
export function usePoll(
  fn: () => void | Promise<void>,
  { intervalMs, enabled = true }: PollOptions,
) {
  // giữ hàm mới nhất mà không phải khởi động lại vòng lặp mỗi lần render
  // (gán ref trong effect — lint của repo cấm đụng ref lúc render)
  const fnRef = useRef(fn);
  useEffect(() => {
    fnRef.current = fn;
  });

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout>;

    const tick = async () => {
      if (cancelled) return;
      // tab đang ẩn → bỏ qua lượt này, vẫn hẹn lượt sau để không phụ thuộc
      // hoàn toàn vào sự kiện visibilitychange
      if (document.visibilityState === "visible") {
        try {
          await fnRef.current();
        } catch {
          // lỗi mạng → thử lại ở lượt sau
        }
      }
      if (!cancelled) timer = setTimeout(tick, intervalMs);
    };

    timer = setTimeout(tick, intervalMs);

    // quay lại tab → hỏi ngay, không bắt người dùng chờ hết một chu kỳ
    const onVisibility = () => {
      if (cancelled || document.visibilityState !== "visible") return;
      clearTimeout(timer);
      void tick();
    };
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      cancelled = true;
      clearTimeout(timer);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [enabled, intervalMs]);
}
