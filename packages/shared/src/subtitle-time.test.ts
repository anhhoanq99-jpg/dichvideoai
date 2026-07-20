import assert from "node:assert/strict";
import { test } from "node:test";
import { labelToMs, msToLabel } from "./subtitle-time";

test("msToLabel formats minutes and pads seconds", () => {
  assert.equal(msToLabel(0), "0:00.0");
  assert.equal(msToLabel(5000), "0:05.0");
  assert.equal(msToLabel(83500), "1:23.5");
  assert.equal(msToLabel(600000), "10:00.0");
  assert.equal(msToLabel(-500), "0:00.0"); // âm → kẹp về 0
});

test("labelToMs parses m:ss(.d) form", () => {
  assert.equal(labelToMs("0:00"), 0);
  assert.equal(labelToMs("1:23.5"), 83500);
  assert.equal(labelToMs("0:05.0"), 5000);
  assert.equal(labelToMs("10:00"), 600000);
});

test("labelToMs parses bare seconds, including past 59", () => {
  assert.equal(labelToMs("83.5"), 83500);
  assert.equal(labelToMs("5"), 5000);
  assert.equal(labelToMs("0.25"), 250);
});

test("labelToMs accepts comma as decimal separator (VN keyboards)", () => {
  assert.equal(labelToMs("1:23,5"), 83500);
  assert.equal(labelToMs("83,5"), 83500);
});

test("labelToMs tolerates surrounding whitespace", () => {
  assert.equal(labelToMs("  1:23.5  "), 83500);
});

test("labelToMs rejects invalid input", () => {
  assert.equal(labelToMs(""), null);
  assert.equal(labelToMs("   "), null);
  assert.equal(labelToMs("abc"), null);
  assert.equal(labelToMs("1:60"), null); // giây phải 0..59 khi có phút
  assert.equal(labelToMs("1:99.5"), null);
  assert.equal(labelToMs("1:2:3"), null);
  assert.equal(labelToMs("-5"), null);
  assert.equal(labelToMs("1.2.3"), null);
});

test("msToLabel and labelToMs round-trip", () => {
  for (const ms of [0, 250, 5000, 83500, 600000]) {
    assert.equal(labelToMs(msToLabel(ms)), Math.round(ms / 100) * 100);
  }
});
