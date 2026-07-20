import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { GoogleGenAI } from "@google/genai";
import { UnrecoverableError } from "bullmq";
import { MsEdgeTTS, OUTPUT_FORMAT } from "msedge-tts";
import {
  elevenVoiceId,
  fptVoiceName,
  gcloudVoiceName,
  geminiVoiceName,
  viettelVoiceName,
  pcmToWav,
} from "@dichvideo/shared";
import {
  dailyQuotaMessage,
  isDailyQuotaError,
  rateLimitDelayMs,
} from "./gemini-limits";
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

// Gemini TTS free tier chỉ cho 3 request/phút — chủ động giãn nhịp giữa các câu.
// Nâng key lên paid tier thì đặt GEMINI_TTS_RPM cao hơn (vd 60) là hết chờ.
const GEMINI_TTS_RPM = Number(process.env.GEMINI_TTS_RPM ?? 3);
const GEMINI_INTERVAL_MS = Math.ceil(60_000 / Math.max(1, GEMINI_TTS_RPM));
let geminiNextSlotAt = 0;

async function geminiThrottle(): Promise<void> {
  const now = Date.now();
  const wait = geminiNextSlotAt - now;
  geminiNextSlotAt = Math.max(now, geminiNextSlotAt) + GEMINI_INTERVAL_MS;
  if (wait > 0) await new Promise((r) => setTimeout(r, wait));
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

  await geminiThrottle();
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

  const inputTokens = res.usageMetadata?.promptTokenCount ?? 0;
  const outputTokens = res.usageMetadata?.candidatesTokenCount ?? 0;
  return {
    file,
    usage: [
      {
        provider: "gemini",
        metric: "tokens_in",
        quantity: inputTokens,
        costUsdMicros: inputTokens * PRICING.geminiTtsInPerTok,
      },
      {
        provider: "gemini",
        metric: "tokens_out",
        quantity: outputTokens,
        costUsdMicros: outputTokens * PRICING.geminiTtsOutPerTok,
      },
    ],
  };
}

/**
 * Sinh 1 clip bằng ElevenLabs (model multilingual, đọc được tiếng Việt).
 * Cần ELEVENLABS_API_KEY — gói free ~10.000 credits/tháng (~10 phút).
 */
export async function synthesizeElevenClip(input: {
  text: string;
  /** voice_id thật của ElevenLabs, vd Adam = "pNInz6obpgDQGcFmaJgB" */
  voiceId: string;
  dir: string;
  name: string;
}): Promise<{ file: string; usage: UsageRecord[] }> {
  const apiKey = process.env.ELEVENLABS_API_KEY;
  if (!apiKey) {
    throw new UnrecoverableError(
      "Giọng ElevenLabs cần ELEVENLABS_API_KEY (đăng ký free tại elevenlabs.io) — thêm vào .env rồi chạy lại.",
    );
  }
  const res = await fetch(
    `https://api.elevenlabs.io/v1/text-to-speech/${input.voiceId}?output_format=mp3_44100_64`,
    {
      method: "POST",
      headers: { "xi-api-key": apiKey, "content-type": "application/json" },
      body: JSON.stringify({
        text: input.text,
        model_id: process.env.ELEVENLABS_MODEL ?? "eleven_multilingual_v2",
      }),
    },
  );
  if (!res.ok) {
    const detail = (await res.text()).slice(0, 300);
    if (res.status === 401 || /quota_exceeded/i.test(detail)) {
      throw new UnrecoverableError(
        `ElevenLabs từ chối (hết hạn mức tháng hoặc key sai): ${detail}`,
      );
    }
    throw new Error(`ElevenLabs ${res.status}: ${detail}`);
  }
  const file = path.join(input.dir, `${input.name}.mp3`);
  await writeFile(file, Buffer.from(await res.arrayBuffer()));
  return {
    file,
    usage: [
      // gói free — chưa tính chi phí; đổi khi lên gói trả phí
      { provider: "eleven", metric: "chars", quantity: input.text.length, costUsdMicros: 0 },
    ],
  };
}

/**
 * Sinh 1 clip bằng Google Cloud TTS (8 giọng tiếng Việt Wavenet/Standard).
 * Cần GOOGLE_TTS_API_KEY — free 1tr ký tự Wavenet + 4tr Standard mỗi tháng.
 */
