import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { EXTRACT_METHODS } from "@dichvideo/shared";
import {
  createPipelineJob,
  jsonError,
  parseJsonBody,
  requireOwnVideo,
} from "@/lib/api-helpers";
import { callerId, rateLimit, tooManyRequests } from "@/lib/rate-limit";

const schema = z.object({
  method: z.enum(EXTRACT_METHODS),
  sourceLang: z.string().max(10).optional(),
});

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireOwnVideo(params);
  if (auth.response) return auth.response;

  // route tao job = ton CPU worker + tien API; chan spam/script
  const rl = await rateLimit("job-extract", callerId(req, auth.session.user.id), 10, 60);
  if (!rl.ok) return tooManyRequests(rl.retryAfterSec);
  const { session, video } = auth;
  if (video.status !== "uploaded" && video.status !== "ready") {
    return jsonError("Video chưa sẵn sàng để trích xuất (đang tải lên hoặc đang xử lý)", 409);
  }

  const body = await parseJsonBody(req, schema);
  if (body.response) return body.response;

  const jobParams = { sourceLang: body.data.sourceLang ?? null };
  const job = await createPipelineJob(
    body.data.method,
    video.id,
    session.user.id,
    jobParams,
  );
  return NextResponse.json({ ok: true, jobId: job.id });
}
