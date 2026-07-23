import assert from "node:assert/strict";
import { test } from "node:test";
import { edgeFallbackVoice } from "@dichvideo/shared";
import { isGCloudQuotaError } from "./tts";

/**
 * Chuoi loi THAT cua Google Cloud TTS. Phan biet dung hai loai la ca van de:
 * - han muc THEO PHUT  -> chi cho vai giay, KHONG duoc ha cap (doi giong giua video)
 * - het free tier / chua bat billing / API tat -> phai ha xuong Edge, khong job se fail
 */

const HAN_MUC_PHUT =
  'Google Cloud TTS 429: {"error":{"code":429,"message":"Quota exceeded for quota metric ' +
  "'Chirp3-HD voices characters' and limit 'Chirp3-HD voices characters per minute per project' " +
  'of service \'texttospeech.googleapis.com\'","status":"RESOURCE_EXHAUSTED"}}';

const HET_HAN_MUC =
  'Google Cloud TTS 429: {"error":{"code":429,"message":"Quota exceeded for quota metric ' +
  "'Chirp3-HD voices characters' and limit 'Chirp3-HD voices characters per day' " +
  'of service \'texttospeech.googleapis.com\'","status":"RESOURCE_EXHAUSTED"}}';

const CHUA_BAT_BILLING =
  'Google Cloud TTS 403: {"error":{"code":403,"message":"This API method requires billing ' +
  'to be enabled.","status":"PERMISSION_DENIED"}}';

const API_TAT =
  'Google Cloud TTS 403: {"error":{"code":403,"message":"Cloud Text-to-Speech API has not been ' +
  'used in project 123 before or it is disabled.","status":"PERMISSION_DENIED"}}';

test("han muc THEO PHUT khong bi coi la het han muc (cho la chay tiep)", () => {
  assert.equal(isGCloudQuotaError(new Error(HAN_MUC_PHUT)), false);
});

test("het han muc ngay/thang -> ha cap", () => {
  assert.equal(isGCloudQuotaError(new Error(HET_HAN_MUC)), true);
});

test("chua bat billing -> ha cap", () => {
  assert.equal(isGCloudQuotaError(new Error(CHUA_BAT_BILLING)), true);
});

test("API bi tat -> ha cap", () => {
  assert.equal(isGCloudQuotaError(new Error(API_TAT)), true);
});

test("loi cua nguon KHAC khong dinh vao", () => {
  assert.equal(isGCloudQuotaError(new Error("ElevenLabs 429: quota exceeded")), false);
  assert.equal(isGCloudQuotaError(new Error("Gemini TTS 500: loi he thong")), false);
  assert.equal(isGCloudQuotaError(new Error("mat mang")), false);
});

test("loi Google KHONG phai han muc thi khong ha cap", () => {
  assert.equal(isGCloudQuotaError(new Error("Google Cloud TTS 500: internal error")), false);
  assert.equal(isGCloudQuotaError(new Error("Google Cloud TTS 400: invalid voice name")), false);
});

test("ha cap giu DUNG gioi tinh giong", () => {
  // nu -> Hoai My, nam -> Nam Minh
  assert.equal(edgeFallbackVoice("gcloud:vi-VN-Chirp3-HD-Aoede"), "vi-VN-HoaiMyNeural");
  assert.equal(edgeFallbackVoice("gcloud:vi-VN-Chirp3-HD-Achird"), "vi-VN-NamMinhNeural");
  assert.equal(edgeFallbackVoice("gemini:Puck"), "vi-VN-NamMinhNeural");
  assert.equal(edgeFallbackVoice("gcloud:vi-VN-Chirp3-HD-Leda"), "vi-VN-HoaiMyNeural");
});

test("giong la khong lam vo, roi ve giong nu", () => {
  assert.equal(edgeFallbackVoice("khong-co-that"), "vi-VN-HoaiMyNeural");
});
