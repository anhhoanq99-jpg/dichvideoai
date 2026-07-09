import { NextRequest } from "next/server";
import { and, eq } from "drizzle-orm";
import { jobs } from "@dichvideo/db";
import { db } from "@/lib/db";
import { getSession } from "@/lib/session";

export const maxDuration = 300;

/**
 * SSE job progress: polls the job row server-side every 1.5s and pushes
 * events to the client. (Redis pub/sub upgrade possible later — the job row
 * is already updated by the worker, so DB-poll SSE keeps it simple and
 * works identically in dev and on Vercel.)
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSession();
  if (!session) return new Response("Unauthorized", { status: 401 });

  const { id } = await params;
  const [exists] = await db
    .select({ id: jobs.id })
    .from(jobs)
    .where(and(eq(jobs.id, id), eq(jobs.userId, session.user.id)));
  if (!exists) return new Response("Not found", { status: 404 });

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (data: unknown) =>
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));

      let closed = false;
      req.signal.addEventListener("abort", () => {
        closed = true;
      });

      const startedAt = Date.now();
      while (!closed && Date.now() - startedAt < (maxDuration - 10) * 1000) {
        const [job] = await db
          .select({
            status: jobs.status,
            progress: jobs.progress,
            error: jobs.error,
            result: jobs.result,
          })
          .from(jobs)
          .where(eq(jobs.id, id));
        if (!job) break;
        send(job);
        if (job.status === "done" || job.status === "failed" || job.status === "cancelled") {
          break;
        }
        await new Promise((r) => setTimeout(r, 1500));
      }
      controller.close();
    },
  });

  return new Response(stream, {
    headers: {
      "content-type": "text/event-stream",
      "cache-control": "no-cache, no-transform",
      connection: "keep-alive",
    },
  });
}
