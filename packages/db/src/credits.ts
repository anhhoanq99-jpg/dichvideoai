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
 * The ONLY way to change a balance. Locks the user row, updates the cached
 * balance and appends a ledger row in one transaction so the invariant
 * `user.creditBalance == SUM(credit_ledger.delta)` always holds.
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

    await tx
      .update(user)
      .set({ creditBalance: balanceAfter, updatedAt: new Date() })
      .where(eq(user.id, input.userId));

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
      .returning();

    return entry;
  });
}
