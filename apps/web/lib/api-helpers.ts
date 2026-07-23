import { NextResponse, type NextRequest } from "next/server";
import { and, eq } from "drizzle-orm";
import type { z } from "zod";
import { jobs, schema, subtitleTracks } from "@dichvideo/db";
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

/**
 * Chặn TRƯỚC khi tạo job nếu không đủ xu.
 *
 * Trước đây route cứ tạo job, worker mới phát hiện thiếu rồi cho job fail —
 * khách bấm "Xuất file" xong ngồi chờ để nhận về một job hỏng, đúng vào lúc họ
 * đang muốn trả tiền. Trả 402 kèm SỐ LIỆU (cần bao nhiêu, có bao nhiêu, thiếu
 * bao nhiêu) để giao diện mời nạp đúng số còn thiếu.
 *
 * Không thay thế việc trừ xu ở worker: giữa lúc kiểm tra và lúc worker chạy,
 * số dư vẫn có thể tụt vì job khác. Đây là lớp lọc sớm cho trải nghiệm, còn
 * chốt chặn thật vẫn nằm ở applyCreditDelta.
 */
export async function requireCredits(
  userId: string,
  needed: number,
): Promise<{ response?: NextResponse; balance: number }> {
  const [row] = await db
    .select({ balance: schema.user.creditBalance })
    .from(schema.user)
    .where(eq(schema.user.id, userId));
  const balance = row?.balance ?? 0;
  if (balance >= needed) return { balance };

  return {
    balance,
    response: NextResponse.json(
      {
        error: `Không đủ xu: cần ${needed.toLocaleString("vi-VN")}, bạn đang có ${balance.toLocaleString("vi-VN")}`,
        code: "INSUFFICIENT_CREDITS",
        needed,
        balance,
        shortfall: needed - balance,
      },
      { status: 402 },
    ),
  };
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

  /**
   * Ghi DB xong mới đẩy hàng đợi — nên nếu đẩy hỏng, dòng job đã nằm đó và
   * KẸT "queued" vĩnh viễn: giao diện cứ chờ một job không bao giờ chạy.
   * Phải hạ nó xuống "failed" rồi mới ném lỗi ra, để khách thấy trạng thái
   * đúng và bấm làm lại được.
   */
  try {
    await enqueuePipelineJob(type, { jobId: job.id, videoId, userId, params });
  } catch (err) {
    const detail = err instanceof Error ? err.message : String(err);
    await db
      .update(jobs)
      .set({ status: "failed", error: detail, finishedAt: new Date() })
      .where(eq(jobs.id, job.id))
      .catch(() => {
        // DB cũng hỏng nốt thì thôi — vẫn phải ném lỗi gốc lên trên
      });
    throw new Error(detail);
  }
  return job;
}
