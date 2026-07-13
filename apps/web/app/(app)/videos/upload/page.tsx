import { getLang } from "@/lib/i18n";
import { UploadPageClient } from "@/components/upload/upload-page-client";

export default async function UploadPage({
  searchParams,
}: {
  searchParams: Promise<{ url?: string }>;
}) {
  const [lang, params] = await Promise.all([getLang(), searchParams]);
  return <UploadPageClient lang={lang} initialUrl={params.url ?? ""} />;
}
