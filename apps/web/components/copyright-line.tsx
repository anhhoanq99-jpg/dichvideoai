import { SITE_NAME } from "@/lib/site";
import type { Lang } from "@/lib/i18n";
import { cn } from "@/lib/utils";

/**
 * Dòng bản quyền cuối trang — dùng CHUNG cho trang giới thiệu và trang trong app,
 * để hai nơi không lệch tên thương hiệu hay năm.
 *
 * Năm lấy động thay vì gõ cứng: trang tĩnh thì chốt lúc build, mà repo này deploy
 * liên tục nên sang năm mới không phải nhớ đi sửa tay.
 */
const T = {
  vi: "Đã đăng ký bản quyền sở hữu.",
  en: "All rights reserved.",
} as const;

export function CopyrightLine({
  lang = "vi",
  className,
}: {
  lang?: Lang;
  className?: string;
}) {
  return (
    <p className={cn("text-xs text-neutral-500", className)}>
      © {new Date().getFullYear()} {SITE_NAME}. {T[lang]}
    </p>
  );
}
