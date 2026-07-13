"use client";

import { useRouter } from "next/navigation";
import type { Lang } from "@/lib/i18n";
import { cn } from "@/lib/utils";

function setLangCookie(next: Lang) {
  document.cookie = `lang=${next};path=/;max-age=31536000;samesite=lax`;
}

/**
 * Viên thuốc VI | EN — đổi cookie rồi render lại trang theo ngôn ngữ mới.
 * Với trang tĩnh (landing), truyền `routes` để điều hướng sang bản ngôn ngữ kia
 * (vd { vi: "/", en: "/en" }) thay vì refresh — cookie vẫn được set cho app.
 */
export function LangSwitcher({
  lang,
  dark = false,
  routes,
}: {
  lang: Lang;
  dark?: boolean;
  routes?: Record<Lang, string>;
}) {
  const router = useRouter();

  function pick(next: Lang) {
    if (next === lang) return;
    setLangCookie(next);
    if (routes) router.push(routes[next]);
    else router.refresh();
  }

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border p-0.5 text-[11px] font-bold",
        dark ? "border-white/15" : "border-neutral-300 dark:border-neutral-700",
      )}
    >
      {(["vi", "en"] as const).map((l) => (
        <button
          key={l}
          type="button"
          onClick={() => pick(l)}
          aria-label={l === "vi" ? "Tiếng Việt" : "English"}
          className={cn(
            "rounded-full px-2 py-0.5 uppercase",
            lang === l
              ? "bg-primary-500 text-white"
              : dark
                ? "text-neutral-400 hover:text-white"
                : "text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200",
          )}
        >
          {l}
        </button>
      ))}
    </span>
  );
}
