import { mkdtemp, readFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { GoogleGenAI } from "@google/genai";
import { MsEdgeTTS, OUTPUT_FORMAT } from "msedge-tts";
import {
  elevenVoiceId,
  fptVoiceName,
  gcloudVoiceName,
  geminiVoiceName,
  pcmToWav,
  viettelVoiceName,
} from "@dichvideo/shared";

/**
 * Tổng hợp giọng nói phía WEB (dùng cho nghe thử + công cụ Nhân bản giọng nói).
 * Định tuyến theo tiền tố id giọng: gemini / eleven / gcloud / viettel / fpt /
 * (còn lại) edge. Đây là bản dùng chung cho /api/tts-preview và
 * /api/voice-clone/speak.
 */
export interface Synthesized {
  body: Buffer;
  type: string;
}

export async function synthEdge(voice: string, text: string): Promise<Buffer> {
  const tts = new MsEdgeTTS();
  await tts.setMetadata(voice, OUTPUT_FORMAT.AUDIO_24KHZ_48KBITRATE_MONO_MP3);
  const dir = await mkdtemp(path.join(os.tmpdir(), "tts-"));
  try {
    const { audioFilePath } = await tts.toFile(dir, text);
    return await readFile(audioFilePath);
  } finally {
    await rm(dir, { recursive: true, force: true }).catch(() => {});
  }
}

export async function synthGemini(voiceName: string, text: string): Promise<Buffer> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("Chưa cấu hình GEMINI_API_KEY");
  const ai = new GoogleGenAI({ apiKey });
  const res = await ai.models.generateContent({
    model: process.env.GEMINI_TTS_MODEL ?? "gemini-2.5-flash-preview-tts",
    contents: text,
    config: {
      responseModalities: ["AUDIO"],
      speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName } } },
    },
  });
  const data = res.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
  if (!data) throw new Error("Gemini TTS không trả về audio");
  return pcmToWav(Buffer.from(data, "base64"));
}

/** ElevenLabs TTS — dùng cho cả giọng có sẵn (Adam…) lẫn giọng nhân bản (voice_id). */
export async function synthEleven(voiceId: string, text: string): Promise<Buffer> {
  const apiKey = process.env.ELEVENLABS_API_KEY;
  if (!apiKey) {
    throw new Error("Chưa cấu hình ELEVENLABS_API_KEY (đăng ký free tại elevenlabs.io)");
  }
  const res = await fetch(
    `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}?output_format=mp3_44100_128`,
    {
      method: "POST",
      headers: { "xi-api-key": apiKey, "content-type": "application/json" },
      body: JSON.stringify({
        text,
        model_id: process.env.ELEVENLABS_MODEL ?? "eleven_multilingual_v2",
      }),
    },
  );
  if (!res.ok) {
    const detail = (await res.text()).slice(0, 200);
    if (/quota|character.limit/i.test(detail)) {
      throw new Error("Hết hạn mức ElevenLabs tháng này — thử giọng thường/Google (miễn phí)");
    }
    throw new Error(`ElevenLabs ${res.status}: ${detail}`);
  }
  return Buffer.from(await res.arrayBuffer());
}

export async function synthGCloud(voiceName: string, text: string): Promise<Buffer> {
  const apiKey = process.env.GOOGLE_TTS_API_KEY;
  if (!apiKey) {
    throw new Error(
      "Chưa cấu hình GOOGLE_TTS_API_KEY (bật Text-to-Speech API trong Google Cloud Console)",
    );
  }
  const languageCode = voiceName.split("-").slice(0, 2).join("-");
  const res = await fetch(
    `https://texttospeech.googleapis.com/v1/text:synthesize?key=${apiKey}`,
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        input: { text },
        voice: { languageCode, name: voiceName },
        audioConfig: { audioEncoding: "MP3" },
      }),
    },
  );
  if (!res.ok) {
    throw new Error(`Google Cloud TTS ${res.status}: ${(await res.text()).slice(0, 200)}`);
  }
  const data = (await res.json()) as { audioContent?: string };
  if (!data.audioContent) throw new Error("Google Cloud TTS không trả về audio");
  return Buffer.from(data.audioContent, "base64");
}

