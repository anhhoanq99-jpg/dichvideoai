import { GoogleGenAI } from "@google/genai";
import Groq from "groq-sdk";
import { targetLangName } from "@dichvideo/shared";
import type { SubtitleSegment, TranslationStyleId } from "@dichvideo/shared";
import { logger } from "../logger";
import {
  isDailyQuotaError,
  isKeyExhaustedError,
  rateLimitDelayMs,
  withGeminiRetry,
} from "./gemini-limits";
import { geminiKeys } from "./gemini-keys";
import {
  POLISH_STYLES,
  STYLE_BRIEF_HINTS,
  STYLE_INSTRUCTIONS,
} from "./translation-style-prompts";
import { PRICING, type UsageRecord } from "./usage";

export type TranslationStyle = TranslationStyleId;

const CHUNK_SIZE = 60;
const CONTEXT_LINES = 5;
const MAX_RETRIES = 2;
const GROQ_MAX_RETRIES = 4;

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

interface TranslateContext {
  gemini: GoogleGenAI | null;
  groq: Groq | null;
  /** danh sách key Gemini (GEMINI_API_KEYS + GEMINI_API_KEY) — hết key này sang key kế */
  keys: string[];
  keyIdx: number;
  /** provider đang dùng — tự hạ từ gemini xuống groq khi hết sạch key */
  provider: "gemini" | "groq";
  geminiModel: string;
  groqModel: string;
  usage: UsageRecord[];
}

interface GenerateOptions {
  system?: string;
  prompt: string;
  /** true → bắt model trả JSON danh sách dòng dịch */
  json: boolean;
  temperature: number;
}

function recordGeminiUsage(
  ctx: TranslateContext,
  res: { usageMetadata?: { promptTokenCount?: number; candidatesTokenCount?: number } },
) {
  const inputTokens = res.usageMetadata?.promptTokenCount ?? 0;
  const outputTokens = res.usageMetadata?.candidatesTokenCount ?? 0;
  ctx.usage.push(
    {
      provider: "gemini",
      metric: "tokens_in",
      quantity: inputTokens,
      costUsdMicros: inputTokens * PRICING.gemini25FlashInPerTok,
    },
    {
      provider: "gemini",
      metric: "tokens_out",
      quantity: outputTokens,
      costUsdMicros: outputTokens * PRICING.gemini25FlashOutPerTok,
    },
  );
}

function recordGroqUsage(
  ctx: TranslateContext,
  usage?: { prompt_tokens?: number; completion_tokens?: number } | null,
) {
  // gói miễn phí của Groq — không tính chi phí
  ctx.usage.push(
    {
      provider: "groq",
      metric: "tokens_in",
      quantity: usage?.prompt_tokens ?? 0,
      costUsdMicros: 0,
    },
    {
      provider: "groq",
      metric: "tokens_out",
      quantity: usage?.completion_tokens ?? 0,
      costUsdMicros: 0,
    },
  );
}

async function generateGemini(ctx: TranslateContext, opts: GenerateOptions) {
  const res = await withGeminiRetry(opts.json ? "translate" : "story-brief", () =>
    ctx.gemini!.models.generateContent({
      model: ctx.geminiModel,
      contents: opts.prompt,
      config: {
        ...(opts.system ? { systemInstruction: opts.system } : {}),
        ...(opts.json
          ? { responseMimeType: "application/json", responseSchema: RESPONSE_SCHEMA }
          : {}),
        temperature: opts.temperature,
      },
    }),
  );
  recordGeminiUsage(ctx, res);
  return res.text ?? "";
}

