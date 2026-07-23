import { sql } from "drizzle-orm";
import { AlertTriangle, Check, ExternalLink } from "lucide-react";
import { usageEvents } from "@dichvideo/db";
import { db } from "@/lib/db";
import type { Lang } from "@/lib/i18n";
import { cn } from "@/lib/utils";

const T = {
  vi: {
    subtitle:
      "Đo từ nhật ký sử dụng thật của worker. Cột “Hôm nay” là cột cần nhìn — hạn mức gói miễn phí tính theo NGÀY, hết là job dừng giữa chừng.",
    provider: "Nguồn",
    today: "Hôm nay",
    d7: "7 ngày",
    d30: "30 ngày",
    cost30: "Chi phí 30 ngày",
    limit: "Trần gói free",
    empty: "Chưa có dữ liệu sử dụng nào.",
    calls: "lượt",
    ok: "Còn thoải mái",
    warn: "Sắp chạm trần",
    over: "ĐÃ CHẠM TRẦN",
    notMeasured: "Không đo được từ đây",
    redisNote:
      "Upstash Redis không ghi vào bảng này — xem trực tiếp ở console.upstash.com. Gói free 500.000 lệnh/tháng; worker poll liên tục nên đây là thứ hay cạn trước nhất.",
    costNote:
      "Chi phí là ƯỚC LƯỢNG theo đơn giá ghi trong worker, không phải hóa đơn thật. Nguồn miễn phí (Groq, giọng Cơ bản) ghi 0.",
  },
  en: {
    subtitle:
      "Measured from the worker's real usage log. Watch the “Today” column — free-tier limits are per DAY, and hitting one stops jobs mid-run.",
    provider: "Provider",
    today: "Today",
    d7: "7 days",
    d30: "30 days",
    cost30: "Cost, 30 days",
    limit: "Free-tier cap",
    empty: "No usage recorded yet.",
    calls: "calls",
    ok: "Plenty left",
    warn: "Near the cap",
    over: "CAP REACHED",
    notMeasured: "Not measurable here",
    redisNote:
      "Upstash Redis does not write to this table — check console.upstash.com. Free tier is 500,000 commands/month; the worker polls constantly, so this is usually the first thing to run out.",
    costNote:
      "Cost is an ESTIMATE from the unit prices in the worker, not a real invoice. Free providers (Groq, Basic voices) record 0.",
  },
} as const;

/**
 * Trần hạn mức MIỄN PHÍ theo NGÀY, tính theo số LƯỢT GỌI.
 * Con số 20 lấy từ chính thông báo lỗi thật của Google:
 *   "generate_content_free_tier_requests, limit: 20"
 * Một video 300 dòng phụ đề ăn ~11 lượt → chỉ khoảng 1-2 video/ngày/key.
 *
 * Lưu ý khi đọc cột này: hạn mức tính RIÊNG cho từng model, và code đã có nấc
 * dự phòng sang model nhẹ hơn khi model chính cạn. Nên chạm trần ở đây KHÔNG
 * có nghĩa là dừng hẳn — nhưng là dấu hiệu rõ ràng phải bật billing.
 */
const DAILY_CALL_LIMIT: Record<string, { perKey: number; label: string }> = {
  gemini: { perKey: 20, label: "20 lượt/ngày/key/model" },
};

/** Nguồn không tốn tiền — hiện cho đủ nhưng không cần cảnh báo. */
const FREE_PROVIDERS = new Set(["groq", "azure-tts"]);

const PROVIDER_LABEL: Record<string, string> = {
  gemini: "Gemini (dịch + OCR + giọng cao cấp)",
  groq: "Groq (nghe–chép + dịch dự phòng)",
  gcloud: "SubdubAI / Google TTS",
  eleven: "ElevenLabs",
  // 4 nguồn dưới đây ĐÃ GỠ khỏi sản phẩm, nhưng dữ liệu CŨ trong usage_events
  // vẫn còn — giữ nhãn để bảng không hiện ra chuỗi thô khó hiểu.
  viettel: "Viettel AI (đã gỡ)",
  fpt: "FPT.AI (đã gỡ)",
  vieneu: "VieNeu (đã gỡ)",
  kokoro: "Kokoro (đã gỡ)",
  "azure-tts": "Giọng cơ bản (Edge)",
  r2: "Lưu trữ R2",
};

interface Row {
  provider: string;
  callsToday: number;
  calls7d: number;
  calls30d: number;
  costMicros30d: number;
}

/** Số key Gemini đang cắm — trần ngày nhân theo số key. */
function geminiKeyCount(): number {
  const many = (process.env.GEMINI_API_KEYS ?? "").split(",");
  const one = process.env.GEMINI_API_KEY ?? "";
  return new Set([...many, one].map((k) => k.trim()).filter(Boolean)).size || 1;
}

function fmt(n: number) {
  return n.toLocaleString("vi-VN");
}

/** micros USD → chuỗi đô la gọn. */
function usd(micros: number) {
  const d = micros / 1e6;
  if (d === 0) return "$0";
  return d < 0.01 ? "<$0,01" : `$${d.toFixed(2)}`;
}

