import { z } from "zod";

/**
 * Separate schemas per deploy target — each process validates only what it uses.
 * Import and call once at boot; throws with a readable message if anything is missing.
 */

const dbEnv = {
  DATABASE_URL: z.string().min(1),
};

const redisEnv = {
  REDIS_URL: z.string().min(1),
};

export const webEnvSchema = z.object({
  ...dbEnv,
  ...redisEnv,
  BETTER_AUTH_SECRET: z.string().min(32),
  BETTER_AUTH_URL: z.string().url(),
  GOOGLE_CLIENT_ID: z.string().min(1),
  GOOGLE_CLIENT_SECRET: z.string().min(1),
  // R2 + AI keys become required in Phase 2; optional now so Phase 1 boots without them.
  R2_ACCOUNT_ID: z.string().optional(),
  R2_ACCESS_KEY_ID: z.string().optional(),
  R2_SECRET_ACCESS_KEY: z.string().optional(),
  R2_BUCKET: z.string().optional(),
});

export const workerEnvSchema = z.object({
  ...dbEnv,
  ...redisEnv,
  GROQ_API_KEY: z.string().optional(),
  GEMINI_API_KEY: z.string().optional(),
  R2_ACCOUNT_ID: z.string().optional(),
  R2_ACCESS_KEY_ID: z.string().optional(),
  R2_SECRET_ACCESS_KEY: z.string().optional(),
  R2_BUCKET: z.string().optional(),
  WORKER_HEALTH_PORT: z.coerce.number().default(8787),
  FFMPEG_DIR: z.string().optional(),
});

export type WebEnv = z.infer<typeof webEnvSchema>;
export type WorkerEnv = z.infer<typeof workerEnvSchema>;

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