async function generateGroq(ctx: TranslateContext, opts: GenerateOptions) {
  let lastErr: unknown;
  for (let attempt = 0; attempt <= GROQ_MAX_RETRIES; attempt++) {
    try {
      const res = await ctx.groq!.chat.completions.create({
        model: ctx.groqModel,
        temperature: opts.temperature,
        ...(opts.json ? { response_format: { type: "json_object" as const } } : {}),
        messages: [
          ...(opts.system
            ? [{ role: "system" as const, content: opts.system }]
            : []),
          {
            role: "user" as const,
            content: opts.json
              ? `${opts.prompt}\n\nTrả về DUY NHẤT một JSON object dạng {"lines":[{"i":<số thứ tự giữ nguyên>,"text":"<bản dịch>"},...]}, không thêm chữ nào khác.`
              : opts.prompt,
          },
        ],
      });
      recordGroqUsage(ctx, res.usage);
      return res.choices[0]?.message?.content ?? "";
    } catch (err) {
      lastErr = err;
      const wait = rateLimitDelayMs(err) ?? 2000 * (attempt + 1);
      logger.warn(
        { attempt, waitMs: wait, err: String(err).slice(0, 200) },
        "groq call retrying",
      );
      await new Promise((r) => setTimeout(r, wait));
    }
  }
  throw new Error(
    `Groq thất bại sau ${GROQ_MAX_RETRIES + 1} lần: ${lastErr instanceof Error ? lastErr.message : lastErr}`,
  );
}

function isGeminiUnavailable(err: unknown) {
  // UnrecoverableError = hết hạn mức ngày / hết tiền trả trước (fail nhanh từ withGeminiRetry)
  return (
    (err instanceof Error && err.name === "UnrecoverableError") ||
    isDailyQuotaError(err)
  );
}

/**
 * Gọi model đang chọn. Gemini lỗi (hết hạn mức ngày, hết tiền trả trước,
 * hay lỗi dai dẳng sau khi đã retry) mà có key Groq → tự chuyển sang Groq
 * (Llama, miễn phí) cho phần còn lại của job thay vì fail.
 */
async function generate(ctx: TranslateContext, opts: GenerateOptions) {
  while (ctx.provider === "gemini") {
    try {
      return await generateGemini(ctx, opts);
    } catch (err) {
      // Key này hết hạn mức/hết tiền mà còn key khác → đổi key rồi thử lại.
      // Nhờ vậy cắm vài key MIỄN PHÍ là dịch vẫn chạy bằng Gemini (chất lượng
      // tiếng Việt hơn hẳn Groq/Llama) thay vì rơi xuống dự phòng ngay từ key đầu.
      if (isKeyExhaustedError(err) && ctx.keyIdx < ctx.keys.length - 1) {
        ctx.keyIdx++;
        ctx.gemini = new GoogleGenAI({ apiKey: ctx.keys[ctx.keyIdx] });
        logger.warn(
          { key: `${ctx.keyIdx + 1}/${ctx.keys.length}` },
          "key Gemini hết hạn mức — chuyển sang key tiếp theo",
        );
        continue;
      }
      if (!ctx.groq) throw err;
      ctx.provider = "groq";
      logger.warn(
        { groqModel: ctx.groqModel, err: String(err).slice(0, 200) },
        "Hết sạch key Gemini — tự chuyển sang Groq (miễn phí) cho job này",
      );
    }
  }
  return generateGroq(ctx, opts);
}

/**
 * Global-context pass: read ALL source lines once, produce a brief the
 * translator uses for consistent pronouns, tone and terminology.
 */
async function buildStoryBrief(
  ctx: TranslateContext,
  segments: SubtitleSegment[],
  styleHint: string,
): Promise<string> {
  const fullText = segments.map((s) => s.text).join("\n").slice(0, 100_000);
  try {
    const text = await generate(ctx, {
      prompt:
        "Đọc toàn bộ lời thoại/phụ đề sau và trả về bản tóm tắt NGẮN phục vụ dịch thuật, gồm:\n" +
        "1. Thể loại + bối cảnh + tông giọng (2-3 câu).\n" +
        "2. MẠCH TRUYỆN: chuyện gì xảy ra từ đầu tới cuối (3-5 gạch đầu dòng) — để dịch câu\n" +
        "   mơ hồ biết chọn nghĩa nào cho khớp diễn biến.\n" +
        "3. Các nhân vật chính và QUAN HỆ giữa họ (vai vế, thân/sơ, trên/dưới) → đề xuất cách\n" +
        "   xưng hô tiếng Việt cho TỪNG CẶP nhân vật (anh-em, tao-mày, ta-ngươi, cậu-tớ...).\n" +
        "4. Thuật ngữ/tên riêng lặp lại cần dịch nhất quán.\n" +
        "5. Những câu dễ dịch sai vì đa nghĩa hoặc phụ thuộc bối cảnh — ghi rõ nên hiểu thế nào.\n" +
        styleHint +
        "Chỉ trả về nội dung tóm tắt, tối đa 400 từ.\n\n" +
        fullText,
      json: false,
      temperature: 0.2,
    });
    return text.trim();
  } catch (err) {
    // Gemini chết hẳn (và không có Groq dự phòng) → dừng luôn cho job fail sạch
    if (isGeminiUnavailable(err)) throw err;
    logger.warn({ err: String(err) }, "story brief failed — translating without it");
    return "";
  }
}

