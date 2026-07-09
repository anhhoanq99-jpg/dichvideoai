import { createReadStream } from "node:fs";
import path from "node:path";
import Groq from "groq-sdk";
import { extractAudio } from "../lib/ffmpeg";
import { PRICING } from "../lib/usage";
import {
  normalizeSegments,
  type ExtractInput,
  type ExtractResult,
  type SubtitleExtractor,
} from "./types";

interface WhisperSegment {
  start: number;
  end: number;
  text: string;
}

export class GroqWhisperExtractor implements SubtitleExtractor {
  readonly id = "groq-whisper" as const;

  async extract(
    input: ExtractInput,
    onProgress: (pct: number) => void,
  ): Promise<ExtractResult> {
    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) throw new Error("GROQ_API_KEY chưa được cấu hình");
    const groq = new Groq({ apiKey });

    const audioPath = path.join(path.dirname(input.localPath), "audio.flac");
    await extractAudio(input.localPath, audioPath);
    onProgress(30);

    const res = await groq.audio.transcriptions.create({
      file: createReadStream(audioPath),
      model: "whisper-large-v3-turbo",
      response_format: "verbose_json",
      ...(input.sourceLang ? { language: input.sourceLang } : {}),
    });
    onProgress(85);

    const verbose = res as unknown as {
      language?: string;
      segments?: WhisperSegment[];
    };
    const segments = normalizeSegments(
      (verbose.segments ?? []).map((s) => ({
        startMs: Math.round(s.start * 1000),
        endMs: Math.round(s.end * 1000),
        text: s.text,
      })),
    );

    return {
      segments,
      lang: verbose.language ?? input.sourceLang ?? "unknown",
      usage: [
        {
          provider: "groq",
          metric: "audio_sec",
          quantity: input.durationSec,
          costUsdMicros: input.durationSec * PRICING.groqWhisperPerAudioSec,
        },
      ],
    };
  }
}
