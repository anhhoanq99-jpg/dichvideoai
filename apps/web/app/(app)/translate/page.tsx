import { getLang } from "@/lib/i18n";
import { TranslateSrtPageClient } from "./translate-client";

export default async function TranslateSrtPage() {
  const lang = await getLang();
  return <TranslateSrtPageClient lang={lang} />;
}
