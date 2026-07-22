import { eq } from "drizzle-orm";
import type { CreditReason } from "@dichvideo/shared";
import type { Db } from "./index";
import { creditLedger, user } from "./schema";

export class InsufficientCreditsError extends Error {
  constructor(
    public readonly needed: number,
    public readonly available: number,
  ) {
    super(`Không đủ credits: cần ${needed}, hiện có ${available}`);
    this.name = "InsufficientCreditsError";
  }
}

export interface CreditDelta {
  userId: string;
  /** positive = top-up/refund, negative = charge */
  delta: number;
  reason: CreditReason;
  refType?: string;
  refId?: string;
}

/**
 * The ONLY way to change a balance. Locks the user row, appends a ledger row and
 * updates the cached balance in one transaction so the invariant
 * `user.creditBalance == SUM(credit_ledger.delta)` always holds.
 *
 * Idempotent whenever `refType`+`refId` are given: the ledger row goes in FIRST,
 * guarded by `credit_ledger_ref_uidx` UNIQUE (ref_type, ref_id, reason). If that
 * row already exists the insert is skipped, the balance is left alone and this
 * returns `null`.
 *
 * Order matters. Checking for a duplicate with a SELECT before the transaction
 * loses the race: SePay retries a webhook on timeout, both deliveries see "no
 * row yet", and the user gets credited twice for one bank transfer. Letting the
 * DB constraint decide is the only version that holds under concurrency.
 *
 * `reason` is part of the key on purpose — a job writes both `job_charge` and
 * `job_refund` under the same (refType="job", refId=jobId), and those two must
 * not collide with each other.
 */
export async function applyCreditDelta(db: Db, input: CreditDelta) {
  return db.transaction(async (tx) => {
    const [current] = await tx
      .select({ balance: user.creditBalance })
      .from(user)
      .where(eq(user.id, input.userId))
      .for("update");

    if (!current) throw new Error(`User not found: ${input.userId}`);

    const balanceAfter = current.balance + input.delta;
    if (balanceAfter < 0) {
      throw new InsufficientCreditsError(-input.delta, current.balance);
    }

    const [entry] = await tx
      .insert(creditLedger)
      .values({
        userId: input.userId,
        delta: input.delta,
        reason: input.reason,
        refType: input.refType,
        refId: input.refId,
        balanceAfter,
      })
      .onConflictDoNothing()
      .returning();

    // đã có dòng y hệt → lần gọi trùng, không đụng vào số dư
    if (!entry) return null;

    await tx
      .update(user)
      .set({ creditBalance: balanceAfter, updatedAt: new Date() })
      .where(eq(user.id, input.userId));

    return entry;
  });
}
