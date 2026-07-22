import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {
  COVER_MODES,
  SUB_EFFECT_IDS,
  MAX_COVER_REGIONS,
  RENDER_FONTS,
  STYLE_PRESETS,
  isValidVoiceId,
} from "@dichvideo/shared";
import {
  createPipelineJob,
  findVideoTrack,
  jsonError,
  parseJsonBody,
  requireOwnVideo,
} from "@/lib/api-helpers";
import { callerId, rateLimit, tooManyRequests } from "@/lib/rate-limit";

const HEX = /^#[0-9a-fA-F]{6}$/;

const regionSchema = z.object({
  x: z.number().min(0).max(1),
  y: z.number().min(0).max(1),
  w: z.number().min(0.01).max(1),
  h: z.number().min(0.01).max(1),
});

const schema = z.object({
  trackId: z.string().uuid(),
  styleId: z.enum(STYLE_PRESETS.map((p) => p.id) as [string, ...string[]]),
  aspect: z.enum(["keep", "16:9", "9:16", "1:1"]).default("keep"),
  coverMode: z.enum(COVER_MODES).default("none"),
  regions: z.array(regionSchema).max(MAX_COVER_REGIONS).optional(),
  blurStrength: z.number().int().min(1).max(10).optional(),
  subBox: regionSchema.optional(),
  logo: z
    .object({
      text: z.string().min(1).max(60),
      position: z.enum(["tl", "tr", "bl", "br"]),
      fontSize: z.number().int().min(12).max(96),
      color: z.string().regex(HEX),
      opacity: z.number().int().min(0).max(100),
      fx: z.number().min(0).max(1).optional(),
      fy: z.number().min(0).max(1).optional(),
    })
    .optional(),
  logoImage: z
    .object({
      r2Key: z.string().min(1).max(300),
      position: z.enum(["tl", "tr", "bl", "br"]),
      scalePct: z.number().int().min(3).max(60),
      opacity: z.number().int().min(0).max(100),
      fx: z.number().min(0).max(1).optional(),
      fy: z.number().min(0).max(1).optional(),
    })
    .optional(),
  // render xong tự lồng tiếng lên bản đã render (luồng "Xuất File" của studio)
  finish: z
    .object({
      dub: z.boolean().default(false),
      voice: z.string().refine(isValidVoiceId).optional(),
      speed: z.number().min(0.8).max(1.3).optional(),
      aiVolume: z.number().int().min(0).max(200).optional(),
      bgVolume: z.number().int().min(0).max(100).optional(),
      origVoiceVolume: z.number().int().min(0).max(100).optional(),
    })
    .optional(),
  // style overrides
  font: z.enum(RENDER_FONTS as unknown as [string, ...string[]]).optional(),
  fontSize: z.number().int().min(20).max(120).optional(),
  bold: z.boolean().optional(),
  primaryColor: z.string().regex(HEX).optional(),
  outlineColor: z.string().regex(HEX).optional(),
  boxed: z.boolean().optional(),
  boxColor: z.string().regex(HEX).optional(),
  boxOpacity: z.number().int().min(0).max(100).optional(),
  marginV: z.number().int().min(0).max(400).optional(),
  effect: z.enum(SUB_EFFECT_IDS).optional(),
  accentColor: z.string().regex(HEX).optional(),
});

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireOwnVideo(params);
  if (auth.response) return auth.response;

  // route tao job = ton CPU worker + tien API; chan spam/script
  const rl = await rateLimit("job-render", callerId(req, auth.session.user.id), 10, 60);
  if (!rl.ok) return tooManyRequests(rl.retryAfterSec);
  const { session, video } = auth;
  if (!video.durationSec) return jsonError("Video chưa xử lý xong", 409);

  const body = await parseJsonBody(req, schema);
  if (body.response) return body.response;
  if (body.data.coverMode !== "none" && !body.data.regions?.length) {
    return jsonError("Khoanh ít nhất một vùng cần che trước", 400);
  }
  // logo ảnh phải là file do chính user này upload
  if (
    body.data.logoImage &&
    !body.data.logoImage.r2Key.startsWith(`logos/${session.user.id}/`)
  ) {
    return jsonError("Logo không hợp lệ", 400);
  }

  const track = await findVideoTrack(body.data.trackId, video.id);
  if (!track) return jsonError("Track phụ đề không hợp lệ", 400);

  const job = await createPipelineJob("render", video.id, session.user.id, body.data);
  return NextResponse.json({ ok: true, jobId: job.id });
}
