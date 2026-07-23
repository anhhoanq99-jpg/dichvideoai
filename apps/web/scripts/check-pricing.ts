// Kiem chung cac thay doi ve GIA va NGUONG XU.
// Gia hien cho khach va gia worker tru THAT phai ra cung mot so — lech la
// khach thay mot dang, bi tru mot neo.
//
//   cd apps/worker && npx tsx ../web/scripts/check-pricing.ts
import {
  CREDIT_PRICING,
  SIGNUP_TRIAL_CREDITS,
  estimateJobCredits,
  isPremiumVoice,
} from "@dichvideo/shared";

let bad = 0;
const check = (label: string, got: unknown, want: unknown) => {
  const ok = JSON.stringify(got) === JSON.stringify(want);
  if (!ok) bad++;
  console.log(`${ok ? "OK " : "LOI"} ${label}: ${JSON.stringify(got)} (mong doi ${JSON.stringify(want)})`);
};

console.log("=== Giong nao tinh gia cao cap ===");
check("Gemini", isPremiumVoice("gemini:Kore"), true);
check("ElevenLabs (truoc day bi tinh gia Edge)", isPremiumVoice("eleven:pNInz6obpgDQGcFmaJgB"), true);
check("Edge mien phi", isPremiumVoice("vi-VN-HoaiMyNeural"), false);
check("SubdubAI/Google", isPremiumVoice("gcloud:vi-VN-Chirp3-HD-Aoede"), false);

console.log("\n=== Gia long tieng 10 phut ===");
const tenMin = { durationSec: 600 };
const edge = estimateJobCredits("dub", tenMin);
const premium = estimateJobCredits("dub", { ...tenMin, premiumVoice: true });
check("giong thuong", edge, 10 * CREDIT_PRICING.dubEdgePerMin);
check("giong cao cap", premium, 10 * CREDIT_PRICING.dubGeminiPerMin);
console.log(`   ElevenLabs 10 phut: ${edge} xu -> ${premium} xu (+${premium - edge})`);

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
