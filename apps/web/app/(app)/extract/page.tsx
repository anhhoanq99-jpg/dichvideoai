import { getLang } from "@/lib/i18n";
import { ExtractPageClient } from "./extract-client";

export default async function ExtractPage() {
  const lang = await getLang();
  return <ExtractPageClient lang={lang} />;
}
