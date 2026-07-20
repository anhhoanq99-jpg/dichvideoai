import assert from "node:assert/strict";
import { test } from "node:test";
import {
  buildFiltergraph,
  escapeFilterPath,
  outputResolution,
  regionToPixels,
  safeBoxblur,
  sanitizeDrawText,
} from "./filtergraph";

const BASE = {
  srcWidth: 1920,
  srcHeight: 1080,
  assPath: "C:\\tmp\\subs.ass",
  fontsDir: "C:\\repo\\fonts",
} as const;

test("escapeFilterPath handles Windows paths", () => {
  assert.equal(escapeFilterPath("C:\\tmp\\subs.ass"), "C\\:/tmp/subs.ass");
});

test("regionToPixels denormalizes, evens, clamps — x=0 stays 0", () => {
  const r = regionToPixels({ x: 0, y: 0.8, w: 1, h: 0.2 }, 1920, 1080);
  assert.equal(r.x, 0);
  assert.equal(r.w, 1920);
  const big = regionToPixels({ x: 0.9, y: 0.9, w: 0.5, h: 0.5 }, 1920, 1080);
  assert.ok(big.x + big.w <= 1920);
  assert.ok(big.y + big.h <= 1080);
});

test("no cover, keep aspect → single ass step", () => {
  const g = buildFiltergraph({ ...BASE, coverMode: "none", aspect: "keep" });
  assert.match(g, /^\[0:v\]ass=filename='C\\:\/tmp\/subs\.ass':fontsdir='C\\:\/repo\/fonts'\[v\]$/);
});

// ---- Vùng che gắn theo từng dòng phụ đề (che chữ nước ngoài xuất hiện rải rác) ----

const COVERS = [
  { box: { x: 0.1, y: 0.8, w: 0.8, h: 0.1 }, startMs: 1500, endMs: 3200 },
  { box: { x: 0.4, y: 0.2, w: 0.2, h: 0.08 }, startMs: 5000, endMs: 6000 },
];

test("lineCovers box mode: 1 drawbox/dòng, bật đúng khoảng thời gian", () => {
  const g = buildFiltergraph({
    ...BASE,
    coverMode: "box",
    lineCovers: COVERS,
    aspect: "keep",
  });
  assert.equal((g.match(/drawbox=/g) ?? []).length, 2);
  // giây, không phải ms — sai đơn vị là bug im lặng (che cả video)
  assert.match(g, /enable='between\(t,1\.500,3\.200\)'/);
  assert.match(g, /enable='between\(t,5\.000,6\.000\)'/);
  assert.match(g, /\[lc1\]ass=/); // chuỗi che nối vào bước burn phụ đề
});

test("lineCovers blur mode: CHỈ blur 1 lần cho cả khung rồi dán lại từng ô", () => {
  const g = buildFiltergraph({
    ...BASE,
    coverMode: "blur",
    lineCovers: COVERS,
    aspect: "keep",
  });
  // mấu chốt hiệu năng: blur 1 lượt duy nhất dù có bao nhiêu dòng
  assert.equal((g.match(/boxblur=luma_radius/g) ?? []).length, 1);
  assert.match(g, /split=2\[lb0\]\[lb1\]/);
  assert.equal((g.match(/overlay=\d+:\d+:enable=/g) ?? []).length, 2);
  assert.match(g, /\[lcov1\]ass=/);
});

test("lineCovers blur mode với 1 dòng: không dùng split=1", () => {
  const g = buildFiltergraph({
    ...BASE,
    coverMode: "blur",
    lineCovers: [COVERS[0]],
    aspect: "keep",
  });
  assert.doesNotMatch(g, /split=1/);
  assert.match(g, /\[lblursrc\]boxblur=luma_radius=\d+[^[\]]*\[lb0\]/);
  assert.match(g, /\[lcov0\]ass=/);
});

test("lineCovers: coverMode none → bỏ qua hoàn toàn", () => {
  const g = buildFiltergraph({
    ...BASE,
    coverMode: "none",
    lineCovers: COVERS,
    aspect: "keep",
  });
  assert.doesNotMatch(g, /drawbox|lcov|boxblur/);
});

