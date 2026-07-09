import { config } from "dotenv";
config({ path: "../../.env" });
import { desc, eq } from "drizzle-orm";
import { createDb, jobs } from "@dichvideo/db";

const db = createDb();
const rows = await db
  .select()
  .from(jobs)
  .where(eq(jobs.type, "render"))
  .orderBy(desc(jobs.createdAt))
  .limit(3);
for (const r of rows) {
  console.log("----", r.id, r.status, r.createdAt?.toISOString());
  console.log("params:", JSON.stringify(r.params));
  console.log("error:", r.error);
  console.log("result:", JSON.stringify(r.result));
}
process.exit(0);
