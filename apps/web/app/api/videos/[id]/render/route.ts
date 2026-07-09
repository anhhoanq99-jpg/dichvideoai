import { NextRequest, NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { jobs, subtitleTracks } from "@dichvideo/db";
import {
  COVER_MODES,
  MAX_COVER_REGIONS,
  RENDER_FONTS,
  STYLE_PRESETS,
} from "@dichvideo/shared";
import { db } from "@/lib/db";
import { enqueuePipelineJob } from "@/lib/queue";
import { getSession } from "@/lib/session";
import { getOwnVideo } from "@/lib/video-access";

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
  subBox: regionSchema.optional(),
  logo: z
    .object({
      text: z.string().min(1).max(60),
      position: z.enum(["tl", "tr", "bl", "br"]),
      fontSize: z.number().int().min(12).max(96),
      color: z.string().regex(HEX),
      opacity: z.number().int().min(0).max(100),
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
});

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });
  }
  const { id } = await params;
  const video = await getOwnVideo(id, session.user.id);
  if (!video) {
    return NextResponse.json({ error: "Không tìm thấy video" }, { status: 404 });
  }
  if (!video.durationSec) {
    return NextResponse.json({ error: "Video chưa xử lý xong" }, { status: 409 });
  }

  const body = schema.safeParse(await req.json());
  if (!body.success) {
    return NextResponse.json({ error: "Dữ liệu không hợp lệ" }, { status: 400 });
  }
  if (body.data.coverMode !== "none" && !body.data.regions?.length) {
    return NextResponse.json(
      { error: "Khoanh ít nhất một vùng cần che trước" },
      { status: 400 },
    );
  }

  const [track] = await db
    .select({ id: subtitleTracks.id })
    .from(subtitleTracks)
    .where(
      and(
        eq(subtitleTracks.id, body.data.trackId),
        eq(subtitleTracks.videoId, video.id),
      ),
    );
  if (!track) {
    return NextResponse.json({ error: "Track phụ đề không hợp lệ" }, { status: 400 });
  }

  const [job] = await db
    .insert(jobs)
    .values({
      videoId: video.id,
      userId: session.user.id,
      type: "render",
      params: body.data,
    })
    .returning();

  await enqueuePipelineJob("render", {
    jobId: job.id,
    videoId: video.id,
    userId: session.user.id,
    params: body.data,
  });

  return NextResponse.json({ ok: true, jobId: job.id });
}
