import assert from "node:assert/strict";
import { test } from "node:test";
import {
  labelToMs,
  msToLabel,
  segmentIndexAt,
  segmentIndexAtOrBefore,
} from "./subtitle-time";

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

// ---- Tim cau dang phat (dung o khung xem truoc + bang phu de) ----

const SEGS = [
  { i: 0, startMs: 1000, endMs: 2000, text: "mot" },
  { i: 1, startMs: 3000, endMs: 4000, text: "hai" },
  { i: 2, startMs: 4000, endMs: 5000, text: "ba" }, // sat ngay sau cau truoc
];

test("segmentIndexAt: trong cau thi tra chi so, khoang lang tra -1", () => {
  assert.equal(segmentIndexAt(SEGS, 1500), 0);
  assert.equal(segmentIndexAt(SEGS, 1000), 0); // dung moc bat dau = da hien
  assert.equal(segmentIndexAt(SEGS, 2000), -1); // dung moc ket thuc = da tat
  assert.equal(segmentIndexAt(SEGS, 2500), -1); // khoang lang giua 2 cau
  assert.equal(segmentIndexAt(SEGS, 4000), 2); // cau sat nhau: lay cau sau
  assert.equal(segmentIndexAt(SEGS, 0), -1); // truoc cau dau
  assert.equal(segmentIndexAt(SEGS, 99999), -1); // sau cau cuoi
  assert.equal(segmentIndexAt([], 100), -1);
});

test("segmentIndexAtOrBefore: khoang lang giu cau truoc do", () => {
  assert.equal(segmentIndexAtOrBefore(SEGS, 1500), 0);
  assert.equal(segmentIndexAtOrBefore(SEGS, 2500), 0); // giu cau vua doc xong
  assert.equal(segmentIndexAtOrBefore(SEGS, 3500), 1);
  assert.equal(segmentIndexAtOrBefore(SEGS, 99999), 2); // sau cau cuoi van giu cau cuoi
  assert.equal(segmentIndexAtOrBefore(SEGS, 0), -1); // chua toi cau nao
  assert.equal(segmentIndexAtOrBefore([], 100), -1);
});

test("hai ham CHI khac nhau o khoang lang (day la khac biet co chu y)", () => {
  for (const ms of [1500, 3500, 4500]) {
    assert.equal(segmentIndexAt(SEGS, ms), segmentIndexAtOrBefore(SEGS, ms));
  }
  assert.notEqual(segmentIndexAt(SEGS, 2500), segmentIndexAtOrBefore(SEGS, 2500));
});
