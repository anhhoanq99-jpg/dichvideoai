/** Credits granted on first sign-in. Placeholder — calibrate with real cost data in Phase 6. */
export const SIGNUP_TRIAL_CREDITS = 50;

/** Trial limit: max video duration processable per job for users who never topped up. */
export const TRIAL_MAX_VIDEO_MINUTES = 5;

export const CREDIT_REASONS = [
  "signup_trial",
  "topup",
  "job_charge",
  "job_refund",
  "admin_adjust",
] as const;

export type CreditReason = (typeof CREDIT_REASONS)[number];
