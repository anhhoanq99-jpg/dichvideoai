/** Smoke test giọng cao cấp Gemini TTS. */
import { config } from "dotenv";
config({ path: "../../.env" });
import { mkdir, stat } from "node:fs/promises";
import { synthesizeGeminiClip } from "../src/lib/tts";

await mkdir("tmp-tts", { recursive: true });
const { file, usage } = await synthesizeGeminiClip({
  text: "Xin chào! Đây là giọng đọc cao cấp thử nghiệm cho video của bạn.",
  voiceName: "Kore",
  dir: "tmp-tts",
  name: "gemini-sample",
});
const { size } = await stat(file);
console.log("OK:", file, size, "bytes");
console.log("usage:", JSON.stringify(usage));
process.exit(0);
