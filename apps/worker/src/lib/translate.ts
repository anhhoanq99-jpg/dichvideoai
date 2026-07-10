import { GoogleGenAI } from "@google/genai";
import { targetLangName } from "@dichvideo/shared";
import type { SubtitleSegment, TranslationStyleId } from "@dichvideo/shared";
import { logger } from "../logger";
import { isDailyQuotaError, withGeminiRetry } from "./gemini-limits";
import { PRICING, type UsageRecord } from "./usage";

export type TranslationStyle = TranslationStyleId;

const STYLE_INSTRUCTIONS: Record<TranslationStyle, string> = {
  natural:
    "Dịch như người Việt NÓI CHUYỆN thật ngoài đời, không phải văn viết. Yêu cầu:\n" +
    "- Dịch theo Ý, tuyệt đối không dịch từng từ theo cấu trúc câu gốc (tránh kiểu 'Google dịch' lủng củng).\n" +
    "- Dùng từ ngữ đời thường, trợ từ tự nhiên (à, nhé, đấy, thôi, mà, cơ, hả...) đúng chỗ.\n" +
    "- Đảo lại trật tự câu cho đúng cách người Việt diễn đạt; câu ngắn gọn như lời thoại phim lồng tiếng.\n" +
    "- Giữ đúng cảm xúc: giận thì gắt, đùa thì tếu, buồn thì trầm — chọn từ theo sắc thái nhân vật.\n" +
    "- Thành ngữ/tục ngữ gốc → thay bằng thành ngữ Việt tương đương, không dịch nghĩa đen.\n" +
    "Ví dụ mức chất lượng yêu cầu (tự đặt, minh họa cách diễn đạt):\n" +
    '- DỞ: "Tôi không thể tin điều này đang xảy ra" → HAY: "Không thể tin nổi luôn á!"\n' +
    '- DỞ: "Bạn có muốn đi cùng với tôi không?" → HAY: "Đi với tớ không?"\n' +
    '- DỞ: "Điều đó không phải là vấn đề của tôi" → HAY: "Việc đó đâu liên quan gì đến tôi."',
  "gioi-tre":
    "Dịch theo phong cách GIỚI TRẺ Việt Nam trên mạng xã hội: hài hước, tếu táo, cà khịa nhẹ nhàng đúng lúc. " +
    "Dùng từ lóng/từ hot phổ biến (xỉu ngang, ảo thật đấy, đỉnh nóc, ét ô ét, u là trời, khum, chằm Zn...) NHƯNG đúng ngữ cảnh và không lạm dụng đến mức khó hiểu hay sai nghĩa. " +
    "Câu ngắn, giọng vui, có thể chêm biểu cảm khi phù hợp. Vẫn giữ đúng ý gốc.",
  "review-phim":
    "Dịch theo giọng THUYẾT MINH REVIEW PHIM: lôi cuốn, li kỳ, giữ chân người xem. " +
    "Kể lại lời thoại mạch lạc, nhấn vào diễn biến và cảm xúc nhân vật, tạo cảm giác tò mò muốn xem tiếp. Bám sát nội dung, không bịa thêm tình tiết.",
  "ngan-gon":
    "Dịch NGẮN GỌN tối đa: giữ trọn ý chính, cắt mọi từ thừa, câu càng ngắn càng tốt để người xem đọc kịp. Ưu tiên từ đơn giản, dễ hiểu.",
  "co-trang":
    "Dịch theo văn phong CỔ TRANG / KIẾM HIỆP: xưng hô ta - ngươi, huynh - đệ, tỷ - muội, tại hạ, các hạ... đúng vai vế nhân vật. " +
    "Dùng từ Hán Việt hợp bối cảnh (công tử, cô nương, sư phụ, giang hồ, võ công...), giọng trang nhã có chất thơ nhưng vẫn dễ hiểu với khán giả Việt.",
  "ngon-tinh":
    "Dịch theo văn phong NGÔN TÌNH: giàu cảm xúc, kịch tính, lãng mạn, sến nhẹ đúng chất phim tình cảm. " +
    "Xưng hô tình cảm hợp quan hệ nhân vật (anh - em, chàng - nàng...), câu thoại da diết ở cảnh xúc động, gắt gỏng có kịch tính ở cảnh mâu thuẫn.",
  "tam-trang":
    "Dịch theo giọng TÂM TRẠNG / TRIẾT LÝ: sâu lắng, đồng cảm, chữa lành. " +
    "Câu chữ nhẹ nhàng, giàu suy ngẫm, chọn từ tinh tế truyền tải cảm xúc; tránh khẩu ngữ suồng sã.",
  "khoa-hoc":
    "Dịch nội dung KHOA HỌC / KỸ THUẬT: thuật ngữ chính xác và nhất quán (giữ nguyên thuật ngữ tiếng Anh thông dụng nếu dịch ra sẽ khó hiểu), " +
    "diễn đạt gần gũi, sinh động, dễ hiểu với người xem phổ thông.",
  "hanh-dong":
    "Dịch theo phong cách HÀNH ĐỘNG / KỊCH TÍNH: câu ngắn, nhanh, mạnh, dồn dập. Lời thoại dứt khoát, khẩu lệnh gọn sắc, giữ nhịp căng thẳng của cảnh phim.",
  formal: "Dịch trang trọng, lịch sự, phù hợp nội dung tài liệu/tin tức.",
  literal: "Dịch sát nghĩa nhất có thể, ưu tiên độ chính xác hơn độ mượt.",
  custom: "", // thay bằng prompt người dùng nhập lúc chạy
};

