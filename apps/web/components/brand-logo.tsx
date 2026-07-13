import Link from "next/link";
import { cn } from "@/lib/utils";

/**
 * Logo thương hiệu: ô gradient cam→tím chứa nút play (video) + sóng âm
 * (lồng tiếng) + hai vạch phụ đề (sub). Vẽ SVG nên sắc nét ở mọi cỡ.
 */
export function BrandMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 40 40" className={className} aria-hidden focusable="false">
      <defs>
        <linearGradient id="brand-g" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="var(--color-primary-500)" />
          <stop offset="1" stopColor="var(--color-accent-600)" />
        </linearGradient>
      </defs>
      <rect x="1" y="1" width="38" height="38" rx="11" fill="url(#brand-g)" />
      {/* nút play — video */}
      <path d="M13.5 10.5v13l11-6.5z" fill="#fff" />
      {/* sóng âm — lồng tiếng */}
      <path
        d="M28 13a7.5 7.5 0 0 1 0 8"
        stroke="#fff"
        strokeWidth="2.2"
        strokeLinecap="round"
        fill="none"
        opacity="0.9"
      />
      <path
        d="M31.5 10.5a12 12 0 0 1 0 13"
        stroke="#fff"
        strokeWidth="2.2"
        strokeLinecap="round"
        fill="none"
        opacity="0.5"
      />
      {/* vạch phụ đề — sub */}
      <rect x="9" y="28.5" width="15" height="3.4" rx="1.7" fill="#fff" opacity="0.95" />
      <rect x="26" y="28.5" width="5.5" height="3.4" rx="1.7" fill="#fff" opacity="0.5" />
    </svg>
  );
}

/** Logo + tên thương hiệu, bấm vào về trang chủ. */
export function BrandLogo({
  className,
  textClassName,
}: {
  className?: string;
  textClassName?: string;
}) {
  return (
    <Link
      href="/"
      className={cn(
        "flex items-center gap-2 font-semibold tracking-tight transition-opacity hover:opacity-80",
        className,
      )}
    >
      <BrandMark className="h-8 w-8" />
      <span className={textClassName}>
        Dịch Video <span className="text-primary-500">AI</span>
      </span>
    </Link>
  );
}
