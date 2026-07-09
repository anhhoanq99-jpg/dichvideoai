import assert from "node:assert/strict";
import { test } from "node:test";
import { parseSrt, segmentsToSrt, segmentsToVtt } from "./subtitle-io";

const SEGS = [
  { i: 0, startMs: 0, endMs: 1500, text: "Xin chào" },
  { i: 1, startMs: 61_250, endMs: 3_723_004, text: "Dòng một\nDòng hai" },
];

test("segmentsToSrt formats timestamps and indices", () => {
  const srt = segmentsToSrt(SEGS);
  assert.match(srt, /^1\n00:00:00,000 --> 00:00:01,500\nXin chào/);
  assert.match(srt, /2\n00:01:01,250 --> 01:02:03,004\nDòng một\nDòng hai/);
});

test("segmentsToVtt has header and dot separator", () => {
  const vtt = segmentsToVtt(SEGS);
  assert.match(vtt, /^WEBVTT\n\n00:00:00\.000 --> 00:00:01\.500/);
});

test("parseSrt roundtrips output of segmentsToSrt", () => {
  const parsed = parseSrt(segmentsToSrt(SEGS));
  assert.equal(parsed.length, 2);
  assert.deepEqual(parsed[0], SEGS[0]);
  assert.equal(parsed[1].startMs, 61_250);
  assert.equal(parsed[1].text, "Dòng một\nDòng hai");
});

test("parseSrt tolerates BOM, CRLF, missing index, MM:SS times", () => {
  const raw = "﻿00:05,000 --> 00:07,250\r\nKhông có số thứ tự\r\n\r\n9\r\n00:00:10,5 --> 00:00:12,50\r\nPadding mili\r\n";
  const parsed = parseSrt(raw);
  assert.equal(parsed.length, 2);
  assert.equal(parsed[0].startMs, 5000);
  assert.equal(parsed[0].text, "Không có số thứ tự");
  assert.equal(parsed[1].startMs, 10_500);
  assert.equal(parsed[1].endMs, 12_500);
});

test("parseSrt skips malformed cues", () => {
  const parsed = parseSrt("garbage\n\n1\n00:00:02,000 --> 00:00:01,000\nend before start\n\n2\n00:00:01,000 --> 00:00:02,000\nok\n");
  assert.equal(parsed.length, 1);
  assert.equal(parsed[0].text, "ok");
});