/** Các style thiên văn nói — chạy thêm pass biên tập cho mượt. */
const POLISH_STYLES: TranslationStyle[] = [
  "natural",
  "gioi-tre",
  "ngon-tinh",
  "co-trang",
];

const CHUNK_SIZE = 60;
const CONTEXT_LINES = 5;
const MAX_RETRIES = 2;

const RESPONSE_SCHEMA = {
  type: "array",
  items: {
    type: "object",
    properties: {
      i: { type: "integer", description: "segment index, unchanged from input" },
      text: { type: "string", description: "Vietnamese text" },
    },
    required: ["i", "text"],
  },
} as const;

export interface TranslateResult {
  segments: SubtitleSegment[];
  usage: UsageRecord[];
}

interface Ctx {
  ai: GoogleGenAI;
  model: string;
  usage: UsageRecord[];
}

function track(ctx: Ctx, res: { usageMetadata?: { promptTokenCount?: number; candidatesTokenCount?: number } }) {
  const inTok = res.usageMetadata?.promptTokenCount ?? 0;
  const outTok = res.usageMetadata?.candidatesTokenCount ?? 0;
  ctx.usage.push(
    {
      provider: "gemini",
      metric: "tokens_in",
      quantity: inTok,
      costUsdMicros: inTok * PRICING.gemini25FlashInPerTok,
    },
    {
      provider: "gemini",
      metric: "tokens_out",
      quantity: outTok,
      costUsdMicros: outTok * PRICING.gemini25FlashOutPerTok,
    },
  );
}

/**
 * Global-context pass: read ALL source lines once, produce a brief the
 * translator uses for consistent pronouns, tone and terminology.
 */