test("lineCovers: bỏ ô có thời gian không hợp lệ (end <= start)", () => {
  const g = buildFiltergraph({
    ...BASE,
    coverMode: "box",
    lineCovers: [COVERS[0], { box: COVERS[1].box, startMs: 9000, endMs: 9000 }],
    aspect: "keep",
  });
  assert.equal((g.match(/drawbox=/g) ?? []).length, 1);
});

test("lineCovers dùng CHUNG với vùng che toàn thời lượng — nối tiếp nhau", () => {
  const g = buildFiltergraph({
    ...BASE,
    coverMode: "box",
    regions: [{ x: 0, y: 0.9, w: 1, h: 0.1 }],
    lineCovers: [COVERS[0]],
    aspect: "keep",
  });
  // vùng toàn thời lượng KHÔNG có enable, vùng theo dòng thì CÓ
  assert.match(g, /\[0:v\]drawbox=[^;]*t=fill\[cov0\]/);
  assert.match(g, /\[cov0\]drawbox=[^;]*enable='between\(t,1\.500,3\.200\)'\[lc0\]/);
});

test("lineCovers nằm TRƯỚC bước đổi khung hình (toạ độ hệ video nguồn)", () => {
  const g = buildFiltergraph({
    ...BASE,
    coverMode: "box",
    lineCovers: [COVERS[0]],
    aspect: "9:16",
  });
  assert.ok(g.indexOf("drawbox=") < g.indexOf("[bgsrc]"));
});

test("multi-region blur: one chain per region, chained sequentially", () => {
  const g = buildFiltergraph({
    ...BASE,
    coverMode: "blur",
    regions: [
      { x: 0, y: 0.8, w: 1, h: 0.2 },
      { x: 0.3, y: 0.05, w: 0.4, h: 0.06 },
    ],
    aspect: "keep",
  });
  assert.equal((g.match(/boxblur=luma_radius/g) ?? []).length, 2);
  assert.match(g, /\[cov0\]/);
  assert.match(g, /\[cov1\]ass=/);
});

test("multi-region box mode uses drawbox per region", () => {
  const g = buildFiltergraph({
    ...BASE,
    coverMode: "box",
    regions: [
      { x: 0.1, y: 0.85, w: 0.8, h: 0.1 },
      { x: 0.05, y: 0.05, w: 0.3, h: 0.08 },
    ],
    aspect: "keep",
  });
  assert.equal((g.match(/drawbox/g) ?? []).length, 2);
});

test("9:16 reframe: covers happen BEFORE scaling, ass last", () => {
  const g = buildFiltergraph({
    ...BASE,
    coverMode: "box",
    regions: [{ x: 0, y: 0.8, w: 1, h: 0.2 }],
    aspect: "9:16",
  });
  const coverIdx = g.indexOf("drawbox");
  const scaleIdx = g.indexOf("scale=1080:1920");
  const assIdx = g.indexOf("ass=");
  assert.ok(coverIdx < scaleIdx, "cover must precede reframe");
  assert.ok(scaleIdx < assIdx, "reframe must precede ass burn");
});

test("outputResolution matches aspect presets", () => {
  assert.deepEqual(outputResolution({ srcWidth: 1280, srcHeight: 720, aspect: "keep" }), { w: 1280, h: 720 });
  assert.deepEqual(outputResolution({ srcWidth: 1280, srcHeight: 720, aspect: "9:16" }), { w: 1080, h: 1920 });
});

test("subBoxToMargins: keep aspect — direct pixel margins", async () => {
  const { subBoxToMargins } = await import("./filtergraph");
  const m = subBoxToMargins({ x: 0.1, y: 0.72, w: 0.8, h: 0.18 }, 1920, 1080, "keep");
  assert.equal(m.marginL, 192);
  assert.equal(m.marginR, 192); // 1920 - (192 + 1536)
  assert.equal(m.marginV, Math.round(1080 - 0.9 * 1080)); // 108
});

test("sanitizeDrawText neutralizes quote/backslash/expansion", () => {
  assert.equal(sanitizeDrawText("Kênh 'ABC' \\ %{pts}"), "Kênh ’ABC’ / %%{pts}");
});

