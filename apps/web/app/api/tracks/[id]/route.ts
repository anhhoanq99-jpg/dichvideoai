import { NextRequest, NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { subtitleTracks, videos } from "@dichvideo/db";
import { db } from "@/lib/db";
import { getSession } from "@/lib/session";

const segmentSchema = z.object({
  i: z.number().int().min(0),
  startMs: z.number().int().min(0),
  endMs: z.number().int().min(0),
  text: z.string().max(2000),
  box: z
    .object({
      x: z.number().min(0).max(1),
      y: z.number().min(0).max(1),
      w: z.number().min(0).max(1),
      h: z.number().min(0).max(1),
    })
    .optional(),
});

const patchSchema = z.object({
  version: z.number().int().min(1),
  segments: z.array(segmentSchema).max(10_000),
});

/** Track row joined with owner check via parent video. */
async function getOwnTrack(trackId: string, userId: string) {
  const [row] = await db
    .select({ track: subtitleTracks })
    .from(subtitleTracks)
    .innerJoin(videos, eq(subtitleTracks.videoId, videos.id))
    .where(and(eq(subtitleTracks.id, trackId), eq(videos.userId, userId)));
  return row?.track ?? null;
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });
  }
  const { id } = await params;
  const track = await getOwnTrack(id, session.user.id);
  if (!track) {
    return NextResponse.json({ error: "Không tìm thấy" }, { status: 404 });
  }
  return NextResponse.json(track);
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });
  }
  const { id } = await params;
  const track = await getOwnTrack(id, session.user.id);
  if (!track) {
    return NextResponse.json({ error: "Không tìm thấy" }, { status: 404 });
  }

  const body = patchSchema.safeParse(await req.json());
  if (!body.success) {
    return NextResponse.json({ error: "Dữ liệu không hợp lệ" }, { status: 400 });
  }

  // optimistic concurrency: stale client must refetch
  if (body.data.version !== track.version) {
    return NextResponse.json(
      { error: "Phiên bản đã thay đổi, hãy tải lại trang", staleVersion: true },
      { status: 409 },
    );
  }

  const [updated] = await db
    .update(subtitleTracks)
    .set({
      segments: body.data.segments,
      version: track.version + 1,
      updatedAt: new Date(),
    })
    .where(
      and(eq(subtitleTracks.id, track.id), eq(subtitleTracks.version, track.version)),
    )
    .returning({ version: subtitleTracks.version });

  if (!updated) {
    return NextResponse.json(
      { error: "Phiên bản đã thay đổi, hãy tải lại trang", staleVersion: true },
      { status: 409 },
    );
  }
  return NextResponse.json({ ok: true, version: updated.version });
}
