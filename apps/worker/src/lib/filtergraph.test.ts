import assert from "node:assert/strict";
import { test } from "node:test";
import {
  buildFiltergraph,
  escapeFilterPath,
  outputResolution,
  regionToPixels,
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

test("regionToPixels denormalizes, evens, clamps", () => {
  const r = regionToPixels({ x: 0.1, y: 0.8, w: 0.8, h: 0.15 }, 1920, 1080);
  assert.equal(r.x % 2, 0);
  assert.equal(r.y % 2, 0);
  assert.equal(r.w % 2, 0);
  assert.equal(r.h % 2, 0);
  assert.ok(r.x + r.w <= 1920);
  assert.ok(r.y + r.h <= 1080);
  // overflow region clamps to frame
  const big = regionToPixels({ x: 0.9, y: 0.9, w: 0.5, h: 0.5 }, 1920, 1080);
  assert.ok(big.x + big.w <= 1920);
  assert.ok(big.y + big.h <= 1080);
});

test("no cover, keep aspect → single ass step", () => {
  const g = buildFiltergraph({ ...BASE, coverMode: "none", aspect: "keep" });
  assert.match(g, /^\[0:v\]ass=filename='C\\:\/tmp\/subs\.ass':fontsdir='C\\:\/repo\/fonts'\[v\]$/);
});

test("blur cover chains crop/boxblur/overlay before ass", () => {
  const g = buildFiltergraph({
    ...BASE,
    coverMode: "blur",
    region: { x: 0, y: 0.8, w: 1, h: 0.2 },
    aspect: "keep",
  });
  assert.match(g, /split\[main\]\[forblur\]/);
  assert.match(g, /crop=1920:216:0:864,boxblur/);
  assert.match(g, /\[cov\]ass=/);
});

test("box cover uses drawbox fill", () => {
  const g = buildFiltergraph({
    ...BASE,
    coverMode: "box",
    region: { x: 0.1, y: 0.85, w: 0.8, h: 0.1 },
    aspect: "keep",
  });
  assert.match(g, /drawbox=x=\d+:y=\d+:w=\d+:h=\d+:color=0x101010@1:t=fill\[cov\]/);
});

test("9:16 reframe: cover happens BEFORE scaling, ass last", () => {
  const g = buildFiltergraph({
    ...BASE,
    coverMode: "box",
    region: { x: 0, y: 0.8, w: 1, h: 0.2 },
    aspect: "9:16",
  });
  const coverIdx = g.indexOf("drawbox");
  const scaleIdx = g.indexOf("scale=1080:1920");
  const assIdx = g.indexOf("ass=");
  assert.ok(coverIdx < scaleIdx, "cover must precede reframe");
  assert.ok(scaleIdx < assIdx, "reframe must precede ass burn");
  assert.match(g, /\[framed\]ass=/);
});

test("auto cover: clusters same-spot lines, separate spots stay separate", async () => {
  const { clusterCoverRegions } = await import("./filtergraph");
  const bottomSub = { x: 0.2, y: 0.85, w: 0.6, h: 0.08 };
  const topTitle = { x: 0.3, y: 0.05, w: 0.4, h: 0.06 };
  const clusters = clusterCoverRegions([
    { i: 0, startMs: 0, endMs: 2000, text: "a", box: bottomSub },
    { i: 1, startMs: 2100, endMs: 4000, text: "b", box: bottomSub },
    { i: 2, startMs: 1000, endMs: 3000, text: "title", box: topTitle },
    { i: 3, startMs: 10_000, endMs: 12_000, text: "c", box: bottomSub },
  ]);
  assert.equal(clusters.length, 2);
  const bottom = clusters.find((c) => c.box.y > 0.5)!;
  // adjacent windows merged (gap 0.1s + padding), distant window separate
  assert.equal(bottom.windows.length, 2);
});

test("auto cover graph: time-enabled overlays chained before ass", () => {
  const g = buildFiltergraph({
    ...BASE,
    coverMode: "auto",
    segments: [
      { i: 0, startMs: 1000, endMs: 3000, text: "a", box: { x: 0.2, y: 0.85, w: 0.6, h: 0.08 } },
      { i: 1, startMs: 500, endMs: 2000, text: "t", box: { x: 0.3, y: 0.05, w: 0.4, h: 0.06 } },
    ],
    aspect: "keep",
  });
  assert.match(g, /overlay=\d+:\d+:enable='between\(t,[\d.]+,[\d.]+\)'/);
  assert.equal((g.match(/boxblur/g) ?? []).length, 2);
  assert.ok(g.indexOf("enable=") < g.indexOf("ass="), "covers precede ass");
});

test("auto cover caps cluster count", async () => {
  const { clusterCoverRegions } = await import("./filtergraph");
  const many = Array.from({ length: 60 }, (_, k) => ({
    i: k,
    startMs: k * 1000,
    endMs: k * 1000 + 900,
    text: String(k),
    box: { x: (k % 10) * 0.1, y: Math.floor(k / 10) * 0.15, w: 0.05, h: 0.05 },
  }));
  const clusters = clusterCoverRegions(many);
  assert.ok(clusters.length <= 24);
});

test("outputResolution matches aspect presets", () => {
  assert.deepEqual(outputResolution({ srcWidth: 1280, srcHeight: 720, aspect: "keep" }), { w: 1280, h: 720 });
  assert.deepEqual(outputResolution({ srcWidth: 1280, srcHeight: 720, aspect: "9:16" }), { w: 1080, h: 1920 });
});
