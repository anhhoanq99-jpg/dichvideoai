import { NextResponse, type NextRequest } from "next/server";
import { and, eq } from "drizzle-orm";
import { clonedVoices } from "@dichvideo/db";
import { db } from "@/lib/db";
import { getSession } from "@/lib/session";
import { jsonError } from "@/lib/api-helpers";

/** DELETE /api/voice-clone/voices/:id — xóa giọng nhân bản (cả phía ElevenLabs). */
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSession();
  if (!session) return jsonError("Chưa đăng nhập", 401);
  const { id } = await params;

  const [voice] = await db
    .select()
    .from(clonedVoices)
    .where(and(eq(clonedVoices.id, id), eq(clonedVoices.userId, session.user.id)));
  if (!voice) return jsonError("Không tìm thấy giọng", 404);

  // xóa phía provider trước — thất bại cũng vẫn xóa bản ghi (voice mồ côi vô hại)
  const apiKey = process.env.ELEVENLABS_API_KEY;
  if (apiKey) {
    await fetch(`https://api.elevenlabs.io/v1/voices/${voice.providerVoiceId}`, {
      method: "DELETE",
      headers: { "xi-api-key": apiKey },
    }).catch(() => null);
  }
  await db.delete(clonedVoices).where(eq(clonedVoices.id, id));

  return NextResponse.json({ ok: true });
}
