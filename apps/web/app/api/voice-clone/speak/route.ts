import { NextResponse, type NextRequest } from "next/server";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { ELEVEN_VOICE_IDS } from "@dichvideo/shared";
import { clonedVoices } from "@dichvideo/db";
import { db } from "@/lib/db";
import { getSession } from "@/lib/session";
import { jsonError } from "@/lib/api-helpers";

export const maxDuration = 60;

const Body = z.object({
  /** "mine:<uuid bản ghi>" (giọng nhân bản) hoặc "eleven:<id>" (giọng có sẵn) */
  voiceId: z.string().min(1),
  text: z.string().trim().min(1, "Chưa nhập văn bản").max(2000, "Tối đa 2.000 ký tự"),
});

/** POST /api/voice-clone/speak — đọc văn bản bằng giọng đã chọn, trả về MP3. */
export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return jsonError("Chưa đăng nhập", 401);
  const apiKey = process.env.ELEVENLABS_API_KEY;
  if (!apiKey) return jsonError("Chưa cấu hình ELEVENLABS_API_KEY", 500);

  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return jsonError(parsed.error.issues[0]?.message ?? "Dữ liệu không hợp lệ", 400);
  }

  // dịch voiceId của app → voice_id thật của ElevenLabs
  let providerVoiceId: string | null = null;
  if (parsed.data.voiceId.startsWith("mine:")) {
    const [voice] = await db
      .select({ providerVoiceId: clonedVoices.providerVoiceId })
      .from(clonedVoices)
      .where(
        and(
          eq(clonedVoices.id, parsed.data.voiceId.slice("mine:".length)),
          eq(clonedVoices.userId, session.user.id),
        ),
      );
    providerVoiceId = voice?.providerVoiceId ?? null;
  } else if (ELEVEN_VOICE_IDS.has(parsed.data.voiceId)) {
    providerVoiceId = parsed.data.voiceId.slice("eleven:".length);
  }
  if (!providerVoiceId) return jsonError("Giọng không hợp lệ", 400);

  const res = await fetch(
    `https://api.elevenlabs.io/v1/text-to-speech/${providerVoiceId}?output_format=mp3_44100_128`,
    {
      method: "POST",
      headers: { "xi-api-key": apiKey, "content-type": "application/json" },
      body: JSON.stringify({
        text: parsed.data.text,
        model_id: "eleven_multilingual_v2",
      }),
    },
  );
  if (!res.ok) {
    const detail = await res.text();
    if (/quota|character/i.test(detail)) {
      return jsonError("Hết hạn mức ElevenLabs tháng này — thử lại sau hoặc nâng gói", 429);
    }
    return jsonError(`ElevenLabs từ chối: ${detail.slice(0, 200)}`, 502);
  }

  const audio = await res.arrayBuffer();
  return new NextResponse(audio, {
    headers: {
      "content-type": "audio/mpeg",
      "content-disposition": 'inline; filename="giong-noi.mp3"',
      "cache-control": "no-store",
    },
  });
}
