import { redirect } from "next/navigation";
import { getLang } from "@/lib/i18n";
import { getSession } from "@/lib/session";
import { LoginCard } from "@/components/auth/login-card";

export const dynamic = "force-dynamic";

export default async function LoginPage() {
  // đã đăng nhập (cookie 30 ngày còn sống) → vào thẳng app, không bắt nhập lại
  const session = await getSession();
  if (session) redirect("/videos/upload");

  const lang = await getLang();
  return <LoginCard lang={lang} />;
}
