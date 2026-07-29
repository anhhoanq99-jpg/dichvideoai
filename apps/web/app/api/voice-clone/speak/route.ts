import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { hasWideTtsQuota, isValidVoiceId } from "@dichvideo/shared";
import { getSession } from "@/lib/session";
import { synthesizeVoice } from "@/lib/tts-web";
import { jsonError } from "@/lib/api-helpers";
import { callerId, rateLimit, tooManyRequests } from "@/lib/rate-limit";

export const maxDuration = 60;

const Body = z.object({
  /** id giọng trong catalog (edge/gcloud/eleven/gemini) */
  voiceId: z.string().min(1),
  text: z.string().trim().min(1, "Chưa nhập văn bản").max(2000, "Tối đa 2.000 ký tự"),
});

/** POST /api/voice-clone/speak — đọc văn bản bằng giọng đã chọn, trả về audio. */
export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return jsonError("Chưa đăng nhập", 401);

  const rl = await rateLimit("voice-speak", callerId(req, session.user.id), 15, 60);
  if (!rl.ok) return tooManyRequests(rl.retryAfterSec);

  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return jsonError(parsed.error.issues[0]?.message ?? "Dữ liệu không hợp lệ", 400);
  }
  const { voiceId, text } = parsed.data;

  try {
    if (!isValidVoiceId(voiceId)) return jsonError("Giọng không hợp lệ", 400);
    /**
     * Chặn ElevenLabs/Gemini ở công cụ đọc thử: hai nguồn này tính tiền theo ký
     * tự mà route không trừ xu, nên trước đây ai đăng ký một tài khoản cũng đọc
     * được 2.000 ký tự mỗi lượt, 15 lượt/phút, vô hạn — tiền thật của mình.
     * Cùng tiêu chí với /api/tts-preview.
     */
    if (!hasWideTtsQuota(voiceId)) {
      return jsonError(
        "Giọng cao cấp chỉ dùng được khi lồng tiếng video (có tính xu). " +
          "Ở đây hãy chọn giọng Cơ bản, SubdubAI, Vie hoặc Ko.",
        403,
      );
    }
    const { body, type } = await synthesizeVoice(voiceId, text);
    return audio(body, type);
  } catch (err) {
    return jsonError(
      `Không tạo được giọng nói: ${err instanceof Error ? err.message : err}`,
      502,
    );
  }
}

function audio(body: Buffer, type: string): NextResponse {
  return new NextResponse(new Uint8Array(body), {
    headers: {
      "content-type": type,
      "content-disposition": 'inline; filename="giong-noi.mp3"',
      "cache-control": "no-store",
    },
  });
}
