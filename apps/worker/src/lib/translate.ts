import { GoogleGenAI } from "@google/genai";
import type { SubtitleSegment } from "@dichvideo/shared";
import { PRICING, type UsageRecord } from "./usage";

export type TranslationStyle = "natural" | "formal" | "literal";

const STYLE_INSTRUCTIONS: Record<TranslationStyle, string> = {
  natural:
    "Dịch tự nhiên, mượt mà như lời thoại phim Việt, giữ sắc thái cảm xúc của nhân vật.",
  formal: "Dịch trang trọng, lịch sự, phù hợp nội dung tài liệu/tin tức.",
  literal: "Dịch sát nghĩa nhất có thể, ưu tiên độ chính xác hơn độ mượt.",
};

const CHUNK_SIZE = 60;
const CONTEXT_LINES = 5;
const MAX_RETRIES = 2;

const RESPONSE_SCHEMA = {
  type: "array",
  items: {
    type: "object",
    properties: {
      i: { type: "integer", description: "segment index, unchanged from input" },
      text: { type: "string", description: "Vietnamese translation" },
    },
    required: ["i", "text"],
  },
} as const;

function buildSystemPrompt(style: TranslationStyle, glossary?: string | null) {
  let prompt =
    "Bạn là dịch giả phụ đề chuyên nghiệp, dịch sang TIẾNG VIỆT. " +
    STYLE_INSTRUCTIONS[style] +
    " Quy tắc bắt buộc:\n" +
    "- Trả về đúng số dòng với đúng chỉ số i như đầu vào, không gộp, không tách, không bỏ dòng.\n" +
    "- Giữ độ dài mỗi dòng tương đương bản gốc (phụ đề phải đọc kịp).\n" +
    "- Đồng nhất tên nhân vật và xưng hô (anh/em/ông/bà...) xuyên suốt.\n" +
    "- Không thêm ghi chú, giải thích hay ký tự thừa.";
  if (glossary?.trim()) {
    prompt +=
      "\nBảng thuật ngữ bắt buộc tuân theo (term=bản dịch):\n" + glossary.trim();
  }
  return prompt;
}

export interface TranslateResult {
  segments: SubtitleSegment[];
  usage: UsageRecord[];
}

export async function translateSegments(
  input: {
    segments: SubtitleSegment[];
    style: TranslationStyle;
    glossary?: string | null;
    model?: string;
  },
  onProgress: (pct: number) => void,
): Promise<TranslateResult> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY chưa được cấu hình");
  const ai = new GoogleGenAI({ apiKey });
  const model = input.model ?? process.env.GEMINI_TRANSLATE_MODEL ?? "gemini-2.5-flash";
  const system = buildSystemPrompt(input.style, input.glossary);

  const chunks: SubtitleSegment[][] = [];
  for (let i = 0; i < input.segments.length; i += CHUNK_SIZE) {
    chunks.push(input.segments.slice(i, i + CHUNK_SIZE));
  }

  const translated: SubtitleSegment[] = [];
  const usage: UsageRecord[] = [];

  for (const [chunkIdx, chunk] of chunks.entries()) {
    const context = translated.slice(-CONTEXT_LINES);
    const contextBlock =
      context.length > 0
        ? `Ngữ cảnh (các dòng đã dịch ngay trước, KHÔNG dịch lại):\n${JSON.stringify(
            context.map((s) => ({ i: s.i, text: s.text })),
          )}\n\n`
        : "";
    const payload = JSON.stringify(chunk.map((s) => ({ i: s.i, text: s.text })));

    let done = false;
    for (let attempt = 0; attempt <= MAX_RETRIES && !done; attempt++) {
      const res = await ai.models.generateContent({
        model,
        contents: `${contextBlock}Dịch các dòng phụ đề sau sang tiếng Việt:\n${payload}`,
        config: {
          systemInstruction: system,
          responseMimeType: "application/json",
          responseSchema: RESPONSE_SCHEMA,
          temperature: 0.3,
        },
      });

      const inTok = res.usageMetadata?.promptTokenCount ?? 0;
      const outTok = res.usageMetadata?.candidatesTokenCount ?? 0;
      usage.push(
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

      try {
        const rows = JSON.parse(res.text ?? "[]") as { i: number; text: string }[];
        const byId = new Map(rows.map((r) => [r.i, r.text]));
        const missing = chunk.filter((s) => !byId.get(s.i)?.trim());
        if (missing.length > 0) {
          throw new Error(`thiếu ${missing.length} dòng (i=${missing[0].i}…)`);
        }
        for (const seg of chunk) {
          translated.push({ ...seg, text: byId.get(seg.i)!.trim() });
        }
        done = true;
      } catch (err) {
        if (attempt === MAX_RETRIES) {
          throw new Error(
            `Dịch chunk ${chunkIdx + 1}/${chunks.length} thất bại sau ${MAX_RETRIES + 1} lần: ${
              err instanceof Error ? err.message : err
            }`,
          );
        }
      }
    }
    onProgress(Math.round(((chunkIdx + 1) / chunks.length) * 100));
  }

  return { segments: translated, usage };
}