export async function synthesizeGCloudClip(input: {
  text: string;
  /** tên voice thật, vd "vi-VN-Wavenet-A" */
  voiceName: string;
  /** 0.8 .. 1.3 — Google hỗ trợ speakingRate nên bake luôn */
  speed: number;
  dir: string;
  name: string;
}): Promise<{ file: string; usage: UsageRecord[] }> {
  const apiKey = process.env.GOOGLE_TTS_API_KEY;
  if (!apiKey) {
    throw new UnrecoverableError(
      "Giọng Google Cloud cần GOOGLE_TTS_API_KEY (bật Text-to-Speech API trong Google Cloud Console) — thêm vào .env rồi chạy lại.",
    );
  }
  const languageCode = input.voiceName.split("-").slice(0, 2).join("-");
  const res = await fetch(
    `https://texttospeech.googleapis.com/v1/text:synthesize?key=${apiKey}`,
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        input: { text: input.text },
        voice: { languageCode, name: input.voiceName },
        audioConfig: { audioEncoding: "MP3", speakingRate: input.speed },
      }),
    },
  );
  if (!res.ok) {
    const detail = (await res.text()).slice(0, 300);
    if (res.status === 403) {
      throw new UnrecoverableError(`Google Cloud TTS từ chối key: ${detail}`);
    }
    throw new Error(`Google Cloud TTS ${res.status}: ${detail}`);
  }
  const data = (await res.json()) as { audioContent?: string };
  if (!data.audioContent) throw new Error("Google Cloud TTS không trả về audio");
  const file = path.join(input.dir, `${input.name}.mp3`);
  await writeFile(file, Buffer.from(data.audioContent, "base64"));
  return {
    file,
    usage: [
      // trong hạn mức free hằng tháng — chưa tính chi phí
      { provider: "gcloud", metric: "chars", quantity: input.text.length, costUsdMicros: 0 },
    ],
  };
}

const MAX_TTS_RETRIES = 6;

/**
 * Sinh clip theo id giọng bất kỳ: "gemini:Xxx" → Gemini TTS (trả phí),
 * "eleven:Xxx" → ElevenLabs, "gcloud:Xxx" → Google Cloud TTS,
 * còn lại → Edge TTS (miễn phí). Retry quanh lỗi mạng; gặp 429 thì chờ
 * đúng thời gian provider yêu cầu rồi thử lại.
 */
/**
 * Sinh 1 clip bằng Viettel AI TTS (giọng Việt bản địa, free ~500k ký tự/ngày).
 * Cần VIETTEL_TTS_TOKEN. API trả THẲNG file wav nên gọn hơn FPT.
 */
export async function synthesizeViettelClip(input: {
  text: string;
  /** tên voice thật, vd "hn-thanhtung" */
  voiceName: string;
  /** 0.8 .. 1.3 — Viettel nhận speed nên bake luôn, khỏi atempo */
  speed: number;
  dir: string;
  name: string;
}): Promise<{ file: string; usage: UsageRecord[] }> {
  const token = process.env.VIETTEL_TTS_TOKEN;
  if (!token) {
    throw new UnrecoverableError(
      "Giọng Viettel AI cần VIETTEL_TTS_TOKEN — đăng ký tại viettelgroup.ai, tạo token rồi thêm vào .env.",
    );
  }
  const res = await fetch("https://viettelgroup.ai/voice/api/tts/v1/rest/syn", {
    method: "POST",
    headers: { "content-type": "application/json", token },
    body: JSON.stringify({
      text: input.text,
      voice: input.voiceName,
      id: "2",
      without_filter: false,
      speed: input.speed,
      tts_return_option: 3, // 3 = wav
    }),
  });
  if (!res.ok) {
    throw new Error(`Viettel TTS ${res.status}: ${(await res.text()).slice(0, 200)}`);
  }
  const file = path.join(input.dir, `${input.name}.wav`);
  await mkdir(input.dir, { recursive: true });
  await writeFile(file, Buffer.from(await res.arrayBuffer()));
  return {
    file,
    // gói miễn phí — không tính chi phí, vẫn ghi số ký tự để theo dõi hạn mức
    usage: [
      {
        provider: "viettel",
        metric: "chars",
        quantity: input.text.length,
        costUsdMicros: 0,
      },
    ],
  };
}

/**
 * Sinh 1 clip bằng FPT.AI TTS (7 giọng Việt đủ 3 miền). Cần FPT_TTS_API_KEY.
 *
 * FPT trả về LINK mp3 CHƯA tồn tại ngay — tài liệu ghi phải chờ 5 giây tới
 * 2 phút. Nên phải poll link tới khi tải được, khác hẳn các provider trả
 * thẳng audio. Đây cũng là lý do FPT chậm hơn Viettel khi đọc nhiều câu.
 */
