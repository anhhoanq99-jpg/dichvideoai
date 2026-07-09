import { and, eq, isNull } from "drizzle-orm";
import { videos } from "@dichvideo/db";
import { db } from "@/lib/db";

/** Fetch a video only if it belongs to the user (IDOR guard). */
export async function getOwnVideo(videoId: string, userId: string) {
  const [video] = await db
    .select()
    .from(videos)
    .where(
      and(eq(videos.id, videoId), eq(videos.userId, userId), isNull(videos.deletedAt)),
    );
  return video ?? null;
}
