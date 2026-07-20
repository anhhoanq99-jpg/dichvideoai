import assert from "node:assert/strict";
import { test } from "node:test";
import { buildAss, escapeAssText, hexToAss } from "./ass-builder";
import { STYLE_PRESETS } from "./render-presets";

const SEGS = [{ i: 0, startMs: 1000, endMs: 3500, text: "Ăn quả nhớ kẻ trồng cây" }];

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
  const ass = buildAss(SEGS, STYLE_PRESETS[0], { w: 1920, h: 1080 });
  assert.match(ass, /PlayResX: 1920/);
  assert.match(ass, /Style: Default,Be Vietnam Pro,48,&H00FFFFFF/);
  assert.match(ass, /Dialogue: 0,0:00:01\.00,0:00:03\.50,Default,,0,0,0,,Ăn quả nhớ kẻ trồng cây/);
});

test("buildAss bold flag and boxed borderStyle", () => {
  const boldBox = buildAss(
    SEGS,
    { ...STYLE_PRESETS[0], bold: true, borderStyle: 3, back: "#101010FF" },
    { w: 1920, h: 1080 },
  );
  // Bold = -1, BorderStyle 3 in the style line
  assert.match(boldBox, /,-1,0,0,0,100,100,0,0,3,/);
  assert.match(boldBox, /&H00101010/);
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

// ---- Ghi đè riêng từng dòng: vị trí + cỡ chữ (đặt chữ đè lên chữ nước ngoài) ----

test("buildAss: dong co pos -> pos theo pixel PlayRes, neo giua-duoi", () => {
  const ass = buildAss(
    [{ i: 0, startMs: 0, endMs: 1000, text: "Xin chào", pos: { x: 0.5, y: 0.25 } }],
    STYLE_PRESETS[0],
    { w: 1080, h: 1920 },
  );
  const d = ass.split("\n").find((l) => l.startsWith("Dialogue:"))!;
  // 0.5*1080 = 540, 0.25*1920 = 480
  assert.ok(d.includes("{\\an2\\pos(540,480)}"), d);
});

test("buildAss: dong co size -> fs, dong khong co thi KHONG chen the thua", () => {
  const ass = buildAss(
    [
      { i: 0, startMs: 0, endMs: 1000, text: "To hơn", size: 72 },
      { i: 1, startMs: 1000, endMs: 2000, text: "Bình thường" },
    ],
    STYLE_PRESETS[0],
    { w: 1920, h: 1080 },
  );
  const ds = ass.split("\n").filter((l) => l.startsWith("Dialogue:"));
  assert.ok(ds[0].includes("{\\fs72}"), ds[0]);
  // dòng thường phải sạch thẻ — không có \fs, \pos hay \an2 thừa
  assert.ok(!/\\fs|\\pos|\\an2/.test(ds[1]), ds[1]);
});

test("buildAss: pos va size di cung nhau trong MOT khoi the", () => {
  const ass = buildAss(
    [{ i: 0, startMs: 0, endMs: 1000, text: "Cả hai", pos: { x: 0.25, y: 0.5 }, size: 60 }],
    STYLE_PRESETS[0],
    { w: 1920, h: 1080 },
  );
  const d = ass.split("\n").find((l) => l.startsWith("Dialogue:"))!;
  assert.ok(d.includes("{\\an2\\pos(480,540)\\fs60}"), d);
});

test("buildAss: pos bi kep trong khung, khong cho ra ngoai video", () => {
  const ass = buildAss(
    [{ i: 0, startMs: 0, endMs: 1000, text: "Lệch", pos: { x: 1.8, y: -0.4 } }],
    STYLE_PRESETS[0],
    { w: 1920, h: 1080 },
  );
  const d = ass.split("\n").find((l) => l.startsWith("Dialogue:"))!;
  assert.ok(d.includes("\\pos(1920,0)"), d);
});

test("buildAss: ghi de dung TRUOC the hieu ung nen khong pha hieu ung", () => {
  const ass = buildAss(
    [{ i: 0, startMs: 0, endMs: 1000, text: "Mờ dần", pos: { x: 0.5, y: 0.5 } }],
    STYLE_PRESETS[0],
    { w: 1920, h: 1080 },
    "fade",
  );
  const d = ass.split("\n").find((l) => l.startsWith("Dialogue:"))!;
  assert.ok(d.indexOf("\\pos(") < d.indexOf("\\fad("), d);
});

test("buildAss: size = 0 hoac am bi bo qua (khong sinh fs0 lam mat chu)", () => {
  const ass = buildAss(
    [
      { i: 0, startMs: 0, endMs: 1000, text: "Không", size: 0 },
      { i: 1, startMs: 1000, endMs: 2000, text: "Am", size: -5 },
    ],
    STYLE_PRESETS[0],
    { w: 1920, h: 1080 },
  );
  assert.ok(!ass.includes("\\fs"), ass);
});
