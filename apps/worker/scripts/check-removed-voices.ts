// Khach co the con cai dat luu san (localStorage) tro toi giong DA GO.
// Phai chac he thong xu ly gon: tu choi ro rang, khong vo, va co giong du phong.
//   cd apps/worker && npx tsx scripts/check-removed-voices.ts
import {
  DUB_VOICES,
  edgeFallbackVoice,
  isValidVoiceId,
  voiceProvider,
} from "@dichvideo/shared";

let bad = 0;

console.log("=== Giong DA GO ===");
for (const id of [
  "vieneu:minh-duc",
  "kokoro:diem_trinh",
  "viettel:doanngocle",
  "fpt:banmai",
]) {
  const valid = isValidVoiceId(id);
  const prov = voiceProvider(id);
  const fb = edgeFallbackVoice(id);
  // phai: KHONG hop le (API tu choi) + roi ve edge + co giong du phong
  const ok = !valid && prov === "edge" && Boolean(fb);
  if (!ok) bad++;
  console.log(
    `  ${ok ? "OK " : "LOI"} ${id.padEnd(22)} hopLe=${valid} provider=${prov} duPhong=${fb}`,
  );
}

console.log("\n=== Giong CON DUNG ===");
for (const [id, want] of [
  ["gcloud:vi-VN-Chirp3-HD-Aoede", "gcloud"],
  ["gemini:Kore", "gemini"],
  ["eleven:pNInz6obpgDQGcFmaJgB", "eleven"],
  [DUB_VOICES[0].id, "edge"],
] as const) {
  const ok = isValidVoiceId(id) && voiceProvider(id) === want;
  if (!ok) bad++;
  console.log(`  ${ok ? "OK " : "LOI"} ${id.padEnd(30)} provider=${voiceProvider(id)}`);
}

console.log(bad === 0 ? "\nTAT CA DUNG" : `\n${bad} truong hop SAI`);
if (bad > 0) process.exitCode = 1;
