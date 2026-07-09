/** Credits tặng khi đăng ký — đủ Việt hóa thử ~2 video ngắn. */
export const SIGNUP_TRIAL_CREDITS = 500;

/** Trial limit: max video duration processable per job for users who never topped up. */
export const TRIAL_MAX_VIDEO_MINUTES = 5;

/** Neo giá trị: 1 credit = 50 VND (1.000 credits = 50.000đ). */
export const VND_PER_CREDIT = 50;

/**
 * Đơn giá credit theo loại job. Đặt trên chi phí API thật (usage_events)
 * với biên lợi nhuận — xem docs/gensubai-feature-map.md để so đối thủ.
 */
export const CREDIT_PRICING = {
  /** miễn phí */
  probe: 0,
  /** nhận dạng giọng nói — theo phút video */
  sttPerMin: 20,
  /** đọc chữ trên hình (Gemini video) — theo phút video */
  ocrPerMin: 40,
  /** dịch AI — theo dòng phụ đề */
  translatePerLine: 2,
  translateMin: 10,
  /** render phụ đề + che chữ — theo phút video */
  renderPerMin: 10,
  renderMin: 10,
  /** lồng tiếng giọng thường (Edge) — theo phút video */
  dubEdgePerMin: 30,
  /** lồng tiếng giọng cao cấp (Gemini) — theo phút video */
  dubGeminiPerMin: 100,
  dubMin: 15,
} as const;

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
