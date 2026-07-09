import { and, desc, eq } from "drizzle-orm";
import {
  applyCreditDelta,
  creditLedger,
  jobs,
  subtitleTracks,
  videos,
  type Db,
} from "@dichvideo/db";
import {
  estimateJobCredits,
  geminiVoiceName,
  type JobPayload,
  type JobType,
} from "@dichvideo/shared";
import { logger } from "../logger";

async function ledgerEntry(db: Db, jobId: string, reason: "job_charge" | "job_refund") {
  const [row] = await db
    .select({ id: creditLedger.id, delta: creditLedger.delta })
    .from(creditLedger)
    .where(
      and(
        eq(creditLedger.refType, "job"),
        eq(creditLedger.refId, jobId),
        eq(creditLedger.reason, reason),
      ),
    );
  return row ?? null;
}

/**
 * Trừ credit khi job bắt đầu. Idempotent theo jobId — BullMQ retry không trừ lặp.
 * Ném InsufficientCreditsError nếu thiếu → job fail với thông báo rõ ràng.
 */
export async function chargeJobStart(db: Db, payload: JobPayload, type: JobType) {
  if (await ledgerEntry(db, payload.jobId, "job_charge")) return; // retry attempt — đã trừ rồi

  const [video] = await db
    .select({ durationSec: videos.durationSec })
    .from(videos)
    .where(eq(videos.id, payload.videoId));

  const lines = type === "translate" ? await countSegments(db, payload.videoId) : 0;

  const credits = estimateJobCredits(type, {
    durationSec: video?.durationSec,
    lines,
    premiumVoice:
      type === "dub" && geminiVoiceName(String(payload.params.voice ?? "")) !== null,
  });
  if (credits <= 0) return;

  await applyCreditDelta(db, {
    userId: payload.userId,
    delta: -credits,
    reason: "job_charge",
    refType: "job",
    refId: payload.jobId,
  });
  await db
    .update(jobs)
    .set({ creditsCharged: credits })
    .where(eq(jobs.id, payload.jobId));
  logger.info({ jobId: payload.jobId, type, credits }, "credits charged");
}

async function countSegments(db: Db, videoId: string): Promise<number> {
  const [track] = await db
    .select({ segments: subtitleTracks.segments })
    .from(subtitleTracks)
    .where(
      and(eq(subtitleTracks.videoId, videoId), eq(subtitleTracks.kind, "original")),
    )
    .orderBy(desc(subtitleTracks.createdAt))
    .limit(1);
  return Array.isArray(track?.segments) ? track.segments.length : 0;
}

/** Hoàn credit khi job fail hẳn (hết lượt retry). Idempotent. */
export async function refundJobOnFinalFailure(db: Db, jobId: string, userId: string) {
  const charge = await ledgerEntry(db, jobId, "job_charge");
  if (!charge || charge.delta >= 0) return;
  if (await ledgerEntry(db, jobId, "job_refund")) return; // đã hoàn rồi

  await applyCreditDelta(db, {
    userId,
    delta: -charge.delta,
    reason: "job_refund",
    refType: "job",
    refId: jobId,
  });
  logger.info({ jobId, credits: -charge.delta }, "credits refunded");
}
