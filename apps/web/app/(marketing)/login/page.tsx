import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { schema } from "@dichvideo/db";
import { db } from "@/lib/db";
import { getLang } from "@/lib/i18n";
import { getSession } from "@/lib/session";
import { LoginCard } from "@/components/auth/login-card";

export const dynamic = "force-dynamic";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ banned?: string }>;
}) {
  const session = await getSession();
  const sp = await searchParams;
  let banned = sp.banned === "1";

  if (session) {
    // Tài khoản bị khoá → hiện thông báo, KHÔNG đẩy vào app (đẩy vào thì layout
    // lại đá về đây → vòng lặp redirect vô hạn).
    const [account] = await db
      .select({ bannedAt: schema.user.bannedAt })
      .from(schema.user)
      .where(eq(schema.user.id, session.user.id));
    if (account?.bannedAt) banned = true;
    else redirect("/videos/upload");
  }

  const lang = await getLang();
  return <LoginCard lang={lang} banned={banned} />;
}
