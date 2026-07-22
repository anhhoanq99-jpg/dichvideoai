import { count, eq } from "drizzle-orm";
import { videos } from "@dichvideo/db";
import { db } from "@/lib/db";
import { getSession } from "@/lib/session";
import { getLang } from "@/lib/i18n";
import { UploadPageClient } from "@/components/upload/upload-page-client";

export default async function UploadPage({
  searchParams,
}: {
  searchParams: Promise<{ url?: string }>;
}) {
  const [lang, params, session] = await Promise.all([
    getLang(),
    searchParams,
    getSession(),
  ]);

  /**
   * Chưa có video nào = người dùng lần đầu.
   * Trước đây đăng ký xong là bị thả thẳng vào đây, không một lời chào, còn
   * 10.000 xu vừa được tặng thì chỉ hiện thành con số nhỏ trên thanh đầu trang
   * — người mới không biết mình đang có gì và làm được bao nhiêu.
   */
  let firstTime = false;
  let balance = 0;
  if (session) {
    const [row] = await db
      .select({ n: count() })
      .from(videos)
      .where(eq(videos.userId, session.user.id));
    firstTime = (row?.n ?? 0) === 0;
    balance = session.user.creditBalance ?? 0;
  }

  return (
    <UploadPageClient
      lang={lang}
      initialUrl={params.url ?? ""}
      firstTime={firstTime}
      balance={balance}
    />
  );
}
