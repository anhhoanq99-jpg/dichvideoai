import { NextResponse, type NextRequest } from "next/server";
import { desc, eq } from "drizzle-orm";
import { clonedVoices } from "@dichvideo/db";
import { db } from "@/lib/db";
import { getSession } from "@/lib/session";
import { jsonError } from "@/lib/api-helpers";

export const maxDuration = 60;

const MAX_CLONES_PER_USER = 3;
const MAX_SAMPLE_BYTES = 10 * 1024 * 1024; // 10MB — ElevenLabs nhận tối đa ~120s audio

/** GET /api/voice-clone/voices — danh sách giọng đã nhân bản của tôi. */
export async function GET() {
  const session = await getSession();
  if (!session) return jsonError("Chưa đăng nhập", 401);
  const voices = await db
    .select({
      id: clonedVoices.id,
      name: clonedVoices.name,
      createdAt: clonedVoices.createdAt,
    })
    .from(clonedVoices)
    .where(eq(clonedVoices.userId, session.user.id))
    .orderBy(desc(clonedVoices.createdAt));
  return NextResponse.json({ voices, max: MAX_CLONES_PER_USER });
}

/**
 * POST /api/voice-clone/voices — nhân bản giọng từ file mẫu (multipart: name, consent, file).
 * Gọi ElevenLabs Instant Voice Cloning; gói free của ElevenLabs KHÔNG hỗ trợ —
 * cần gói Starter trở lên, lỗi được dịch sang thông báo dễ hiểu.
 */
export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return jsonError("Chưa đăng nhập", 401);
  const apiKey = process.env.ELEVENLABS_API_KEY;
  if (!apiKey) return jsonError("Chưa cấu hình ELEVENLABS_API_KEY", 500);

  const existing = await db
    .select({ id: clonedVoices.id })
    .from(clonedVoices)
    .where(eq(clonedVoices.userId, session.user.id));
  if (existing.length >= MAX_CLONES_PER_USER) {
    return jsonError(`Tối đa ${MAX_CLONES_PER_USER} giọng nhân bản — xóa bớt giọng cũ để tạo mới`, 400);
  }

  const form = await req.formData().catch(() => null);
  const name = String(form?.get("name") ?? "").trim();
  const consent = form?.get("consent") === "true";
  const file = form?.get("file");
  if (!name || name.length > 60) return jsonError("Tên giọng 1–60 ký tự", 400);
  if (!consent) return jsonError("Bạn cần xác nhận có quyền sử dụng giọng nói này", 400);
  if (!(file instanceof File) || file.size === 0) return jsonError("Thiếu file âm thanh mẫu", 400);
  if (file.size > MAX_SAMPLE_BYTES) return jsonError("File mẫu tối đa 10MB (~120 giây)", 400);

  const upstream = new FormData();
  upstream.append("name", `dichvideo-${session.user.id.slice(0, 8)}-${name}`);
  upstream.append("files", file, file.name || "sample.mp3");

  const res = await fetch("https://api.elevenlabs.io/v1/voices/add", {
    method: "POST",
    headers: { "xi-api-key": apiKey },
    body: upstream,
  });
  if (!res.ok) {
    const detail = await res.text();
    // gói free bị chặn cloning → báo rõ thay vì ném JSON thô. ElevenLabs trả lỗi
    // dạng "missing the permission create_instant_voice_clone" / "unauthorized".
    if (
      /create_instant_voice_clone|instant_voice_cloning|missing.?permis|unauthorized|subscription|upgrade|not.?allowed/i.test(
        detail,
      )
    ) {
      return jsonError(
        "Gói ElevenLabs miễn phí KHÔNG hỗ trợ nhân bản giọng riêng — cần nâng lên gói Starter (~5$/tháng) tại elevenlabs.io. Trong lúc đó bạn vẫn dùng thoải mái hàng trăm giọng có sẵn (Google, Adam, giọng thường…) ở mục Đọc văn bản bên dưới.",
        402,
      );
    }
    return jsonError(`ElevenLabs từ chối: ${detail.slice(0, 200)}`, 502);
  }
  const data = (await res.json()) as { voice_id?: string };
  if (!data.voice_id) return jsonError("ElevenLabs không trả voice_id", 502);

  const [voice] = await db
    .insert(clonedVoices)
    .values({
      userId: session.user.id,
      provider: "elevenlabs",
      providerVoiceId: data.voice_id,
      name,
    })
    .returning({ id: clonedVoices.id, name: clonedVoices.name, createdAt: clonedVoices.createdAt });

  return NextResponse.json({ voice });
}
