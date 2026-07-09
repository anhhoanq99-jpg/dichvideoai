/** Sinh danh mục giọng Edge TTS → packages/shared/src/edge-voices.ts */
import { writeFile } from "node:fs/promises";
import path from "node:path";
import { MsEdgeTTS } from "msedge-tts";

const voices = await new MsEdgeTTS().getVoices();
console.log("voices:", voices.length);

const rows = voices
  .map((v) => ({
    id: v.ShortName,
    // "en-US-JennyNeural" → "Jenny"
    name: v.ShortName.split("-").slice(2).join("-").replace(/Neural$/, ""),
    locale: v.Locale,
    gender: v.Gender === "Female" ? ("F" as const) : ("M" as const),
  }))
  .sort((a, b) => a.locale.localeCompare(b.locale) || a.name.localeCompare(b.name));

const out = `// ⚠️ File sinh tự động bằng apps/worker/scripts/gen-edge-voices.ts — đừng sửa tay.
export interface EdgeVoice {
  id: string;
  name: string;
  locale: string;
  gender: "F" | "M";
}

export const EDGE_VOICES: EdgeVoice[] = ${JSON.stringify(rows)};

export const EDGE_VOICE_IDS = new Set(EDGE_VOICES.map((v) => v.id));
`;

const target = path.resolve("../../packages/shared/src/edge-voices.ts");
await writeFile(target, out, "utf8");
console.log("written:", target);
process.exit(0);