async function buildStoryBrief(ctx: Ctx, segments: SubtitleSegment[]): Promise<string> {
  const fullText = segments.map((s) => s.text).join("\n").slice(0, 100_000);
  try {
    const res = await withGeminiRetry("story-brief", () =>
      ctx.ai.models.generateContent({
        model: ctx.model,
        contents:
          "Đọc toàn bộ lời thoại/phụ đề sau và trả về bản tóm tắt NGẮN phục vụ dịch thuật, gồm:\n" +
          "1. Thể loại + bối cảnh + tông giọng (2-3 câu).\n" +
          "2. Các nhân vật chính và QUAN HỆ giữa họ → đề xuất cách xưng hô tiếng Việt cho từng cặp (anh-em, tao-mày, ta-ngươi, cậu-tớ...).\n" +
          "3. Thuật ngữ/tên riêng lặp lại cần dịch nhất quán.\n" +
          "Chỉ trả về nội dung tóm tắt, tối đa 300 từ.\n\n" +
          fullText,
        config: { temperature: 0.2 },
      }),
    );
    track(ctx, res);
    return res.text?.trim() ?? "";
  } catch (err) {
    // hết hạn mức ngày thì các bước sau cũng sẽ chết — dừng luôn cho job fail sạch
    if (err instanceof Error && err.name === "UnrecoverableError") throw err;
    if (isDailyQuotaError(err)) throw err;
    logger.warn({ err: String(err) }, "story brief failed — translating without it");
    return "";
  }
}

async function structuredCall(
  ctx: Ctx,
  system: string,
  prompt: string,
  expected: { i: number }[],
): Promise<Map<number, string>> {
  let lastErr: unknown;
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    // withGeminiRetry: chờ đúng delay khi chạm hạn mức phút, fail ngay khi hết hạn mức ngày
    const res = await withGeminiRetry("translate", () =>
      ctx.ai.models.generateContent({
        model: ctx.model,
        contents: prompt,
        config: {
          systemInstruction: system,
          responseMimeType: "application/json",
          responseSchema: RESPONSE_SCHEMA,
          temperature: 0.3,
        },
      }),
    );
    track(ctx, res);
    try {
      const rows = JSON.parse(res.text ?? "[]") as { i: number; text: string }[];
      const byId = new Map(rows.map((r) => [r.i, r.text]));
      const missing = expected.filter((s) => !byId.get(s.i)?.trim());
      if (missing.length > 0) {
        throw new Error(`thiếu ${missing.length} dòng (i=${missing[0].i}…)`);
      }
      return byId;
    } catch (err) {
      lastErr = err;
    }
  }
  throw new Error(
    `Gọi dịch thất bại sau ${MAX_RETRIES + 1} lần: ${lastErr instanceof Error ? lastErr.message : lastErr}`,
  );
}

