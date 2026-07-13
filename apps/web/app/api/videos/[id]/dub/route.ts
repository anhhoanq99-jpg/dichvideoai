import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { isValidVoiceId } from "@dichvideo/shared";
import {
  createPipelineJob,
  findVideoTrack,
  jsonError,
  parseJsonBody,
  requireOwnVideo,
} from "@/lib/api-helpers";

const schema = z.object({
  trackId: z.string().uuid(),
  voice: z.string().refine(isValidVoiceId, "Giọng không hợp lệ"),
  speed: z.number().min(0.8).max(1.3).default(1),
  aiVolume: z.number().int().min(0).max(200).default(100),
  bgVolume: z.number().int().min(0).max(100).default(20),
  origVoiceVolume: z.number().int().min(0).max(100).optional(),
});

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireOwnVideo(params);
  if (auth.response) return auth.response;
  const { session, video } = auth;
  if (!video.durationSec) return jsonError("Video chưa xử lý xong", 409);

  const body = await parseJsonBody(req, schema);
  if (body.response) return body.response;

  const track = await findVideoTrack(body.data.trackId, video.id);
  if (!track) return jsonError("Track phụ đề không hợp lệ", 400);

  const job = await createPipelineJob("dub", video.id, session.user.id, body.data);
  return NextResponse.json({ ok: true, jobId: job.id });
}
