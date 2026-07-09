import assert from "node:assert/strict";
import { test } from "node:test";
import { buildAss, escapeAssText, hexToAss } from "./ass-builder";
import { STYLE_PRESETS } from "./render-presets";

test("hexToAss converts RGB and alpha correctly", () => {
  assert.equal(hexToAss("#FFFFFF"), "&H00FFFFFF");
  assert.equal(hexToAss("#FFE94A"), "&H004AE9FF"); // BGR order
  assert.equal(hexToAss("#000000AA"), "&H55000000"); // CSS AA=170 → ASS 85=0x55
  assert.throws(() => hexToAss("red"));
});

test("escapeAssText neutralizes override tags and newlines", () => {
  assert.equal(escapeAssText("xin {\\b1}chào{\\b0}\nnhé"), "xin (/b1)chào(/b0)\\Nnhé");
});

test("buildAss produces valid structure with Vietnamese text", () => {
  const ass = buildAss(
    [{ i: 0, startMs: 1000, endMs: 3500, text: "Ăn quả nhớ kẻ trồng cây" }],
    STYLE_PRESETS[0],
    { w: 1920, h: 1080 },
  );
  assert.match(ass, /PlayResX: 1920/);
  assert.match(ass, /Style: Default,Be Vietnam Pro,48,&H00FFFFFF/);
  assert.match(ass, /Dialogue: 0,0:00:01\.00,0:00:03\.50,Default,,0,0,0,,Ăn quả nhớ kẻ trồng cây/);
});

test("buildAss skips empty and inverted segments", () => {
  const ass = buildAss(
    [
      { i: 0, startMs: 0, endMs: 1000, text: "  " },
      { i: 1, startMs: 2000, endMs: 1000, text: "đảo ngược" },
      { i: 2, startMs: 3000, endMs: 4000, text: "hợp lệ" },
    ],
    STYLE_PRESETS[2],
    { w: 1080, h: 1920 },
  );
  const dialogues = ass.split("\n").filter((l) => l.startsWith("Dialogue:"));
  assert.equal(dialogues.length, 1);
  assert.match(dialogues[0], /hợp lệ/);
});
