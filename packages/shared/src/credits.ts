/** Credits tặng khi đăng ký — đủ Việt hóa thử ~2 video ngắn. */
export const SIGNUP_TRIAL_CREDITS = 10_000;

/**
 * Đơn giá credit theo loại job. NEO GIÁ TRỊ: 1 xu = 1 VND (100.000đ = 100.000 xu,
 * cùng thang đối thủ) — mọi con số dưới đây vừa là xu vừa là đồng. — đặt theo mặt bằng thị trường
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
  /**
   * Lồng tiếng giọng CƠ BẢN (Microsoft Edge TTS) — theo phút video.
   * Đây là nguồn DUY NHẤT miễn phí thật: không hạn mức, chi phí = 0 → lãi 100%.
   */
  dubEdgePerMin: 500,
  /**
   * Lồng tiếng giọng HD (Google Cloud Chirp3-HD) — theo phút video.
   *
   * Google cho 1 TRIỆU ký tự/tháng miễn phí rồi tính $30/1M. Văn nói tiếng Việt
   * ~900 ký tự/phút (TARGET_CPS=15 trong translate.ts) → chi phí thật ~700đ/phút
   * sau khi hết hạn mức.
   *
   * Trước đây nguồn này bị gộp chung ô giá với Edge ở 500đ/phút → LỖ ~200đ mỗi
   * phút, mà không nơi nào báo động vì chi phí gcloud đang được ghi nhận = 0
   * trong usage_events. Đúng vết xe đổ của ElevenLabs (xem dubPremiumPerMin).
   */
  dubGCloudPerMin: 1_200,
  /**
   * Lồng tiếng giọng CAO CẤP (ElevenLabs / Gemini) — theo phút video.
   * Giá thật ElevenLabs ~$0,30/1.000 ký tự ≈ 6.500đ/phút thoại; đặt 8.000 để bù
   * chi phí + lãi nhẹ. Trước đây 700 → LỖ ~9× mỗi phút.
   */
  dubPremiumPerMin: 8_000,
  dubMin: 100,
} as const;

/**
 * Bậc giá lồng tiếng — quyết định bởi NGUỒN của giọng, không phải tên giọng.
 * Tra bậc từ id giọng bằng `dubTierOf()` trong dub-presets.ts.
 */
export type DubTier = "basic" | "hd" | "premium";

const DUB_RATE_PER_MIN: Record<DubTier, number> = {
  basic: CREDIT_PRICING.dubEdgePerMin,
  hd: CREDIT_PRICING.dubGCloudPerMin,
  premium: CREDIT_PRICING.dubPremiumPerMin,
};

/**
 * Đơn giá lồng tiếng (xu/phút) của một bậc — để giao diện hiện giá mà không gõ
 * số cứng. Trước đây hộp Lồng tiếng ghi thẳng "700"/"500" trong chuỗi, lệch hẳn
 * bảng giá thật sau khi nâng giá cao cấp lên 8.000.
 */
export function dubRatePerMin(tier: DubTier): number {
  return DUB_RATE_PER_MIN[tier];
}

/**
 * OCR đắt gấp mấy lần STT — nguồn duy nhất cho nhãn "rẻ hơn N lần" ở mọi ô chọn
 * nguồn phụ đề (trang upload + trang trích xuất). Tính từ đơn giá thật để đổi
 * bảng giá một chỗ là mọi nhãn đổi theo, không bao giờ quảng cáo sai.
 */
export const OCR_TIMES_PRICIER_THAN_STT = Math.round(
  CREDIT_PRICING.ocrPerMin / CREDIT_PRICING.sttPerMin,
);

/**
 * Khuyến mãi LẦN NẠP ĐẦU — mồi khách dùng thử: nạp từ 50k trở lên, lần đầu tiên
 * được tặng thêm 20.000 xu (cộng DỒN với % nạp nhiều bên dưới). Áp đúng một lần
 * cho mỗi tài khoản (webhook kiểm tra chưa có lượt nạp nào trước đó).
 */
export const FIRST_TOPUP_PROMO = { minVnd: 50_000, bonusCredits: 20_000 } as const;

/** Số xu nhận được khi nạp `vnd`, đã gồm % nạp-nhiều và (nếu đủ điều kiện) bonus lần đầu. */
export function topupCredits(vnd: number, isFirstTopup: boolean): number {
  const base = Math.floor(vnd * (1 + topupBonusPercent(vnd) / 100));
  const firstBonus =
    isFirstTopup && vnd >= FIRST_TOPUP_PROMO.minVnd ? FIRST_TOPUP_PROMO.bonusCredits : 0;
  return base + firstBonus;
}

/** Nạp nhiều tặng thêm — % bonus theo mức nạp (VND). */
export function topupBonusPercent(amountVnd: number): number {
  if (amountVnd >= 5_000_000) return 80;
  if (amountVnd >= 2_000_000) return 60;
  if (amountVnd >= 1_000_000) return 40;
  if (amountVnd >= 500_000) return 20;
  if (amountVnd >= 200_000) return 10;
  return 0;
}

/** Một mức nạp hiển thị cho người dùng (landing + trang Nạp credits). */
export interface TopupPack {
  vnd: number;
  /** % tặng thêm theo thang topupBonusPercent */
  bonus: number;
  /** tổng credits nhận được (đã gồm bonus) */
  credits: number;
  /** gói được làm nổi bật trên UI */
  popular: boolean;
  /** gói khuyến mãi lần nạp đầu (mồi dùng thử) — chỉ hiện cho khách chưa nạp lần nào */
  firstTopup?: boolean;
}

/** Gói mồi LẦN NẠP ĐẦU (50k → +20k) — chỉ hiển thị cho khách chưa từng nạp. */
export function firstTopupPack(): TopupPack {
  return {
    vnd: FIRST_TOPUP_PROMO.minVnd,
    bonus: 0,
    credits: topupCredits(FIRST_TOPUP_PROMO.minVnd, true),
    popular: false,
    firstTopup: true,
  };
}

/** Các mức nạp chuẩn — nguồn duy nhất cho landing page và trang Nạp credits. */
export function topupPacks(): TopupPack[] {
  return [100_000, 200_000, 500_000, 1_000_000, 2_000_000, 5_000_000].map((vnd) => {
    const bonus = topupBonusPercent(vnd);
    return {
      vnd,
      bonus,
      credits: Math.floor(vnd * (1 + bonus / 100)),
      popular: vnd === 1_000_000,
    };
  });
}

/** Ước tính credit cho một job — dùng chung cho worker (trừ tiền) và web (hiển thị). */
export function estimateJobCredits(
  type: "import" | "probe" | "stt" | "ocr" | "translate" | "render" | "dub",
  input: { durationSec?: number | null; lines?: number; dubTier?: DubTier },
): number {
  const minutes = Math.max(1, Math.ceil((input.durationSec ?? 0) / 60));
  switch (type) {
    case "import": // tải video từ link — miễn phí
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
          DUB_RATE_PER_MIN[input.dubTier ?? "basic"],
      );
  }
}

export const CREDIT_REASONS = [
  "signup_trial",
  "topup",
  "job_charge",
  "job_refund",
  "admin_adjust",
  "trial_expired",
] as const;

export type CreditReason = (typeof CREDIT_REASONS)[number];
