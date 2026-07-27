import assert from "node:assert/strict";
import { test } from "node:test";
import { atempoChain, slotMs } from "./dub-timing";

const SEGS = [
  { i: 0, startMs: 1000, endMs: 2000, text: "a" },
  { i: 1, startMs: 3000, endMs: 4500, text: "b" },
  { i: 2, startMs: 5000, endMs: 6000, text: "c" },
];

test("slotMs: khe = start câu kế - start câu này; câu cuối chạy tới hết video", () => {
  assert.equal(slotMs(SEGS, 0, 10_000), 2000); // 3000 - 1000
  assert.equal(slotMs(SEGS, 1, 10_000), 2000); // 5000 - 3000
  assert.equal(slotMs(SEGS, 2, 10_000), 5000); // 10000 - 5000
});

test("atempoChain: không chỉnh khi lệch nhỏ, chặn trần ở 1.5× cho giọng tự nhiên", () => {
  assert.equal(atempoChain(1.0), null);
  assert.equal(atempoChain(1.02), null);
  assert.equal(atempoChain(1.3), "atempo=1.3");
  assert.equal(atempoChain(1.5), "atempo=1.5");
  assert.equal(atempoChain(3), "atempo=1.5"); // chặn trần 1.5x thay vì tua nhanh
  assert.equal(atempoChain(10), "atempo=1.5"); // phần dư sẽ bị -t slot cắt ở dub.ts
});
