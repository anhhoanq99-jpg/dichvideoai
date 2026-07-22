import { cn } from "@/lib/utils";

/**
 * Nút dùng chung. Trước đây chuỗi class nút (bg-primary-600 …) lặp ~37 chỗ với
 * nhiều biến thể; đây là primitive chuẩn cho code mới, các nút cũ chuyển dần.
 * Ghép class riêng qua className (cn dùng tailwind-merge nên ghi đè an toàn).
 */
type Variant = "primary" | "secondary" | "ghost" | "danger";
type Size = "sm" | "md" | "lg";

const VARIANT: Record<Variant, string> = {
  primary: "bg-primary-700 text-white shadow-sm hover:bg-primary-800",
  secondary:
    "border border-neutral-200 bg-white hover:border-neutral-300 dark:border-neutral-700 dark:bg-neutral-900 dark:hover:border-neutral-600",
  ghost:
    "text-neutral-600 hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-neutral-800",
  danger: "text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40",
};

const SIZE: Record<Size, string> = {
  sm: "px-3 py-1.5 text-sm",
  md: "px-5 py-2 text-sm",
  lg: "px-6 py-3 text-sm",
};

export function Button({
  variant = "primary",
  size = "md",
  pill = false,
  className,
  type = "button",
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  size?: Size;
  /** true → bo tròn viên thuốc (rounded-full); mặc định rounded-lg */
  pill?: boolean;
}) {
  return (
    <button
      type={type}
      className={cn(
        "inline-flex items-center justify-center gap-2 font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50",
        pill ? "rounded-full" : "rounded-lg",
        VARIANT[variant],
        SIZE[size],
        className,
      )}
      {...props}
    />
  );
}
