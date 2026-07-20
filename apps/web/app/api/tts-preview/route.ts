import { mkdtemp, readFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { NextRequest, NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";
import { MsEdgeTTS, OUTPUT_FORMAT } from "msedge-tts";
import {
  EDGE_VOICE_IDS,
  elevenVoiceId,
  gcloudVoiceName,
  geminiVoiceName,
  isValidVoiceId,
  pcmToWav,
} from "@dichvideo/shared";
import { getSession } from "@/lib/session";
import { callerId, rateLimit, tooManyRequests } from "@/lib/rate-limit";

const VI_SAMPLE = "Xin chào! Đây là giọng đọc thử của mình, rất vui được đồng hành cùng video của bạn.";
const EN_SAMPLE = "Hello! This is a short preview of my voice.";
const MAX_PREVIEW_TEXT = 300;
const MAX_CACHE_ENTRIES = 500;

/** Cache mẫu giọng trong bộ nhớ — mỗi cặp (giọng, câu) chỉ sinh 1 lần. */
declare global {
  var __ttsPreviewCache: Map<string, { body: Buffer; type: string }> | undefined;
}
const cache = (globalThis.__ttsPreviewCache ??= new Map());

/** Nghe thử theo câu tùy ý: chỉ nguồn có hạn mức rộng (Edge free, GCloud 1-4tr ký tự). */
function allowsCustomText(voice: string): boolean {
  return EDGE_VOICE_IDS.has(voice) || gcloudVoiceName(voice) !== null;
}

async function synthesizeEdge(voice: string, text: string): Promise<Buffer> {
  const tts = new MsEdgeTTS();
  await tts.setMetadata(voice, OUTPUT_FORMAT.AUDIO_24KHZ_48KBITRATE_MONO_MP3);
  const dir = await mkdtemp(path.join(os.tmpdir(), "tts-preview-"));
  try {
    const { audioFilePath } = await tts.toFile(dir, text);
    return await readFile(audioFilePath);
  } finally {
    await rm(dir, { recursive: true, force: true }).catch(() => {});
  }
}

async function synthesizeGeminiSample(voiceName: string): Promise<Buffer> {
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });
  const res = await ai.models.generateContent({
    model: process.env.GEMINI_TTS_MODEL ?? "gemini-2.5-flash-preview-tts",
    contents: VI_SAMPLE,
    config: {
      responseModalities: ["AUDIO"],
      speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName } } },
    },
  });
  const data = res.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
  if (!data) throw new Error("Gemini TTS không trả về audio");
  return pcmToWav(Buffer.from(data, "base64"));
}

async function synthesizeElevenSample(voiceId: string): Promise<Buffer> {
  const apiKey = process.env.ELEVENLABS_API_KEY;
  if (!apiKey) {
    throw new Error("Chưa cấu hình ELEVENLABS_API_KEY (đăng ký free tại elevenlabs.io)");
  }
  const res = await fetch(
    `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}?output_format=mp3_44100_64`,
    {
      method: "POST",
      headers: { "xi-api-key": apiKey, "content-type": "application/json" },
      body: JSON.stringify({
        text: VI_SAMPLE,
        model_id: process.env.ELEVENLABS_MODEL ?? "eleven_multilingual_v2",
      }),
    },
  );
  if (!res.ok) throw new Error(`ElevenLabs ${res.status}: ${(await res.text()).slice(0, 200)}`);
  return Buffer.from(await res.arrayBuffer());
}

async function synthesizeGCloud(voiceName: string, text: string): Promise<Buffer> {
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
  if (!res.ok) throw new Error(`Google Cloud TTS ${res.status}: ${(await res.text()).slice(0, 200)}`);
  const data = (await res.json()) as { audioContent?: string };
  if (!data.audioContent) throw new Error("Google Cloud TTS không trả về audio");
  return Buffer.from(data.audioContent, "base64");
}

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });
  }
  const voice = req.nextUrl.searchParams.get("voice") ?? "";
  if (!isValidVoiceId(voice)) {
    return NextResponse.json({ error: "Giọng không hợp lệ" }, { status: 400 });
  }
  // text tùy chỉnh (nghe thử lồng tiếng theo từng câu trong preview)
  const customText =
    req.nextUrl.searchParams.get("text")?.trim().slice(0, MAX_PREVIEW_TEXT) || null;
  if (customText && !allowsCustomText(voice)) {
    return NextResponse.json(
      { error: "Nghe thử theo câu chỉ hỗ trợ giọng thường / Google Cloud" },
      { status: 400 },
    );
  }

  const cacheKey = customText ? `${voice}:${customText}` : voice;
  const hit = cache.get(cacheKey);
  if (hit) {
    return new NextResponse(new Uint8Array(hit.body), {
      headers: { "content-type": hit.type, "cache-control": "private, max-age=86400" },
    });
  }

  // Chỉ giới hạn khi TRƯỢT cache (tổng hợp thật mới tốn tiền) — cache hit ở trên không tính.
  const rl = await rateLimit("tts-preview", callerId(req, session.user.id), 30, 60);
  if (!rl.ok) return tooManyRequests(rl.retryAfterSec);

  try {
    let body: Buffer;
    let type = "audio/mpeg";
    const gemini = geminiVoiceName(voice);
    const eleven = elevenVoiceId(voice);
    const gcloud = gcloudVoiceName(voice);
    if (gemini) {
      body = await synthesizeGeminiSample(gemini);
      type = "audio/wav";
    } else if (eleven) {
      body = await synthesizeElevenSample(eleven);
    } else if (gcloud) {
      body = await synthesizeGCloud(gcloud, customText ?? VI_SAMPLE);
    } else {
      body = await synthesizeEdge(
        voice,
        customText ?? (voice.startsWith("vi-") ? VI_SAMPLE : EN_SAMPLE),
      );
    }

    // chặn cache phình vô hạn khi nghe thử nhiều câu
    if (cache.size >= MAX_CACHE_ENTRIES) {
      cache.delete(cache.keys().next().value as string);
    }
    cache.set(cacheKey, { body, type });
    return new NextResponse(new Uint8Array(body), {
      headers: { "content-type": type, "cache-control": "private, max-age=86400" },
    });
  } catch (err) {
    return NextResponse.json(
      { error: `Không sinh được mẫu giọng: ${err instanceof Error ? err.message : err}` },
      { status: 502 },
    );
  }
}
