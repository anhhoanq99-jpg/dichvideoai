import { getLang } from "@/lib/i18n";
import { LoginCard } from "@/components/auth/login-card";

export default async function LoginPage() {
  const lang = await getLang();
  return <LoginCard lang={lang} />;
}
