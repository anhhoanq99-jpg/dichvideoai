"use client";

import { useEffect, useRef, type CSSProperties, type ReactNode } from "react";
import { cn } from "@/lib/utils";

interface BaseProps {
  children: ReactNode;
  className?: string;
}

interface RevealProps extends BaseProps {
  /** giây — trễ thêm trước khi hiện */
  delay?: number;
}

function useVisibleOnScroll<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          el.classList.add("is-visible");
          observer.disconnect();
        }
      },
      { rootMargin: "-60px" },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);
  return ref;
}

/**
 * Hiện dần + trượt lên khi cuộn tới — IntersectionObserver gắn class,
 * hiệu ứng nằm hoàn toàn trong CSS (globals.css). Thay cho framer-motion
 * để landing page không phải tải thư viện animation.
 */
export function Reveal({ children, className, delay = 0 }: RevealProps) {
  const ref = useVisibleOnScroll<HTMLDivElement>();
  return (
    <div
      ref={ref}
      className={cn("reveal", className)}
      style={delay ? ({ "--reveal-delay": `${delay}s` } as CSSProperties) : undefined}
    >
      {children}
    </div>
  );
}

/** Nhóm con xuất hiện so le khi cuộn tới (delay theo thứ tự, tối đa 8 phần tử). */
export function StaggerGroup({ children, className }: BaseProps) {
  const ref = useVisibleOnScroll<HTMLDivElement>();
  return (
    <div ref={ref} className={cn("stagger-group", className)}>
      {children}
    </div>
  );
}

/** Phần tử con trong StaggerGroup; lift=true → nâng nhẹ khi rê chuột. */
export function StaggerItem({
  children,
  className,
  lift = false,
}: BaseProps & { lift?: boolean }) {
  return <div className={cn(lift && "lift", className)}>{children}</div>;
}
