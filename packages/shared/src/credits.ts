/** Credits tặng khi đăng ký — đủ Việt hóa thử ~2 video ngắn. */
export const SIGNUP_TRIAL_CREDITS = 10_000;

/** Trial limit: max video duration processable per job for users who never topped up. */
export const TRIAL_MAX_VIDEO_MINUTES = 5;

/** Neo giá trị: 1 credit = 1 VND (100.000đ = 100.000 credits) — cùng thang đối thủ. */
export const VND_PER_CREDIT = 1;

/**
 * Đơn giá credit theo loại job — đặt theo mặt bằng thị trường
 * (đối thủ: OCR ~300/phút, dịch 5/dòng, lồng tiếng 500-700/phút).
 */
export const CREDIT_PRICING = {
  /** miễn phí */
  probe: 0,
  /** nhận dạng giọng nói — theo phút video */
  sttPerMin: 100,
  /** đọc chữ trên hình (Gemini video) — theo phút video */
  ocrPerMin: 300,
  /** dịch AI — theo dòng phụ đề */
  translatePerLine: 5,
  translateMin: 20,
  /** render phụ đề + che chữ — theo phút video */
  renderPerMin: 50,
  renderMin: 20,
  /** lồng tiếng giọng thường (Edge) — theo phút video */
  dubEdgePerMin: 500,
  /** lồng tiếng giọng cao cấp (Gemini) — theo phút video */
  dubGeminiPerMin: 700,
  dubMin: 100,
} as const;

/** Nạp nhiều tặng thêm — % bonus theo mức nạp (VND). */
export function topupBonusPercent(amountVnd: number): number {
  if (amountVnd >= 5_000_000) return 80;
  if (amountVnd >= 2_000_000) return 60;
  if (amountVnd >= 1_000_000) return 40;
  if (amountVnd >= 500_000) return 20;
  if (amountVnd >= 200_000) return 10;
  return 0;
}

/** Ước tính credit cho một job — dùng chung cho worker (trừ tiền) và web (hiển thị). */
export function estimateJobCredits(
  type: "probe" | "stt" | "ocr" | "translate" | "render" | "dub",
  input: { durationSec?: number | null; lines?: number; premiumVoice?: boolean },
): number {
  const minutes = Math.max(1, Math.ceil((input.durationSec ?? 0) / 60));
  switch (type) {
    case "probe":
      return 0;
    case "stt":
      return minutes * CREDIT_PRICING.sttPerMin;
    case "ocr":
      return minutes * CREDIT_PRICING.ocrPerMin;
    case "translate":
      return Math.max(
        CREDIT_PRICING.translateMin,
        (input.lines ?? 0) * CREDIT_PRICING.translatePerLine,
      );
    case "render":
      return Math.max(CREDIT_PRICING.renderMin, minutes * CREDIT_PRICING.renderPerMin);
    case "dub":
      return Math.max(
        CREDIT_PRICING.dubMin,
        minutes *
          (input.premiumVoice
            ? CREDIT_PRICING.dubGeminiPerMin
            : CREDIT_PRICING.dubEdgePerMin),
      );
  }
}

export const CREDIT_REASONS = [
  "signup_trial",
  "topup",
  "job_charge",
  "job_refund",
  "admin_adjust",
] as const;

export type CreditReason = (typeof CREDIT_REASONS)[number];