/** Viettel AI TTS — giọng Việt bản địa, trả thẳng wav (tts_return_option: 3). */
export async function synthViettel(voiceName: string, text: string): Promise<Buffer> {
  const token = process.env.VIETTEL_TTS_TOKEN;
  if (!token) {
    throw new Error(
      "Giọng Viettel AI cần VIETTEL_TTS_TOKEN — đăng ký tại viettelgroup.ai rồi thêm vào .env",
    );
  }
  const res = await fetch("https://viettelgroup.ai/voice/api/tts/v1/rest/syn", {
    method: "POST",
    headers: { "content-type": "application/json", token },
    body: JSON.stringify({
      text,
      voice: voiceName,
      id: "2",
      without_filter: false,
      speed: 1,
      tts_return_option: 3, // 3 = wav
    }),
  });
  if (!res.ok) {
    throw new Error(`Viettel TTS ${res.status}: ${(await res.text()).slice(0, 200)}`);
  }
  return Buffer.from(await res.arrayBuffer());
}

/**
 * FPT.AI TTS — giọng Việt đủ 3 miền.
 * FPT trả về LINK mp3 CHƯA tồn tại ngay, phải poll tới khi tải được. Bản web
 * dùng hạn chờ NGẮN hơn worker (mặc định 45s thay vì 120s) vì đây là nghe thử:
 * người dùng đang đứng đợi, và route serverless cũng có trần thời gian.
 */
export async function synthFpt(
  voiceName: string,
  text: string,
  timeoutMs = 45_000,
): Promise<Buffer> {
  const apiKey = process.env.FPT_TTS_API_KEY;
  if (!apiKey) {
    throw new Error(
      "Giọng FPT.AI cần FPT_TTS_API_KEY — đăng ký tại console.fpt.ai rồi thêm vào .env",
    );
  }
  const res = await fetch("https://api.fpt.ai/hmi/tts/v5", {
    method: "POST",
    headers: {
      api_key: apiKey,
      voice: voiceName,
      speed: "0",
      format: "mp3",
      "content-type": "text/plain; charset=utf-8",
    },
    body: text.slice(0, 5000), // FPT giới hạn 5.000 ký tự/lượt
  });
  const data = (await res.json().catch(() => null)) as {
    async?: string;
    message?: string;
  } | null;
  if (!res.ok || !data?.async) {
    throw new Error(`FPT TTS ${res.status}: ${data?.message ?? "không có link audio"}`);
  }

  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const got = await fetch(data.async);
    if (got.ok) {
      const buf = await got.arrayBuffer();
      if (buf.byteLength > 1024) return Buffer.from(buf);
    }
    await new Promise((r) => setTimeout(r, 2000));
  }
  throw new Error("FPT TTS: chờ quá lâu mà file mp3 chưa sẵn sàng — thử lại");
}

/**
 * Đọc `text` bằng bất kỳ id giọng nào trong catalog
 * (edge/gemini/eleven/gcloud/viettel/fpt).
 * KHÔNG xử lý giọng nhân bản "mine:" — nơi gọi tự resolve rồi dùng synthEleven.
 */
export async function synthesizeVoice(voice: string, text: string): Promise<Synthesized> {
  const gemini = geminiVoiceName(voice);
  const eleven = elevenVoiceId(voice);
  const gcloud = gcloudVoiceName(voice);
  const viettel = viettelVoiceName(voice);
  const fpt = fptVoiceName(voice);
  if (gemini) return { body: await synthGemini(gemini, text), type: "audio/wav" };
  if (eleven) return { body: await synthEleven(eleven, text), type: "audio/mpeg" };
  if (gcloud) return { body: await synthGCloud(gcloud, text), type: "audio/mpeg" };
  if (viettel) return { body: await synthViettel(viettel, text), type: "audio/wav" };
  if (fpt) return { body: await synthFpt(fpt, text), type: "audio/mpeg" };
  return { body: await synthEdge(voice, text), type: "audio/mpeg" };
}