test("logo: drawtext is the last step, after ass burn", () => {
  const g = buildFiltergraph({
    ...BASE,
    coverMode: "none",
    aspect: "keep",
    logo: {
      text: "Kênh Của Tôi",
      position: "tr",
      fontSize: 28,
      color: "#FFFFFF",
      opacity: 80,
      fontFile: "C:\\repo\\fonts\\BeVietnamPro-Bold.ttf",
    },
  });
  const assIdx = g.indexOf("ass=");
  const dtIdx = g.indexOf("drawtext=");
  assert.ok(assIdx >= 0 && dtIdx > assIdx, "drawtext must come after ass");
  assert.match(g, /fontcolor=0xFFFFFF@0\.8/);
  assert.match(g, /x=w-tw-24:y=24/);
  assert.match(g, /\[v\]$/);
});

test("subBoxToMargins: 9:16 — box follows centered fit transform", async () => {
  const { subBoxToMargins } = await import("./filtergraph");
  // 1920x1080 source into 1080x1920: s = 1080/1920 = 0.5625 → fg 1080x607.5, oy ≈ 656
  const m = subBoxToMargins({ x: 0, y: 0.8, w: 1, h: 0.2 }, 1920, 1080, "9:16");
  assert.equal(m.marginL, 0);
  assert.equal(m.marginR, 0);
  // bottom of fg = oy + 607.5 ≈ 1264 → marginV = 1920 - 1264 ≈ 656
  assert.ok(Math.abs(m.marginV - 656) <= 2, `marginV=${m.marginV}`);
});

// ---- Ban kinh lam mo phai vua voi kich thuoc vung che (loi that 20/07) ----

test("safeBoxblur: vung nho bi kep ban kinh theo mat phang MAU (yuv420p)", () => {
  // vung 150x30 -> mat mau 75x15 -> ffmpeg doi chroma radius < 7
  const f = safeBoxblur(150, 30, 12);
  const chroma = Number(/chroma_radius=(\d+)/.exec(f)![1]);
  const luma = Number(/luma_radius=(\d+)/.exec(f)![1]);
  assert.ok(chroma < 7, `chroma ${chroma} phai < 7`);
  assert.ok(luma < 15, `luma ${luma} phai < 15`);
});

test("safeBoxblur: vung to thi giu nguyen ban kinh mong muon", () => {
  const f = safeBoxblur(852, 480, 12);
  assert.match(f, /luma_radius=12/);
  assert.match(f, /chroma_radius=12/);
});

test("safeBoxblur: vung cuc nho van hop le, nho den muc khong mo noi thi bo han", () => {
  // 4x4: mat sang cho ban kinh 1 (<2), mat mau 2x2 chi cho 0 -> van hop le
  const tiny = safeBoxblur(4, 4, 12);
  assert.match(tiny, /luma_radius=1\b/);
  assert.match(tiny, /chroma_radius=0\b/);
  // 2x2: khong con ban kinh nao hop le -> bo filter, giu nguyen anh con hon fail job
  assert.equal(safeBoxblur(2, 2, 12), "");
});

test("safeBoxblur: LUON dat chroma_radius tuong minh", () => {
  // khong dat thi ffmpeg lay chroma = luma -> vuot gioi han mat mau
  for (const [w, h] of [[150, 30], [852, 480], [64, 64], [320, 18]]) {
    const f = safeBoxblur(w, h, 12);
    if (f) assert.match(f, /chroma_radius=/, `${w}x${h} thieu chroma_radius`);
  }
});

test("filtergraph: vung che nho khong con sinh boxblur qua kho", () => {
  const g = buildFiltergraph({
    ...BASE,
    srcWidth: 852,
    srcHeight: 480,
    coverMode: "blur",
    // dung 2 vung THAT tu job that bai
    regions: [
      { x: 0.2302, y: 0.8349, w: 0.5291, h: 0.0618 },
      { x: 0.0160, y: 0.0351, w: 0.1768, h: 0.0659 },
    ],
    blurStrength: 5,
    aspect: "keep",
  });
  for (const m of g.matchAll(/crop=(\d+):(\d+):[^,\[]*(?:,boxblur=luma_radius=(\d+)[^,\[]*chroma_radius=(\d+))?/g)) {
    const [, w, h, luma, chroma] = m;
    if (!luma) continue;
    const short = Math.min(Number(w), Number(h));
    assert.ok(Number(luma) < short / 2, `luma ${luma} vuot voi vung ${w}x${h}`);
    assert.ok(Number(chroma) < short / 4, `chroma ${chroma} vuot voi vung ${w}x${h}`);
  }
});