export async function AdminUsagePanel({ lang = "vi" }: { lang?: Lang }) {
  const t = T[lang];

  /**
   * Đếm theo LƯỢT GỌI chứ không theo token: hạn mức bóp chết job là hạn mức
   * số lượt/ngày. Mỗi lượt gọi ghi một dòng `tokens_in` (hoặc `chars`/`audio_sec`
   * với nguồn khác), nên đếm dòng "đầu vào" là ra đúng số lượt.
   */
  const rows = (await db
    .select({
      provider: usageEvents.provider,
      callsToday: sql<string>`count(*) filter (where ${usageEvents.createdAt} >= date_trunc('day', now()) and ${usageEvents.metric} <> 'tokens_out')`,
      calls7d: sql<string>`count(*) filter (where ${usageEvents.createdAt} >= now() - interval '7 days' and ${usageEvents.metric} <> 'tokens_out')`,
      calls30d: sql<string>`count(*) filter (where ${usageEvents.createdAt} >= now() - interval '30 days' and ${usageEvents.metric} <> 'tokens_out')`,
      costMicros30d: sql<string>`coalesce(sum(${usageEvents.costUsdMicros}) filter (where ${usageEvents.createdAt} >= now() - interval '30 days'), 0)`,
    })
    .from(usageEvents)
    .groupBy(usageEvents.provider)) as unknown as Record<string, string>[];

  const data: Row[] = rows
    .map((r) => ({
      provider: r.provider,
      callsToday: Number(r.callsToday),
      calls7d: Number(r.calls7d),
      calls30d: Number(r.calls30d),
      costMicros30d: Number(r.costMicros30d),
    }))
    .sort((a, b) => b.calls30d - a.calls30d);

  const keys = geminiKeyCount();

  return (
    <div className="space-y-3">
      <p className="text-xs text-neutral-500 dark:text-neutral-400">{t.subtitle}</p>

      {data.length === 0 ? (
        <p className="rounded-xl border border-neutral-200 bg-white p-4 text-sm text-neutral-500 dark:border-neutral-800 dark:bg-neutral-900">
          {t.empty}
        </p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900">
          <table className="w-full min-w-[640px] text-sm">
            <thead className="border-b border-neutral-200 text-left text-xs text-neutral-500 dark:border-neutral-800 dark:text-neutral-400">
              <tr>
                <th className="px-4 py-2.5 font-medium">{t.provider}</th>
                <th className="px-4 py-2.5 text-right font-medium">{t.today}</th>
                <th className="px-4 py-2.5 text-right font-medium">{t.d7}</th>
                <th className="px-4 py-2.5 text-right font-medium">{t.d30}</th>
                <th className="px-4 py-2.5 text-right font-medium">{t.cost30}</th>
                <th className="px-4 py-2.5 font-medium">{t.limit}</th>
              </tr>
            </thead>
            <tbody>
              {data.map((r) => {
                const cap = DAILY_CALL_LIMIT[r.provider];
                const total = cap ? cap.perKey * keys : 0;
                const pct = total > 0 ? r.callsToday / total : 0;
                const level = !cap ? null : pct >= 1 ? "over" : pct >= 0.7 ? "warn" : "ok";
                return (
                  <tr
                    key={r.provider}
                    className="border-b border-neutral-100 last:border-0 dark:border-neutral-800/60"
                  >
                    <td className="px-4 py-2.5">
                      {PROVIDER_LABEL[r.provider] ?? r.provider}
                    </td>
                    <td
                      className={cn(
                        "px-4 py-2.5 text-right tabular-nums",
                        level === "over" && "font-bold text-red-600 dark:text-red-400",
                        level === "warn" && "font-semibold text-amber-600 dark:text-amber-400",
                      )}
                    >
                      {fmt(r.callsToday)}
                      {cap && <span className="text-neutral-400"> / {fmt(total)}</span>}
                    </td>
                    <td className="px-4 py-2.5 text-right tabular-nums text-neutral-500 dark:text-neutral-400">
                      {fmt(r.calls7d)}
                    </td>
                    <td className="px-4 py-2.5 text-right tabular-nums text-neutral-500 dark:text-neutral-400">
                      {fmt(r.calls30d)}
                    </td>
                    <td className="px-4 py-2.5 text-right tabular-nums text-neutral-500 dark:text-neutral-400">
                      {FREE_PROVIDERS.has(r.provider) ? "—" : usd(r.costMicros30d)}
                    </td>
                    <td className="px-4 py-2.5 text-xs">
                      {cap ? (
                        <span
                          className={cn(
                            "inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 font-medium",
                            level === "over" &&
                              "bg-red-100 text-red-700 dark:bg-red-950/50 dark:text-red-300",
                            level === "warn" &&
                              "bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300",
                            level === "ok" &&
                              "bg-success-100 text-success-800 dark:bg-success-950/50 dark:text-success-300",
                          )}
                        >
                          {level === "ok" ? (
                            <Check className="h-3 w-3" />
                          ) : (
                            <AlertTriangle className="h-3 w-3" />
                          )}
                          {level === "over" ? t.over : level === "warn" ? t.warn : t.ok}
                          <span className="font-normal opacity-70">({cap.label})</span>
                        </span>
                      ) : (
                        <span className="text-neutral-400">—</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Redis không đi qua usage_events nên phải nói rõ, đừng để tưởng là đã theo dõi đủ */}
      <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-200">
        <p className="flex items-start gap-2">
          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          <span>
            {t.redisNote}{" "}
            <a
              href="https://console.upstash.com"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 font-semibold underline"
            >
              console.upstash.com <ExternalLink className="h-3 w-3" />
            </a>
          </span>
        </p>
      </div>

      <p className="text-xs text-neutral-400">{t.costNote}</p>
    </div>
  );
}
