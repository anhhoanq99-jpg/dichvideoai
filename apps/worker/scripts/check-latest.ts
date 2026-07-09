import { config } from "dotenv";
config({ path: "../../.env" });
import { desc } from "drizzle-orm";
import { createDb, jobs, subtitleTracks, videos } from "@dichvideo/db";

const db = createDb();

const js = await db.select().from(jobs).orderBy(desc(jobs.createdAt)).limit(10);
console.log("=== JOBS ===");
for (const r of js) {
  console.log(
    r.createdAt?.toISOString(),
    r.type,
    r.status,
    "video:", r.videoId.slice(0, 8),
    "error:", r.error ?? "-",
    "result:", JSON.stringify(r.result)?.slice(0, 200),
  );
}

const ts = await db
  .select()
  .from(subtitleTracks)
  .orderBy(desc(subtitleTracks.createdAt))
  .limit(6);
console.log("\n=== TRACKS ===");
for (const t of ts) {
  const segs = t.segments as { startMs: number; endMs: number; text: string }[];
  console.log(
    t.createdAt?.toISOString(),
    t.kind,
    t.lang,
    "video:", t.videoId.slice(0, 8),
    "segments:", segs.length,
  );
  for (const s of segs.slice(0, 3)) {
    console.log(`   [${s.startMs}..${s.endMs}]`, s.text.slice(0, 120));
  }
}

const vs = await db.select().from(videos).orderBy(desc(videos.createdAt)).limit(3);
console.log("\n=== VIDEOS ===");
for (const v of vs) {
  console.log(v.createdAt?.toISOString(), v.id.slice(0, 8), v.title, v.status, "dur:", v.durationSec);
}
process.exit(0);
