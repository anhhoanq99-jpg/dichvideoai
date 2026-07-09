/**
 * Dev smoke test — full loop: DB insert → credits ledger → BullMQ enqueue
 * → worker processes → job row status "done". Cleans up after itself.
 * Run: tsx src/dev/smoke.ts (worker must be running in another terminal)
 */
import { config } from "dotenv";
config();
config({ path: "../../.env" });

import { Queue } from "bullmq";
import IORedis from "ioredis";
import { eq, sum } from "drizzle-orm";
import {
  applyCreditDelta,
  createDb,
  creditLedger,
  jobs,
  user,
  videos,
} from "@dichvideo/db";
import { QUEUES, SIGNUP_TRIAL_CREDITS, type JobPayload } from "@dichvideo/shared";

const db = createDb();
const connection = new IORedis(process.env.REDIS_URL ?? "", {
  maxRetriesPerRequest: null,
});
const queue = new Queue<JobPayload>(QUEUES.pipeline, { connection });

async function main() {
  const runId = Date.now();
  const userId = `smoke-user-${runId}`;
  let failed = false;

  try {
    // 1. user + trial credits via ledger
    await db.insert(user).values({
      id: userId,
      name: "Smoke Test",
      email: `smoke-${runId}@test.local`,
    });
    const entry = await applyCreditDelta(db, {
      userId,
      delta: SIGNUP_TRIAL_CREDITS,
      reason: "signup_trial",
    });
    console.log(`[1] ledger grant OK — balanceAfter=${entry.balanceAfter}`);

    // 2. video + job rows
    const [video] = await db
      .insert(videos)
      .values({ userId, originalName: "smoke.mp4", status: "uploaded" })
      .returning();
    const [job] = await db
      .insert(jobs)
      .values({ videoId: video.id, userId, type: "probe", params: {} })
      .returning();

    // 3. enqueue
    await queue.add("probe", {
      jobId: job.id,
      videoId: video.id,
      userId,
      params: {},
    });
    console.log(`[2] enqueued probe job ${job.id}`);

    // 4. poll until worker marks done
    const deadline = Date.now() + 30_000;
    let status = "queued";
    while (Date.now() < deadline) {
      const [row] = await db
        .select({ status: jobs.status })
        .from(jobs)
        .where(eq(jobs.id, job.id));
      status = row.status;
      if (status === "done" || status === "failed") break;
      await new Promise((r) => setTimeout(r, 1500));
    }
    if (status !== "done") throw new Error(`job status = ${status} (expected done)`);
    console.log(`[3] worker processed job — status=done`);

    // 5. ledger invariant
    const [{ balance }] = await db
      .select({ balance: user.creditBalance })
      .from(user)
      .where(eq(user.id, userId));
    const [{ total }] = await db
      .select({ total: sum(creditLedger.delta) })
      .from(creditLedger)
      .where(eq(creditLedger.userId, userId));
    if (Number(total) !== balance) {
      throw new Error(`ledger invariant BROKEN: balance=${balance} sum=${total}`);
    }
    console.log(`[4] ledger invariant OK — balance=${balance} == SUM(delta)=${total}`);
    console.log("SMOKE TEST PASSED");
  } catch (err) {
    failed = true;
    console.error("SMOKE TEST FAILED:", err);
  } finally {
    // cleanup — user cascade-deletes videos/jobs/ledger
    await db.delete(user).where(eq(user.id, userId));
    await queue.close();
    await connection.quit();
    process.exit(failed ? 1 : 0);
  }
}

void main();