export async function translateSegments(
  input: {
    segments: SubtitleSegment[];
    style: TranslationStyle;
    /** mã ngôn ngữ đích (vi, en, zh...) — mặc định "vi" */
    targetLang?: string | null;
    /** dùng khi style === "custom": mô tả phong cách do user nhập */
    customPrompt?: string | null;
    glossary?: string | null;
    model?: string;
  },
  onProgress: (pct: number) => void,
): Promise<TranslateResult> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY chưa được cấu hình");
  const ctx: Ctx = {
    ai: new GoogleGenAI({ apiKey }),
    model: input.model ?? process.env.GEMINI_TRANSLATE_MODEL ?? "gemini-2.5-flash",
    usage: [],
  };

  // Pass 0 (5%): global story brief for consistent pronouns/terms
  const brief = await buildStoryBrief(ctx, input.segments);
  onProgress(5);

  const styleInstruction =
    input.style === "custom"
      ? `Phong cách dịch theo yêu cầu của người dùng:\n${(input.customPrompt ?? "").trim() || "Dịch tự nhiên, dễ hiểu."}`
      : (STYLE_INSTRUCTIONS[input.style] ?? STYLE_INSTRUCTIONS.natural);

  const langName = targetLangName(input.targetLang ?? "vi");

  let system =
    `Bạn là dịch giả phụ đề chuyên nghiệp, dịch sang ${langName}. ` +
    `Mọi hướng dẫn phong cách bên dưới áp dụng cho NGÔN NGỮ ĐÍCH (${langName}) — ` +
    "diễn đạt như người bản xứ của ngôn ngữ đó, ví dụ minh họa chỉ để tham khảo cách xử lý.\n" +
    styleInstruction +
    "\nQuy tắc bắt buộc:\n" +
    "- Trả về đúng số dòng với đúng chỉ số i như đầu vào, không gộp, không tách, không bỏ dòng.\n" +
    "- Giữ độ dài mỗi dòng tương đương bản gốc (phụ đề phải đọc kịp).\n" +
    "- Đồng nhất tên nhân vật và xưng hô xuyên suốt theo bản tóm tắt ngữ cảnh.\n" +
    "- Không thêm ghi chú, giải thích hay ký tự thừa.";
  if (brief) system += `\n\nNGỮ CẢNH TOÀN PHIM:\n${brief}`;
  if (input.glossary?.trim()) {
    system += `\n\nBảng thuật ngữ bắt buộc tuân theo (term=bản dịch):\n${input.glossary.trim()}`;
  }

  const chunks: SubtitleSegment[][] = [];
  for (let i = 0; i < input.segments.length; i += CHUNK_SIZE) {
    chunks.push(input.segments.slice(i, i + CHUNK_SIZE));
  }

  // Pass 1 (5→60%): translate with rolling context
  const translated: SubtitleSegment[] = [];
  for (const [chunkIdx, chunk] of chunks.entries()) {
    const context = translated.slice(-CONTEXT_LINES);
    const contextBlock =
      context.length > 0
        ? `Ngữ cảnh (các dòng đã dịch ngay trước, KHÔNG dịch lại):\n${JSON.stringify(
            context.map((s) => ({ i: s.i, text: s.text })),
          )}\n\n`
        : "";
    const payload = JSON.stringify(chunk.map((s) => ({ i: s.i, text: s.text })));
    const byId = await structuredCall(
      ctx,
      system,
      `${contextBlock}Dịch các dòng phụ đề sau sang ${langName}:\n${payload}`,
      chunk,
    );
    for (const seg of chunk) {
      translated.push({ ...seg, text: byId.get(seg.i)!.trim() });
    }
    onProgress(5 + Math.round(((chunkIdx + 1) / chunks.length) * 55));
  }

  // Pass 2 (60→100%): editorial polish — rewrite stiff lines only
  if (POLISH_STYLES.includes(input.style)) {
    const polishSystem =
      `Bạn là biên tập viên phụ đề ${langName} cho phim lồng tiếng. ` +
      "Nhiệm vụ: rà từng dòng bản dịch, dòng nào nghe cứng, máy móc, 'vô tri' hoặc lệch phong cách thì VIẾT LẠI cho tự nhiên như người bản xứ; dòng đã hay thì GIỮ NGUYÊN. " +
      "Dựa vào câu gốc để không làm sai nghĩa. Giữ nguyên số dòng và chỉ số i. Giữ xưng hô nhất quán.\n" +
      `Phong cách phải giữ đúng: ${styleInstruction}` +
      (brief ? `\n\nNGỮ CẢNH TOÀN PHIM:\n${brief}` : "");
    for (const [chunkIdx, chunk] of chunks.entries()) {
      const slice = translated.slice(chunkIdx * CHUNK_SIZE, chunkIdx * CHUNK_SIZE + chunk.length);
      const payload = JSON.stringify(
        slice.map((s, k) => ({ i: s.i, goc: chunk[k].text, viet: s.text })),
      );
      try {
        const byId = await structuredCall(
          ctx,
          polishSystem,
          `Biên tập các dòng sau (trả về bản dịch ${langName} cuối cùng cho từng i):\n${payload}`,
          chunk,
        );
        for (const seg of slice) {
          const polished = byId.get(seg.i)?.trim();
          if (polished) seg.text = polished;
        }
      } catch (err) {
        logger.warn(
          { chunk: chunkIdx, err: String(err) },
          "polish chunk failed — keeping first-pass translation",
        );
      }
      onProgress(60 + Math.round(((chunkIdx + 1) / chunks.length) * 40));
    }
  } else {
    onProgress(100);
  }

  return { segments: translated, usage: ctx.usage };
}
