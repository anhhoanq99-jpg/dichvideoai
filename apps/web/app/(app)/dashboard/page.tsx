import { redirect } from "next/navigation";

/**
 * Trang dashboard cũ đã bỏ (chỉ hiện lời chào + số dư — thừa).
 * Giữ route để link/bookmark cũ không gãy: đưa thẳng vào trang làm việc chính.
 */
export default function DashboardPage() {
  redirect("/videos/upload");
}
