// Kiem chung cac thay doi ve GIA va NGUONG XU.
// Gia hien cho khach va gia worker tru THAT phai ra cung mot so — lech la
// khach thay mot dang, bi tru mot neo.
//
//   cd apps/worker && npx tsx ../web/scripts/check-pricing.ts
import {
  CREDIT_PRICING,
  SIGNUP_TRIAL_CREDITS,
  dubTierOf,
  estimateJobCredits,
} from "@dichvideo/shared";

let bad = 0;
const check = (label: string, got: unknown, want: unknown) => {
  const ok = JSON.stringify(got) === JSON.stringify(want);
  if (!ok) bad++;
  console.log(`${ok ? "OK " : "LOI"} ${label}: ${JSON.stringify(got)} (mong doi ${JSON.stringify(want)})`);
};

console.log("=== Bac gia cua tung nguon giong ===");
check("Edge (mien phi that)", dubTierOf("vi-VN-HoaiMyNeural"), "basic");
check("Google Chirp3-HD (truoc day bi tinh gia Edge)", dubTierOf("gcloud:vi-VN-Chirp3-HD-Aoede"), "hd");
check("Gemini", dubTierOf("gemini:Kore"), "premium");
check("ElevenLabs (truoc day bi tinh gia Edge)", dubTierOf("eleven:pNInz6obpgDQGcFmaJgB"), "premium");

console.log("\n=== Gia long tieng 10 phut ===");
const tenMin = { durationSec: 600 };
const basic = estimateJobCredits("dub", tenMin);
const hd = estimateJobCredits("dub", { ...tenMin, dubTier: "hd" as const });
const premium = estimateJobCredits("dub", { ...tenMin, dubTier: "premium" as const });
check("giong co ban (mac dinh)", basic, 10 * CREDIT_PRICING.dubEdgePerMin);
check("giong HD", hd, 10 * CREDIT_PRICING.dubGCloudPerMin);
check("giong cao cap", premium, 10 * CREDIT_PRICING.dubPremiumPerMin);
console.log(`   10 phut: co ban ${basic} xu | HD ${hd} xu | cao cap ${premium} xu`);

// Chi phi that de doi chieu — HD phai BAN cao hon CHI, khong duoc lo ngam nua.
const GCLOUD_USD_PER_1M_CHARS = 30;
const CHARS_PER_MIN = 900; // TARGET_CPS=15 trong translate.ts
const VND_PER_USD = 26_000;
const hdCostPerMin = (CHARS_PER_MIN * GCLOUD_USD_PER_1M_CHARS / 1_000_000) * VND_PER_USD;
console.log(`   HD: ban ${CREDIT_PRICING.dubGCloudPerMin}d/phut, chi phi that ~${Math.round(hdCostPerMin)}d/phut`);
check("gia HD phu duoc chi phi that", CREDIT_PRICING.dubGCloudPerMin > hdCostPerMin, true);

console.log("\n=== Loi chao nguoi dung moi ===");
const FULL = CREDIT_PRICING.ocrPerMin + CREDIT_PRICING.renderPerMin +
  CREDIT_PRICING.dubEdgePerMin + 15 * CREDIT_PRICING.translatePerLine;
const phut = Math.max(1, Math.floor(SIGNUP_TRIAL_CREDITS / FULL));
console.log(`   ${SIGNUP_TRIAL_CREDITS} xu / ${FULL} xu moi phut = ~${phut} phut tron goi`);
check("con so phut > 0", phut > 0, true);

console.log("\n=== Nguong chan thieu xu ===");
const render10 = estimateJobCredits("render", tenMin);
console.log(`   render 10 phut = ${render10} xu; nguoi moi co ${SIGNUP_TRIAL_CREDITS} xu`);
check("nguoi moi du xuat 10 phut", SIGNUP_TRIAL_CREDITS >= render10, true);

console.log(bad === 0 ? "\nTAT CA DUNG" : `\n${bad} cho SAI`);
if (bad > 0) process.exitCode = 1;
