import assert from "node:assert/strict";
import { test } from "node:test";
import {
  CREDIT_PRICING,
  FIRST_TOPUP_PROMO,
  OCR_TIMES_PRICIER_THAN_STT,
  SIGNUP_TRIAL_CREDITS,
  dubRatePerMin,
  estimateJobCredits,
  firstTopupPack,
  topupBonusPercent,
  topupCredits,
} from "./credits";
import { dubTierOf } from "./dub-presets";

/**
 * Luồng TIỀN — trước đây không có một test nào, dù đây là chỗ đã sai 3 lần:
 *   1. Gemini bị coi là nguồn cao cấp duy nhất
 *   2. ElevenLabs (đắt nhất) bị tính đúng bằng giá Edge miễn phí
 *   3. Google Cloud ($30/1M ký tự) cũng bị gộp vào giá Edge → lỗ ngầm
 * Mỗi lần đều chỉ lộ ra khi có người ngồi dò bảng giá bằng tay.
 *
 * Nguyên tắc: mọi giọng PHẢI bán trên giá vốn, và mọi con số hiển thị cho khách
 * phải bằng đúng con số worker trừ xu.
 */

// ---- Bậc giá theo nguồn giọng ----

test("dubTierOf: Edge không tiền tố = bậc cơ bản", () => {
  assert.equal(dubTierOf("vi-VN-HoaiMyNeural"), "basic");
  assert.equal(dubTierOf("en-US-AriaNeural"), "basic");
});

test("dubTierOf: Google Cloud = bậc HD (KHÔNG được rơi về basic)", () => {
  assert.equal(dubTierOf("gcloud:vi-VN-Chirp3-HD-Aoede"), "hd");
});

test("dubTierOf: Gemini và ElevenLabs = bậc cao cấp", () => {
  assert.equal(dubTierOf("gemini:Kore"), "premium");
  assert.equal(dubTierOf("eleven:pNInz6obpgDQGcFmaJgB"), "premium");
});

test("dubTierOf: id lạ rơi về bậc cơ bản, không vỡ", () => {
  assert.equal(dubTierOf(""), "basic");
  assert.equal(dubTierOf("nguon-chua-ho-tro:abc"), "basic");
});

// ---- Giá bán phải cao hơn giá vốn ----

const VND_PER_USD = 26_000;
/** Văn nói tiếng Việt ~900 ký tự/phút (TARGET_CPS=15 trong translate.ts). */
const CHARS_PER_MIN = 900;

test("giọng HD bán CAO HƠN chi phí Google Cloud thật ($30/1M ký tự)", () => {
  const costPerMin = ((CHARS_PER_MIN * 30) / 1_000_000) * VND_PER_USD;
  assert.ok(
    CREDIT_PRICING.dubGCloudPerMin > costPerMin,
    `HD bán ${CREDIT_PRICING.dubGCloudPerMin}đ/phút nhưng chi phí thật ~${Math.round(costPerMin)}đ/phút`,
  );
});

test("giọng cao cấp bán CAO HƠN chi phí ElevenLabs thật (~$0,30/1.000 ký tự)", () => {
  const costPerMin = ((CHARS_PER_MIN * 0.3) / 1_000) * VND_PER_USD;
  assert.ok(
    CREDIT_PRICING.dubPremiumPerMin > costPerMin,
    `cao cấp bán ${CREDIT_PRICING.dubPremiumPerMin}đ/phút nhưng chi phí thật ~${Math.round(costPerMin)}đ/phút`,
  );
});

test("ba bậc giá tăng dần — không bậc nào rẻ hơn bậc dưới nó", () => {
  assert.ok(dubRatePerMin("basic") < dubRatePerMin("hd"));
  assert.ok(dubRatePerMin("hd") < dubRatePerMin("premium"));
});

// ---- estimateJobCredits ----

const TEN_MIN = { durationSec: 600 };

test("lồng tiếng 10 phút tính đúng theo từng bậc", () => {
  assert.equal(estimateJobCredits("dub", TEN_MIN), 10 * CREDIT_PRICING.dubEdgePerMin);
  assert.equal(
    estimateJobCredits("dub", { ...TEN_MIN, dubTier: "hd" }),
    10 * CREDIT_PRICING.dubGCloudPerMin,
  );
  assert.equal(
    estimateJobCredits("dub", { ...TEN_MIN, dubTier: "premium" }),
    10 * CREDIT_PRICING.dubPremiumPerMin,
  );
});

test("thiếu dubTier thì mặc định bậc cơ bản — KHÔNG được tính giá cao cấp cho nhầm", () => {
  assert.equal(
    estimateJobCredits("dub", TEN_MIN),
    estimateJobCredits("dub", { ...TEN_MIN, dubTier: "basic" }),
  );
});

test("import và probe luôn miễn phí", () => {
  assert.equal(estimateJobCredits("import", TEN_MIN), 0);
  assert.equal(estimateJobCredits("probe", TEN_MIN), 0);
});

test("thời lượng lẻ làm tròn LÊN phút — không bao giờ tính thiếu", () => {
  // 61 giây = 2 phút, không phải 1
  assert.equal(estimateJobCredits("stt", { durationSec: 61 }), 2 * CREDIT_PRICING.sttPerMin);
  assert.equal(estimateJobCredits("stt", { durationSec: 60 }), 1 * CREDIT_PRICING.sttPerMin);
});

