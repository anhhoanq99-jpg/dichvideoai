import { NextResponse, type NextRequest } from "next/server";
import { and, eq } from "drizzle-orm";
import type { z } from "zod";
import { jobs, subtitleTracks } from "@dichvideo/db";
import type { JobType } from "@dichvideo/shared";
import { db } from "@/lib/db";
import { enqueuePipelineJob } from "@/lib/queue";
import { getSession } from "@/lib/session";
import { isAdminEmail } from "@/lib/admin";
import { getOwnVideo } from "@/lib/video-access";

export function jsonError(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

/**
 * Guard cho route chỉ dành cho admin. Trả về `response` khi bị chặn —
 * dùng chung để 3 route admin không mỗi nơi viết một kiểu (dễ sót một chỗ).
 */
export async function requireAdmin(): Promise<
  | { response: NextResponse; session?: never }
  | { response?: never; session: NonNullable<Awaited<ReturnType<typeof getSession>>> }
> {
  const session = await getSession();
  if (!session) return { response: jsonError("Chưa đăng nhập", 401) };
  if (!isAdminEmail(session.user.email)) {
    return { response: jsonError("Chỉ dành cho admin", 403) };
  }
  return { session };
}

type OwnVideoResult =
  | { response: NextResponse; session?: never; video?: never }
  | {
      response?: never;
      session: NonNullable<Awaited<ReturnType<typeof getSession>>>;
      video: NonNullable<Awaited<ReturnType<typeof getOwnVideo>>>;
    };

/**
 * Guard chung cho mọi route /api/videos/[id]/*: bắt đăng nhập và
 * chỉ cho chủ video thao tác. Trả về `response` khi bị chặn.
 */
export async function requireOwnVideo(
  params: Promise<{ id: string }>,
): Promise<OwnVideoResult> {
  const session = await getSession();
  if (!session) return { response: jsonError("Chưa đăng nhập", 401) };
  const { id } = await params;
  const video = await getOwnVideo(id, session.user.id);
  if (!video) return { response: jsonError("Không tìm thấy video", 404) };
  return { session, video };
}

/** Parse + validate JSON body theo schema; body hỏng hay sai schema → 400. */
export async function parseJsonBody<S extends z.ZodType>(
  req: NextRequest,
  schema: S,
): Promise<
  { data: z.output<S>; response?: never } | { data?: never; response: NextResponse }
> {
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return { response: jsonError("Dữ liệu không hợp lệ", 400) };
  return { data: parsed.data };
}

/** Track phụ đề chỉ hợp lệ khi thuộc đúng video (chặn dùng track chéo video). */
export async function findVideoTrack(trackId: string, videoId: string) {
  const [track] = await db
    .select({ id: subtitleTracks.id })
    .from(subtitleTracks)
    .where(and(eq(subtitleTracks.id, trackId), eq(subtitleTracks.videoId, videoId)));
  return track ?? null;
}

/** Ghi bản ghi job vào DB rồi đẩy vào hàng đợi worker — một bước cho mọi route. */
export async function createPipelineJob(
  type: JobType,
  videoId: string,
  userId: string,
  params: Record<string, unknown>,
) {
  const [job] = await db
    .insert(jobs)
    .values({ videoId, userId, type, params })
    .returning();
  await enqueuePipelineJob(type, { jobId: job.id, videoId, userId, params });
  return job;
}
