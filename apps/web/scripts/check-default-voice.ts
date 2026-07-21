/**
 * Giong MAC DINH gio la SubdubAI (Google Cloud) — moi khach chua doi giong deu
 * dung no, nen phai chac no TONG HOP DUOC THAT chu khong chi hop le tren giay.
 *
 *   cd apps/worker && npx tsx --env-file=../../.env ../web/scripts/check-default-voice.ts
 */
import { GCLOUD_VOICES, gcloudVoiceName, isValidVoiceId } from "@dichvideo/shared";
import { synthGCloud } from "../lib/tts-web";

const DEFAULT_VOICE = GCLOUD_VOICES[0].id;

async function main() {
  console.log(`Giong mac dinh: ${DEFAULT_VOICE} ("${GCLOUD_VOICES[0].name}")`);
  console.log(`isValidVoiceId : ${isValidVoiceId(DEFAULT_VOICE)}`);

  const name = gcloudVoiceName(DEFAULT_VOICE);
  if (!name) throw new Error("khong tach duoc ten voice that");
  console.log(`ten that gui API: ${name}`);

  const t0 = Date.now();
  const audio = await synthGCloud(name, "Xin chào, đây là giọng mặc định của hệ thống.");
  const ok = audio.length > 5_000;
  console.log(
    `tong hop      : ${ok ? "OK" : "LOI (file qua nho)"} ${(audio.length / 1024) | 0}KB ${Date.now() - t0}ms`,
  );
  if (!ok) process.exitCode = 1;
}

void main();
