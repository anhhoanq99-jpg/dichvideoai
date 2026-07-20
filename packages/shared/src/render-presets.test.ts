import assert from "node:assert/strict";
import { test } from "node:test";
import { buildAss, hexToAss } from "./ass-builder";
import { RENDER_FONTS, STYLE_PRESETS, opacityToHexAlpha } from "./render-presets";

const SEGS = [{ i: 0, startMs: 0, endMs: 2000, text: "Ăn quả nhớ kẻ trồng cây" }];
const HEX = /^#[0-9A-Fa-f]{6}$/;

test("mỗi preset dùng font ĐÃ bundle trong worker (sai tên → libass âm thầm đổi font khác)", () => {
  for (const p of STYLE_PRESETS) {
    assert.ok(
      (RENDER_FONTS as readonly string[]).includes(p.font),
      `preset "${p.id}" dùng font chưa bundle: ${p.font}`,
    );
  }
});

test("id preset là duy nhất", () => {
  const ids = STYLE_PRESETS.map((p) => p.id);
  assert.equal(new Set(ids).size, ids.length);
});

test("màu của preset đúng dạng #RRGGBB và chuyển được sang ASS", () => {
  for (const p of STYLE_PRESETS) {
    for (const [field, color] of [
      ["primary", p.primary],
      ["outline", p.outline],
      ...(p.back ? ([["back", p.back]] as const) : []),
      ...(p.accent ? ([["accent", p.accent]] as const) : []),
    ] as const) {
      assert.match(color, HEX, `preset "${p.id}" màu ${field} sai dạng: ${color}`);
      assert.doesNotThrow(() => hexToAss(color));
    }
  }
});

test("preset dùng hộp nền (borderStyle 3) phải có màu nền + độ đục 0..100", () => {
  for (const p of STYLE_PRESETS.filter((x) => x.borderStyle === 3)) {
    assert.ok(p.back, `preset "${p.id}" borderStyle=3 nhưng thiếu back`);
    if (p.backOpacity !== undefined) {
      assert.ok(
        p.backOpacity >= 0 && p.backOpacity <= 100,
        `preset "${p.id}" backOpacity ngoài khoảng: ${p.backOpacity}`,
      );
    }
  }
});

test("mọi preset build ra ASS hợp lệ", () => {
  for (const p of STYLE_PRESETS) {
    const ass = buildAss(SEGS, p, { w: 1920, h: 1080 });
    assert.ok(ass.includes("[Script Info]"), `preset "${p.id}" thiếu Script Info`);
    assert.ok(ass.includes(p.font), `preset "${p.id}" không nhúng tên font vào Style`);
    assert.ok(ass.includes("Ăn quả nhớ kẻ trồng cây"), `preset "${p.id}" mất lời thoại`);
  }
});

test("cỡ chữ và lề dưới nằm trong khoảng hợp lý", () => {
  for (const p of STYLE_PRESETS) {
    assert.ok(p.size >= 20 && p.size <= 90, `preset "${p.id}" size lạ: ${p.size}`);
    assert.ok(p.marginV >= 0 && p.marginV <= 300, `preset "${p.id}" marginV lạ: ${p.marginV}`);
  }
});

test("opacityToHexAlpha: chuyen dung va kep trong 0..100", () => {
  assert.equal(opacityToHexAlpha(100), "FF");
  assert.equal(opacityToHexAlpha(0), "00");
  assert.equal(opacityToHexAlpha(67), "AB");
  assert.equal(opacityToHexAlpha(55), "8C");
  // luon 2 ky tu — thieu se lam hong chuoi #RRGGBBAA
  for (let p = 0; p <= 100; p++) assert.equal(opacityToHexAlpha(p).length, 2);
  // ngoai khoang thi kep lai, khong sinh hex rac
  assert.equal(opacityToHexAlpha(-20), "00");
  assert.equal(opacityToHexAlpha(500), "FF");
});