async function structuredCall(
  ctx: TranslateContext,
  system: string,
  prompt: string,
  expected: { i: number }[],
): Promise<Map<number, string>> {
  let lastErr: unknown;
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    const text = await generate(ctx, { system, prompt, json: true, temperature: 0.3 });
    try {
      // Gemini trả mảng theo schema; Groq (json_object) trả {"lines":[...]}
      const parsed = JSON.parse(text || "[]") as unknown;
      const rows = (
        Array.isArray(parsed)
          ? parsed
          : ((parsed as { lines?: unknown }).lines ?? [])
      ) as { i: number; text: string }[];
      const textByIndex = new Map(rows.map((r) => [r.i, r.text]));
      const missing = expected.filter((s) => !textByIndex.get(s.i)?.trim());
      if (missing.length > 0) {
        throw new Error(`thiếu ${missing.length} dòng (i=${missing[0].i}…)`);
      }
      return textByIndex;
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
  const keys = geminiKeys();
  const groqKey = process.env.GROQ_API_KEY;
  if (keys.length === 0 && !groqKey) {
    throw new Error("Chưa cấu hình GEMINI_API_KEY / GEMINI_API_KEYS hoặc GROQ_API_KEY");
  }
  const ctx: TranslateContext = {
    gemini: keys.length > 0 ? new GoogleGenAI({ apiKey: keys[0] }) : null,
    groq: groqKey ? new Groq({ apiKey: groqKey }) : null,
    keys,
    keyIdx: 0,
    // ưu tiên Gemini (chất lượng dịch tốt hơn); không có key → chạy thẳng Groq
    provider: keys.length > 0 ? "gemini" : "groq",
    geminiModel:
      // gemini-3-flash-preview: ĐÃ ĐO bằng key thật — 3/3 lượt thành công.
      // KHÔNG dùng gemini-3.5-flash (luôn 503 "high demand" ở bậc miễn phí) và
      // KHÔNG quay lại gemini-2.5-flash ("no longer available to new users").
      input.model ?? process.env.GEMINI_TRANSLATE_MODEL ?? "gemini-3-flash-preview",
    groqModel: process.env.GROQ_TRANSLATE_MODEL ?? "llama-3.3-70b-versatile",
    usage: [],
  };

  // Pass 0 (5%): global story brief for consistent pronouns/terms
  // Bản tóm tắt biết trước phong cách sẽ dịch → gợi ý xưng hô đúng chất ngay từ
  // đầu (hoạt hình khác cổ trang khác review), thay vì gợi ý chung chung rồi
  // bước dịch phải tự uốn lại.
  const brief = await buildStoryBrief(ctx, input.segments, STYLE_BRIEF_HINTS[input.style] ?? "");
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
    const textByIndex = await structuredCall(
      ctx,
      system,
      `${contextBlock}Dịch các dòng phụ đề sau sang ${langName}:\n${payload}`,
      chunk,
    );
    for (const seg of chunk) {
      translated.push({ ...seg, text: textByIndex.get(seg.i)!.trim() });
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
        const textByIndex = await structuredCall(
          ctx,
          polishSystem,
          `Biên tập các dòng sau (trả về bản dịch ${langName} cuối cùng cho từng i):\n${payload}`,
          chunk,
        );
        for (const seg of slice) {
          const polished = textByIndex.get(seg.i)?.trim();
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
