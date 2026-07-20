import { z } from "zod";

/**
 * Validate env at boot; throws with a readable message if anything is missing.
 * (Next.js web validates lazily per-module, so only the worker uses a schema.)
 */
export const workerEnvSchema = z.object({
  DATABASE_URL: z.string().min(1),
  REDIS_URL: z.string().min(1),
  GROQ_API_KEY: z.string().optional(),
  GEMINI_API_KEY: z.string().optional(),
  /** Nhiều key Gemini phân tách bằng dấu phẩy — hết hạn mức key này tự sang key kế */
  GEMINI_API_KEYS: z.string().optional(),
  ELEVENLABS_API_KEY: z.string().optional(),
  GOOGLE_TTS_API_KEY: z.string().optional(),
  /** Viettel AI TTS — giọng Việt bản địa, free ~500k ký tự/ngày */
  VIETTEL_TTS_TOKEN: z.string().optional(),
  /** FPT.AI TTS — 7 giọng Việt đủ 3 miền */
  FPT_TTS_API_KEY: z.string().optional(),
  R2_ACCOUNT_ID: z.string().optional(),
  R2_ACCESS_KEY_ID: z.string().optional(),
  R2_SECRET_ACCESS_KEY: z.string().optional(),
  R2_BUCKET: z.string().optional(),
  WORKER_HEALTH_PORT: z.coerce.number().default(8787),
  FFMPEG_DIR: z.string().optional(),
});

export function loadEnv<T extends z.ZodType>(schema: T): z.infer<T> {
  const parsed = schema.safeParse(process.env);
  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((i) => `  - ${i.path.join(".")}: ${i.message}`)
    .join("\n");
    throw new Error(`Invalid environment variables:\n${issues}`);
  }
  return parsed.data;
}