export async function synthesizeFptClip(input: {
  text: string;
  /** tên voice thật, vd "banmai" */
  voiceName: string;
  /** 0.8 .. 1.3 → FPT nhận -3..3, 0 là bình thường */
  speed: number;
  dir: string;
  name: string;
}): Promise<{ file: string; usage: UsageRecord[] }> {
  const apiKey = process.env.FPT_TTS_API_KEY;
  if (!apiKey) {
    throw new UnrecoverableError(
      "Giọng FPT.AI cần FPT_TTS_API_KEY — đăng ký tại console.fpt.ai rồi thêm vào .env.",
    );
  }
  // 0.8..1.3 → khoảng -1..1 của FPT (thang -3..3), làm tròn cho an toàn
  const fptSpeed = Math.max(-3, Math.min(3, Math.round((input.speed - 1) * 4)));
  const res = await fetch("https://api.fpt.ai/hmi/tts/v5", {
    method: "POST",
    headers: {
      api_key: apiKey,
      voice: input.voiceName,
      speed: String(fptSpeed),
      format: "mp3",
      "content-type": "text/plain; charset=utf-8",
    },
    body: input.text.slice(0, 5000), // FPT giới hạn 5.000 ký tự/lượt
  });
  const data = (await res.json().catch(() => null)) as {
    async?: string;
    error?: number;
    message?: string;
  } | null;
  if (!res.ok || !data?.async) {
    throw new Error(
      `FPT TTS lỗi ${res.status}: ${data?.message ?? "không có link audio"}`,
    );
  }

  // Chờ file xuất hiện — tài liệu nói 5s..2 phút
  const deadline = Date.now() + 120_000;
  let audio: ArrayBuffer | null = null;
  while (Date.now() < deadline) {
    const got = await fetch(data.async);
    if (got.ok) {
      const buf = await got.arrayBuffer();
      if (buf.byteLength > 1024) {
        audio = buf;
        break;
      }
    }
    await new Promise((r) => setTimeout(r, 2000));
  }
  if (!audio) throw new Error("FPT TTS: chờ quá lâu mà file mp3 chưa sẵn sàng");

  const file = path.join(input.dir, `${input.name}.mp3`);
  await mkdir(input.dir, { recursive: true });
  await writeFile(file, Buffer.from(audio));
  return {
    file,
    usage: [
      {
        provider: "fpt",
        metric: "chars",
        quantity: input.text.length,
        costUsdMicros: 0,
      },
    ],
  };
}

export async function synthesizeClipWithRetry(input: {
  text: string;
  voice: string;
  speed: number;
  dir: string;
  name: string;
}): Promise<{ file: string; usage: UsageRecord[] }> {
  const gemini = geminiVoiceName(input.voice);
  const eleven = elevenVoiceId(input.voice);
  const gcloud = gcloudVoiceName(input.voice);
  const fpt = fptVoiceName(input.voice);
  const viettel = viettelVoiceName(input.voice);
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
      if (eleven) {
        return await synthesizeElevenClip({
          text: input.text,
          voiceId: eleven,
          dir: input.dir,
          name: input.name,
        });
      }
      if (gcloud) {
        return await synthesizeGCloudClip({
          text: input.text,
          voiceName: gcloud,
          speed: input.speed,
          dir: input.dir,
          name: input.name,
        });
      }
      if (viettel) {
        return await synthesizeViettelClip({
          text: input.text,
          voiceName: viettel,
          speed: input.speed,
          dir: input.dir,
          name: input.name,
        });
      }
      if (fpt) {
        return await synthesizeFptClip({
          text: input.text,
          voiceName: fpt,
          speed: input.speed,
          dir: input.dir,
          name: input.name,
        });
      }
      return { file: await synthesizeClip(input), usage: [] };
    } catch (err) {
      // lỗi không cứu được (thiếu key, hết hạn mức tháng...) → dừng hẳn, không retry
      if (err instanceof UnrecoverableError) throw err;
      // hết hạn mức NGÀY của Gemini free tier → dừng hẳn, không đợi BullMQ thử lại
      if (isDailyQuotaError(err)) {
        throw new UnrecoverableError(dailyQuotaMessage());
      }
      lastErr = err;
      const rateLimited = rateLimitDelayMs(err);
      await new Promise((r) => setTimeout(r, rateLimited ?? 1500 * (attempt + 1)));
    }
  }
  throw new Error(
    `TTS thất bại sau ${MAX_TTS_RETRIES} lần: ${lastErr instanceof Error ? lastErr.message : lastErr}`,
  );
}
