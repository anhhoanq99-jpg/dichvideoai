"use client";

import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

/** /videos/<id>/editor — màn studio chỉnh sửa */
const EDITOR_ROUTE = /^\/videos\/[^/]+\/editor\/?$/;

/**
 * Bọc thanh header của khu vực app. Ở màn studio trên ĐIỆN THOẠI thì ẩn hẳn
 * header để nhường chiều cao cho khung xem trước + bảng phụ đề (màn hình dọc
 * rất chật). Vẫn thoát ra được bằng link "Quay lại" ngay trong trang studio.
 * Từ lg trở lên (máy tính) header giữ nguyên vì không thiếu chỗ.
 */
export function AppHeaderShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const hideOnMobile = EDITOR_ROUTE.test(pathname);

  return (
    <header
      className={cn(
        // overflow-x-clip (KHÔNG phải overflow-hidden): vẫn chặn tràn ngang trên
        // điện thoại, nhưng overflow-y giữ nguyên visible nên menu tài khoản thả
        // xuống không bị cắt cụt. overflow-hidden cắt cả 2 chiều — menu nằm ở
        // top-11 trong header cao 56px sẽ bị xén gần hết, bấm như không có gì.
        "h-14 items-center gap-2 overflow-x-clip border-b border-neutral-200 bg-white px-3 sm:gap-2.5 sm:px-4 dark:border-neutral-800 dark:bg-neutral-950",
        hideOnMobile ? "hidden lg:flex" : "flex",
      )}
    >
      {children}
    </header>
  );
}
