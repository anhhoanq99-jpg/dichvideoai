import { NextResponse, type NextRequest } from "next/server";
import IORedis from "ioredis";

/**
 * Rate-limit cho các API tốn tiền/băng thông (TTS, dịch, import, upload).
 * Cửa sổ cố định trên Redis (Upstash) — atomic bằng Lua (INCR + EXPIRE lần đầu).
 * FAIL-OPEN: Redis lỗi → cho qua, KHÔNG bao giờ để rate-limit làm sập request thật.
 */

declare global {
  var __rateLimitRedis: IORedis | undefined;
}

function getRedis(): IORedis | null {
  const url = process.env.REDIS_URL;
  if (!url) return null;
  // Lazy singleton — sống qua hot-reload dev, không rò kết nối.
  globalThis.__rateLimitRedis ??= new IORedis(url, {
    maxRetriesPerRequest: 1,
    enableOfflineQueue: false,
    lazyConnect: false,
  });
  return globalThis.__rateLimitRedis;
}

// INCR key; nếu là lần đầu (=1) thì đặt hạn cửa sổ. Trả [count, ttl-giây].
const SCRIPT = `
local c = redis.call('INCR', KEYS[1])
if c == 1 then redis.call('EXPIRE', KEYS[1], ARGV[1]) end
return {c, redis.call('TTL', KEYS[1])}
`;

export type RateLimitResult = { ok: true } | { ok: false; retryAfterSec: number };

/**
 * @param bucket   tên nhóm (mỗi endpoint 1 bucket riêng), vd "tts-preview"
 * @param id       định danh người gọi (ưu tiên userId; fallback IP)
 * @param limit    số request tối đa trong cửa sổ
 * @param windowSec độ dài cửa sổ (giây)
 */
export async function rateLimit(
  bucket: string,
  id: string,
  limit: number,
  windowSec: number,
): Promise<RateLimitResult> {
  const redis = getRedis();
  if (!redis) return { ok: true }; // không cấu hình Redis → không chặn
  try {
    const key = `rl:${bucket}:${id}`;
    const [count, ttl] = (await redis.eval(SCRIPT, 1, key, String(windowSec))) as [
      number,
      number,
    ];
    if (count > limit) {
      return { ok: false, retryAfterSec: ttl > 0 ? ttl : windowSec };
    }
    return { ok: true };
  } catch {
    return { ok: true }; // Redis trục trặc → fail-open
  }
}

/** Định danh người gọi: ưu tiên userId đã đăng nhập, nếu không thì IP. */
export function callerId(req: NextRequest, userId?: string): string {
  if (userId) return `u:${userId}`;
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    req.headers.get("x-real-ip")?.trim() ??
    "local";
  return `ip:${ip}`;
}

/** Response 429 chuẩn kèm Retry-After (giây). */
export function tooManyRequests(retryAfterSec: number, message?: string): NextResponse {
  return NextResponse.json(
    {
      error:
        message ??
        `Bạn thao tác hơi nhanh — thử lại sau ${retryAfterSec} giây nhé.`,
    },
    { status: 429, headers: { "retry-after": String(retryAfterSec) } },
  );
}
