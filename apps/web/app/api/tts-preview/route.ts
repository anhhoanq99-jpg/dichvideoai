import { mkdtemp, readFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { NextRequest, NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";
import { MsEdgeTTS, OUTPUT_FORMAT } from "msedge-tts";
import {
  EDGE_VOICE_IDS,
  GEMINI_VOICE_IDS,
  geminiVoiceName,
  pcmToWav,
} from "@dichvideo/shared";
import { getSession } from "@/lib/session";

const VI_SAMPLE = "Xin chào! Đây là giọng đọc thử của mình, rất vui được đồng hành cùng video của bạn.";
const EN_SAMPLE = "Hello! This is a short preview of my voice.";

/** Cache mẫu giọng trong bộ nhớ — mỗi giọng chỉ sinh 1 lần. */
declare global {
  var __ttsPreviewCache: Map<string, { body: Buffer; type: string }> | undefined;
}
const cache = (globalThis.__ttsPreviewCache ??= new Map());

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });
  }
  const voice = req.nextUrl.searchParams.get("voice") ?? "";
  if (!EDGE_VOICE_IDS.has(voice) && !GEMINI_VOICE_IDS.has(voice)) {
    return NextResponse.json({ error: "Giọng không hợp lệ" }, { status: 400 });
  }

  const hit = cache.get(voice);
  if (hit) {
    return new NextResponse(new Uint8Array(hit.body), {
      headers: { "content-type": hit.type, "cache-control": "private, max-age=86400" },
    });
  }

  try {
    let body: Buffer;
    let type: string;
    const gemini = geminiVoiceName(voice);
    if (gemini) {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });
      const res = await ai.models.generateContent({
        model: process.env.GEMINI_TTS_MODEL ?? "gemini-2.5-flash-preview-tts",
        contents: VI_SAMPLE,
        config: {
          responseModalities: ["AUDIO"],
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: gemini } },
          },
        },
      });
      const data = res.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
      if (!data) throw new Error("Gemini TTS không trả về audio");
      body = pcmToWav(Buffer.from(data, "base64"));
      type = "audio/wav";
    } else {
      const tts = new MsEdgeTTS();
      await tts.setMetadata(voice, OUTPUT_FORMAT.AUDIO_24KHZ_48KBITRATE_MONO_MP3);
      const dir = await mkdtemp(path.join(os.tmpdir(), "tts-preview-"));
      try {
        const { audioFilePath } = await tts.toFile(
          dir,
          voice.startsWith("vi-") ? VI_SAMPLE : EN_SAMPLE,
        );
        body = await readFile(audioFilePath);
      } finally {
        await rm(dir, { recursive: true, force: true }).catch(() => {});
      }
      type = "audio/mpeg";
    }

    cache.set(voice, { body, type });
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
