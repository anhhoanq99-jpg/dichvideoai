import Link from "next/link";
import { FileQuestion } from "lucide-react";

/** 404 chung — trước đây rơi về màn mặc định của Next.js, không có lối quay lại. */
export default function NotFound() {
  return (
    <main className="flex min-h-[60vh] flex-col items-center justify-center px-4 text-center">
      <FileQuestion className="h-12 w-12 text-neutral-400" />
      <h1 className="mt-4 text-xl font-bold">Không tìm thấy trang</h1>
      <p className="mt-2 max-w-md text-sm text-neutral-600 dark:text-neutral-400">
        Trang bạn tìm không tồn tại hoặc đã được chuyển đi.
      </p>
      <Link
        href="/"
        className="mt-6 rounded-full bg-primary-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-primary-700"
      >
        Về trang chủ
      </Link>
    </main>
  );
}
