import { UnrecoverableError } from "bullmq";
import { and, eq, gte, sql } from "drizzle-orm";
import { createDb, usageEvents } from "@dichvideo/db";
import type { SubtitleSegment } from "@dichvideo/shared";
import { logger } from "../logger";
import { PRICING, type UsageRecord } from "./usage";

/**
 * HẠN MỨC MIỄN PHÍ của Google Cloud Translation: 500.000 ký tự mỗi tháng, reset
 * đầu tháng, không hết hạn.
 *
 * Vượt hạn mức là $20/1 triệu ký tự — ĐẮT HƠN dịch bằng Gemini khoảng 9 lần
 * (máy dịch tính theo ký tự, LLM tính theo token nên rẻ hơn nhiều với văn bản
 * ngắn như phụ đề). Bậc "Dịch nhanh" bán 2 xu/dòng nên vượt hạn mức là LỖ ngay.
 *
 * Vì vậy: chạm trần thì KHÔNG gọi Google nữa mà tự hạ xuống dịch AI — cùng lối
 * với `edgeFallbackVoice()` bên lồng tiếng. Khách vẫn có bản dịch, chỉ là bằng
 * đường khác, và không bao giờ phát sinh hoá đơn.
 *
 * Chừa 5% biên an toàn vì Google đếm cả dấu cách, dấu câu và ký tự Unicode.
 */
const FREE_CHARS_PER_MONTH = 500_000;
const SAFETY_MARGIN = 0.95;

/** Số ký tự đã dịch máy trong tháng này (theo giờ UTC, khớp cách Google tính). */
export async function googleTranslateCharsThisMonth(): Promise<number> {
  const now = new Date();
  const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const db = createDb();
  const [row] = await db
    .select({ total: sql<string>`coalesce(sum(${usageEvents.quantity}), 0)` })
    .from(usageEvents)
    .where(
      and(
        eq(usageEvents.provider, "gcloud-translate"),
        gte(usageEvents.createdAt, monthStart),
      ),
    );
  return Number(row?.total ?? 0);
}

/**
 * Còn đủ hạn mức miễn phí để dịch `chars` ký tự nữa không.
 * Gọi TRƯỚC khi bắt đầu job — hết hạn mức thì rẽ sang dịch AI ngay từ đầu, chứ
 * không dịch dở nửa chừng rồi mới dừng.
 */
export async function hasFreeTranslateQuota(chars: number): Promise<boolean> {
  const used = await googleTranslateCharsThisMonth();
  const ok = used + chars <= FREE_CHARS_PER_MONTH * SAFETY_MARGIN;
  if (!ok) {
    logger.warn(
      { used, need: chars, limit: FREE_CHARS_PER_MONTH },
      "hết hạn mức dịch máy miễn phí tháng này — hạ xuống dịch AI để không phát sinh phí",
    );
  }
  return ok;
}

/**
 * Máy dịch Google Cloud Translation (v2) — bậc "Dịch nhanh", rẻ nhất.
 *
 * KHÁC HẲN dịch AI: đây là máy dịch thuần, dịch từng dòng độc lập. Không có tóm
 * tắt ngữ cảnh, không phong cách, không chỉnh văn nói, không thống nhất xưng hô
 * giữa các nhân vật. Đổi lại: giữ nguyên mọi tên riêng (không bao giờ lược bỏ
 * nội dung), chạy nhanh, và chi phí gần như bằng 0.
 *
 * Dùng chung key với Google TTS nếu không khai riêng — cùng là API key Google
 * Cloud, chỉ cần bật thêm Cloud Translation API trong cùng project.
 */
const ENDPOINT = "https://translation.googleapis.com/language/translate/v2";

/** Google giới hạn 128 đoạn mỗi request; để 100 cho thoáng. */
const BATCH_SIZE = 100;

function apiKey(): string {
  const key =
    process.env.GOOGLE_TRANSLATE_API_KEY ?? process.env.GOOGLE_TTS_API_KEY ?? "";
  if (!key) {
    throw new UnrecoverableError(
      "Dịch nhanh cần GOOGLE_TRANSLATE_API_KEY (hoặc dùng chung GOOGLE_TTS_API_KEY) — " +
        "bật Cloud Translation API trong Google Cloud Console rồi thêm vào .env.",
    );
  }
  return key;
}

/**
 * Dịch một loạt câu phụ đề. Trả về mảng CÙNG THỨ TỰ và CÙNG SỐ LƯỢNG với đầu
 * vào — Google giữ nguyên thứ tự `q`, nhưng vẫn kiểm lại vì lệch một dòng là
 * lệch toàn bộ phụ đề từ đó về sau.
 */
export async function googleTranslateSegments(input: {
  segments: SubtitleSegment[];
  targetLang: string;
  /** mã ngôn ngữ nguồn; bỏ trống để Google tự nhận diện */
  sourceLang?: string | null;
  onProgress?: (pct: number) => void;
}): Promise<{ segments: SubtitleSegment[]; usage: UsageRecord[] }> {
  const key = apiKey();
  const out: SubtitleSegment[] = [];
  let charsSent = 0;

  for (let i = 0; i < input.segments.length; i += BATCH_SIZE) {
    const batch = input.segments.slice(i, i + BATCH_SIZE);
    const texts = batch.map((s) => s.text);
    charsSent += texts.reduce((sum, t) => sum + t.length, 0);

    const res = await fetch(`${ENDPOINT}?key=${key}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        q: texts,
        target: input.targetLang,
        ...(input.sourceLang ? { source: input.sourceLang } : {}),
        // phụ đề là văn bản thuần; để "html" Google sẽ escape dấu <, & thành thực thể
        format: "text",
      }),
    });

    if (!res.ok) {
      const detail = (await res.text()).slice(0, 300);
      // 403 = key sai hoặc chưa bật Cloud Translation API → thử lại cũng vô ích
      if (res.status === 403 || res.status === 400) {
        throw new UnrecoverableError(`Google Translate từ chối: ${detail}`);
      }
      throw new Error(`Google Translate ${res.status}: ${detail}`);
    }

    const data = (await res.json()) as {
      data?: { translations?: { translatedText?: string }[] };
    };
    const got = data.data?.translations ?? [];
    if (got.length !== batch.length) {
      throw new Error(
        `Google Translate trả ${got.length} dòng cho ${batch.length} dòng gửi đi — lệch dòng, dừng để không hỏng cả phụ đề`,
      );
    }

    for (const [k, seg] of batch.entries()) {
      const text = got[k]?.translatedText?.trim();
      // dòng nào Google trả rỗng thì giữ nguyên bản gốc, còn hơn mất câu
      out.push({ ...seg, text: text || seg.text });
    }
    input.onProgress?.(Math.round(((i + batch.length) / input.segments.length) * 100));
  }

  logger.info(
    { lines: out.length, chars: charsSent },
    "dịch nhanh bằng Google Translate xong",
  );

  return {
    segments: out,
    usage: [
      {
        provider: "gcloud-translate",
        metric: "chars",
        quantity: charsSent,
        // ghi theo giá niêm yết dù đang trong hạn mức free — đây là chi phí biên,
        // thứ cần nhìn khi định giá; hạn mức free là thứ dùng hết rồi thôi
        costUsdMicros: charsSent * PRICING.gcloudTranslatePerChar,
      },
    ],
  };
}