test("thời lượng thiếu/0 vẫn tính tối thiểu 1 phút, không ra 0 hay âm", () => {
  for (const durationSec of [0, null, undefined]) {
    assert.equal(estimateJobCredits("stt", { durationSec }), CREDIT_PRICING.sttPerMin);
  }
});

test("dịch dưới 4 dòng vẫn thu mức sàn translateMin", () => {
  // 1 dòng × 5 xu = 5 < sàn 20 → thu 20
  assert.equal(estimateJobCredits("translate", { lines: 1 }), CREDIT_PRICING.translateMin);
  assert.ok(CREDIT_PRICING.translateMin > CREDIT_PRICING.translatePerLine);
});

/**
 * `renderMin` và `dubMin` hiện KHÔNG BAO GIỜ có tác dụng: thời lượng luôn làm
 * tròn lên tối thiểu 1 phút, mà đơn giá 1 phút (render 50, lồng tiếng 500) đã
 * lớn hơn mức sàn (20 và 100). Chúng chỉ còn là lưới an toàn phòng khi hạ đơn
 * giá xuống rất thấp. Test này ghim lại sự thật đó để không ai tưởng sàn đang
 * chặn thật rồi tính nhầm doanh thu.
 */
test("sàn renderMin/dubMin hiện không bao giờ chạm — đơn giá 1 phút đã cao hơn", () => {
  assert.equal(estimateJobCredits("render", { durationSec: 1 }), CREDIT_PRICING.renderPerMin);
  assert.ok(CREDIT_PRICING.renderPerMin > CREDIT_PRICING.renderMin);

  assert.equal(estimateJobCredits("dub", { durationSec: 1 }), CREDIT_PRICING.dubEdgePerMin);
  assert.ok(CREDIT_PRICING.dubEdgePerMin > CREDIT_PRICING.dubMin);
});

test("dịch tính theo số dòng", () => {
  assert.equal(estimateJobCredits("translate", { lines: 100 }), 100 * CREDIT_PRICING.translatePerLine);
});

test("OCR đắt hơn STT, và nhãn quảng cáo khớp đúng tỉ lệ thật", () => {
  assert.ok(CREDIT_PRICING.ocrPerMin > CREDIT_PRICING.sttPerMin);
  assert.equal(
    OCR_TIMES_PRICIER_THAN_STT,
    Math.round(CREDIT_PRICING.ocrPerMin / CREDIT_PRICING.sttPerMin),
  );
});

// ---- Nạp xu & khuyến mãi ----

test("nạp lần đầu từ mức tối thiểu được cộng đúng bonus", () => {
  const vnd = FIRST_TOPUP_PROMO.minVnd;
  assert.equal(
    topupCredits(vnd, true) - topupCredits(vnd, false),
    FIRST_TOPUP_PROMO.bonusCredits,
  );
});

test("nạp DƯỚI mức tối thiểu thì không có bonus lần đầu", () => {
  const vnd = FIRST_TOPUP_PROMO.minVnd - 1;
  assert.equal(topupCredits(vnd, true), topupCredits(vnd, false));
});

test("gói mồi 50k hiện đúng số xu khách thực nhận", () => {
  const pack = firstTopupPack();
  assert.equal(pack.vnd, FIRST_TOPUP_PROMO.minVnd);
  assert.equal(pack.credits, topupCredits(FIRST_TOPUP_PROMO.minVnd, true));
  assert.equal(pack.firstTopup, true);
});

test("nạp càng nhiều bonus càng cao, không bậc nào tụt", () => {
  const mocs = [100_000, 200_000, 500_000, 1_000_000, 2_000_000, 5_000_000];
  for (let i = 1; i < mocs.length; i++) {
    assert.ok(
      topupBonusPercent(mocs[i]) >= topupBonusPercent(mocs[i - 1]),
      `bonus ở mức ${mocs[i]} thấp hơn mức ${mocs[i - 1]}`,
    );
  }
});

test("nạp nhiều hơn thì LUÔN nhận nhiều xu hơn (không có mức nào bị thiệt)", () => {
  const mocs = [50_000, 100_000, 200_000, 500_000, 1_000_000, 2_000_000, 5_000_000];
  for (let i = 1; i < mocs.length; i++) {
    assert.ok(
      topupCredits(mocs[i], false) > topupCredits(mocs[i - 1], false),
      `nạp ${mocs[i]} không nhận nhiều hơn nạp ${mocs[i - 1]}`,
    );
  }
});

// ---- Xu tặng lúc đăng ký ----

test("xu tặng đủ để khách mới xuất thử ít nhất một video ngắn", () => {
  const motPhutTronGoi =
    CREDIT_PRICING.ocrPerMin +
    CREDIT_PRICING.renderPerMin +
    CREDIT_PRICING.dubEdgePerMin +
    15 * CREDIT_PRICING.translatePerLine;
  assert.ok(
    SIGNUP_TRIAL_CREDITS >= motPhutTronGoi,
    "xu tặng không đủ Việt hóa nổi 1 phút video — khách mới vào là bí",
  );
});
