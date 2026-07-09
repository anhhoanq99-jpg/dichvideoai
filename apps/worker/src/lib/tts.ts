import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { GoogleGenAI } from "@google/genai";
import { MsEdgeTTS, OUTPUT_FORMAT } from "msedge-tts";
import { geminiVoiceName, pcmToWav } from "@dichvideo/shared";
import { PRICING, type UsageRecord } from "./usage";

/**
 * Sinh 1 clip giọng đọc (mp3 24kHz) cho một câu phụ đề.
 * Mỗi lần gọi tạo connection mới — Edge TTS chỉ dùng được 1 lần/stream.
 * msedge-tts nhận THƯ MỤC (phải tồn tại sẵn) và tự ghi audio.mp3 vào trong.
 */
export async function synthesizeClip(input: {
  text: string;
  voice: string;
  /** 0.8 .. 1.3 */
  speed: number;
  dir: string;
  /** tên thư mục con cho clip này */
  name: string;
}): Promise<string> {
  const clipDir = path.join(input.dir, input.name);
  await mkdir(clipDir, { recursive: true });
  const tts = new MsEdgeTTS();
  await tts.setMetadata(
    input.voice,
    OUTPUT_FORMAT.AUDIO_24KHZ_48KBITRATE_MONO_MP3,
  );
  const ratePct = Math.round((input.speed - 1) * 100);
  const { audioFilePath } = await tts.toFile(clipDir, input.text, {
    rate: `${ratePct >= 0 ? "+" : ""}${ratePct}%`,
  });
  return audioFilePath;
}

/** Sinh 1 clip bằng giọng cao cấp Gemini TTS → wav 24kHz + usage để trừ chi phí. */
export async function synthesizeGeminiClip(input: {
  text: string;
  /** tên voice thật, vd "Kore" */
  voiceName: string;
  dir: string;
  name: string;
}): Promise<{ file: string; usage: UsageRecord[] }> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY chưa được cấu hình");
  const ai = new GoogleGenAI({ apiKey });

  const res = await ai.models.generateContent({
    model: process.env.GEMINI_TTS_MODEL ?? "gemini-2.5-flash-preview-tts",
    contents: input.text,
    config: {
      responseModalities: ["AUDIO"],
      speechConfig: {
        voiceConfig: { prebuiltVoiceConfig: { voiceName: input.voiceName } },
      },
    },
  });
  const data = res.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
  if (!data) throw new Error("Gemini TTS không trả về audio");

  const file = path.join(input.dir, `${input.name}.wav`);
  await writeFile(file, pcmToWav(Buffer.from(data, "base64")));

  const inTok = res.usageMetadata?.promptTokenCount ?? 0;
  const outTok = res.usageMetadata?.candidatesTokenCount ?? 0;
  return {
    file,
    usage: [
      {
        provider: "gemini",
        metric: "tokens_in",
        quantity: inTok,
        costUsdMicros: inTok * PRICING.geminiTtsInPerTok,
      },
      {
        provider: "gemini",
        metric: "tokens_out",
        quantity: outTok,
        costUsdMicros: outTok * PRICING.geminiTtsOutPerTok,
      },
    ],
  };
}

const MAX_TTS_RETRIES = 3;

/**
 * Sinh clip theo id giọng bất kỳ: "gemini:Xxx" → Gemini TTS (trả phí),
 * còn lại → Edge TTS (miễn phí). Có retry quanh lỗi mạng.
 */
export async function synthesizeClipWithRetry(input: {
  text: string;
  voice: string;
  speed: number;
  dir: string;
  name: string;
}): Promise<{ file: string; usage: UsageRecord[] }> {
  const gemini = geminiVoiceName(input.voice);
  let lastErr: unknown;
  for (let attempt = 0; attempt < MAX_TTS_RETRIES; attempt++) {
    try {
      if (gemini) {
        return await synthesizeGeminiClip({
          text: input.text,
          voiceName: gemini,
          dir: input.dir,
          name: input.name,
        });
      }
      return { file: await synthesizeClip(input), usage: [] };
    } catch (err) {
      lastErr = err;
      await new Promise((r) => setTimeout(r, 1500 * (attempt + 1)));
    }
  }
  throw new Error(
    `TTS thất bại sau ${MAX_TTS_RETRIES} lần: ${lastErr instanceof Error ? lastErr.message : lastErr}`,
  );
}
