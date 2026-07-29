/**
 * Sinh `app/favicon.ico` + `app/apple-icon.png` TỪ `app/icon.svg` — một nguồn
 * hình duy nhất, khỏi cảnh mỗi file một logo khác nhau.
 *
 * Chạy lại mỗi khi đổi logo:  pnpm --filter web gen:icons
 *
 * Vì sao cần cả 3 file (xem docs Next `app-icons.md` + favicon handbook):
 *  - `icon.svg`      → Chrome/Edge/Firefox, sắc nét ở mọi cỡ và mọi mật độ điểm ảnh
 *  - `favicon.ico`   → Safari + trình duyệt cũ + Windows (KHÔNG sinh bằng code được,
 *                      Next bắt buộc phải là file .ico thật nằm ở gốc `app/`)
 *  - `apple-icon.png`→ iOS thêm vào màn hình chính (apple-icon chỉ nhận PNG/JPG)
 *
 * Rasterize bằng chính `next/og` (satori + resvg) — máy không có ImageMagick/sharp.
 */
import { createElement as h } from "react";
import { writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { ImageResponse } from "next/og";

const APP_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../app");

/**
 * Dưới ngưỡng này, sóng âm và vạch phụ đề nhoè thành một cục xám — bản 16px đầy
 * đủ không còn nhận ra là logo gì. ICO cho phép MỖI CỠ một bản vẽ khác nhau, nên
 * cỡ nhỏ chỉ giữ nút play phóng to. Vẫn nhận ra thương hiệu nhờ màu + khối bo góc.
 */
const SIMPLIFY_BELOW_PX = 24;

/** Bản rút gọn cho cỡ nhỏ: chỉ nút play, căn giữa khung 40×40. */
function markSimple(size: number) {
  return h(
    "svg",
    { width: size, height: size, viewBox: "0 0 40 40" },
    h("path", { d: "M14.5 9.5 L30.5 20 L14.5 30.5 Z", fill: "#fff" }),
  );
}

/** Bản đầy đủ — khớp từng toạ độ với BrandMark trong components/brand-logo.tsx. */
function markFull(size: number) {
  return h(
    "svg",
    { width: size, height: size, viewBox: "0 0 40 40" },
    // nút play — video
    h("path", { d: "M13.5 10.5v13l11-6.5z", fill: "#fff" }),
    // sóng âm — lồng tiếng
    h("path", {
      d: "M28 13a7.5 7.5 0 0 1 0 8",
      stroke: "#fff",
      strokeWidth: 2.2,
      strokeLinecap: "round",
      fill: "none",
      opacity: 0.9,
    }),
    h("path", {
      d: "M31.5 10.5a12 12 0 0 1 0 13",
      stroke: "#fff",
      strokeWidth: 2.2,
      strokeLinecap: "round",
      fill: "none",
      opacity: 0.5,
    }),
    // vạch phụ đề — sub
    h("rect", { x: 9, y: 28.5, width: 15, height: 3.4, rx: 1.7, fill: "#fff", opacity: 0.95 }),
    h("rect", { x: 26, y: 28.5, width: 5.5, height: 3.4, rx: 1.7, fill: "#fff", opacity: 0.5 }),
  );
}

/**
 * Vẽ lại BrandMark bằng đúng bộ primitive mà satori hỗ trợ: nền bo góc +
 * gradient làm bằng CSS trên div, các hình bên trong bằng inline SVG (cùng cách
 * `app/opengraph-image.tsx` đang làm và đã chạy được).
 *
 * KHÔNG dùng `<img src="data:image/svg+xml…">` — satori bỏ qua, ra ảnh trắng trơn.
 */
export async function renderPng(size: number): Promise<Buffer> {
  const mark = size < SIMPLIFY_BELOW_PX ? markSimple(size) : markFull(size);

  const res = new ImageResponse(
    h(
      "div",
      {
        style: {
          display: "flex",
          width: "100%",
          height: "100%",
          alignItems: "center",
          justifyContent: "center",
          // rx=11 trên khung 40 → giữ đúng tỉ lệ bo góc ở mọi cỡ
          borderRadius: Math.round((11 / 40) * size),
          background: "linear-gradient(135deg, #ee5631 0%, #7c3add 100%)",
        },
      },
      mark,
    ),
    { width: size, height: size },
  );
  return Buffer.from(await res.arrayBuffer());
}

/**
 * Gói nhiều PNG thành một file .ico. Từ Windows Vista trở đi (và mọi trình duyệt
 * hiện hành) ICO cho phép nhét thẳng dữ liệu PNG vào từng entry, nên không cần
 * encode BMP thủ công.
 */
function buildIco(images: { size: number; png: Buffer }[]): Buffer {
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0); // reserved
  header.writeUInt16LE(1, 2); // type 1 = icon
  header.writeUInt16LE(images.length, 4);

  const entries = Buffer.alloc(16 * images.length);
  let offset = 6 + 16 * images.length;
  for (const [i, img] of images.entries()) {
    const at = 16 * i;
    // 256px được ghi là 0 theo đặc tả ICO
    entries.writeUInt8(img.size >= 256 ? 0 : img.size, at);
    entries.writeUInt8(img.size >= 256 ? 0 : img.size, at + 1);
    entries.writeUInt8(0, at + 2); // số màu bảng màu (0 = truecolor)
    entries.writeUInt8(0, at + 3); // reserved
    entries.writeUInt16LE(1, at + 4); // color planes
    entries.writeUInt16LE(32, at + 6); // bits per pixel
    entries.writeUInt32LE(img.png.length, at + 8);
    entries.writeUInt32LE(offset, at + 12);
    offset += img.png.length;
  }
  return Buffer.concat([header, entries, ...images.map((i) => i.png)]);
}

const ICO_SIZES = [16, 32, 48];

const icoImages = [];
for (const size of ICO_SIZES) {
  icoImages.push({ size, png: await renderPng(size) });
}
const ico = buildIco(icoImages);
writeFileSync(path.join(APP_DIR, "favicon.ico"), ico);
console.log(`favicon.ico   : ${ICO_SIZES.join("/")}px, ${ico.length} byte`);

const apple = await renderPng(180);
writeFileSync(path.join(APP_DIR, "apple-icon.png"), apple);
console.log(`apple-icon.png: 180px, ${apple.length} byte`);
