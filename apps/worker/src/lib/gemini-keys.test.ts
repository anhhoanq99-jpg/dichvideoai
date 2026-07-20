import assert from "node:assert/strict";
import { test, beforeEach } from "node:test";
import { UnrecoverableError } from "bullmq";
import { geminiKeys, withGeminiKeys } from "./gemini-keys";
import { billingDepletedMessage, dailyQuotaMessage } from "./gemini-limits";

beforeEach(() => {
  delete process.env.GEMINI_API_KEYS;
  delete process.env.GEMINI_API_KEY;
});

test("geminiKeys gop ca GEMINI_API_KEYS va GEMINI_API_KEY, bo trung va khoang trang", () => {
  process.env.GEMINI_API_KEYS = " k1 , k2 ,, k3 ";
  process.env.GEMINI_API_KEY = "k2";
  assert.deepEqual(geminiKeys(), ["k1", "k2", "k3"]);
});

test("geminiKeys chi co key cu van chay duoc (khong pha cau hinh dang dung)", () => {
  process.env.GEMINI_API_KEY = "solo";
  assert.deepEqual(geminiKeys(), ["solo"]);
});

test("geminiKeys rong khi chua cau hinh gi", () => {
  assert.deepEqual(geminiKeys(), []);
});

test("withGeminiKeys dung key dau tien khi key do con dung duoc", async () => {
  process.env.GEMINI_API_KEYS = "k1,k2";
  const used: string[] = [];
  const out = await withGeminiKeys("t", async (k) => {
    used.push(k);
    return "ok";
  });
  assert.equal(out, "ok");
  assert.deepEqual(used, ["k1"]); // KHONG duoc dung thu key con lai
});

test("withGeminiKeys nhay sang key ke khi key hien tai het han muc NGAY", async () => {
  process.env.GEMINI_API_KEYS = "k1,k2,k3";
  const used: string[] = [];
  const out = await withGeminiKeys("t", async (k) => {
    used.push(k);
    if (k !== "k3") throw new UnrecoverableError(dailyQuotaMessage());
    return "ok";
  });
  assert.equal(out, "ok");
  assert.deepEqual(used, ["k1", "k2", "k3"]);
});

test("withGeminiKeys nhay sang key ke khi key het tien tra truoc", async () => {
  process.env.GEMINI_API_KEYS = "k1,k2";
  const used: string[] = [];
  const out = await withGeminiKeys("t", async (k) => {
    used.push(k);
    if (k === "k1") throw new UnrecoverableError(billingDepletedMessage());
    return "ok";
  });
  assert.equal(out, "ok");
  assert.deepEqual(used, ["k1", "k2"]);
});

test("withGeminiKeys KHONG doi key khi loi khong lien quan (vd loi mang)", async () => {
  process.env.GEMINI_API_KEYS = "k1,k2,k3";
  const used: string[] = [];
  await assert.rejects(
    withGeminiKeys("t", async (k) => {
      used.push(k);
      throw new Error("ECONNRESET");
    }),
    /ECONNRESET/,
  );
  // chi thu dung 1 key — khong duoc dot het moi key vi mot su co khong lien quan
  assert.deepEqual(used, ["k1"]);
});

test("withGeminiKeys het sach key thi nem loi cuoi cung cho user thay", async () => {
  process.env.GEMINI_API_KEYS = "k1,k2";
  const used: string[] = [];
  await assert.rejects(
    withGeminiKeys("t", async (k) => {
      used.push(k);
      throw new UnrecoverableError(dailyQuotaMessage());
    }),
    /hết hạn mức trong NGÀY/,
  );
  assert.deepEqual(used, ["k1", "k2"]);
});

test("withGeminiKeys bao ro khi chua cau hinh key nao", async () => {
  await assert.rejects(withGeminiKeys("t", async () => "x"), /GEMINI_API_KEY/);
});
