// Do ti le tuong phan THAT theo cong thuc WCAG cho cac nut chu trang tren nen
// thuong hieu. Chuan AA: >= 4.5:1 cho chu thuong, >= 3:1 cho chu to/dam.
//
//   cd apps/worker && npx tsx ../web/scripts/check-contrast.ts

/** Kenh mau -> do sang tuyen tinh (WCAG 2.x) */
function channel(c: number): number {
  const s = c / 255;
  return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
}

function luminance(hex: string): number {
  const h = hex.replace("#", "");
  const r = Number.parseInt(h.slice(0, 2), 16);
  const g = Number.parseInt(h.slice(2, 4), 16);
  const b = Number.parseInt(h.slice(4, 6), 16);
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

function ratio(fg: string, bg: string): number {
  const a = luminance(fg);
  const b = luminance(bg);
  const [hi, lo] = a > b ? [a, b] : [b, a];
  return (hi + 0.05) / (lo + 0.05);
}

// lay tu apps/web/app/globals.css
const C = {
  "primary-500": "#ee5631",
  "primary-600": "#d94318",
  "primary-700": "#b53512",
  "primary-800": "#912d14",
  "success-600": "#059669",
  "success-700": "#047857",
  "success-800": "#065f46",
};

const WHITE = "#ffffff";
const AA = 4.5;

const rows: [string, string, string][] = [
  ["Nut dang nhap        TRUOC", "primary-500", "sau: primary-700"],
  ["Nut dang nhap        SAU  ", "primary-700", ""],
  ["Button primitive     TRUOC", "primary-600", "sau: primary-700"],
  ["Button primitive     SAU  ", "primary-700", ""],
  ["Nut Xuat file/tien   TRUOC", "success-600", "sau: success-700"],
  ["Nut Xuat file/tien   SAU  ", "success-700", ""],
  ["hover Xuat file      SAU  ", "success-800", ""],
  ["hover primary        SAU  ", "primary-800", ""],
];

let fail = 0;
for (const [label, token, note] of rows) {
  const r = ratio(WHITE, C[token as keyof typeof C]);
  const ok = r >= AA;
  const isAfter = label.includes("SAU");
  if (isAfter && !ok) fail++;
  console.log(
    `${ok ? "DAT " : "TRUOT"} ${label}  ${token.padEnd(12)} ${r.toFixed(2)}:1 ${note}`,
  );
}

console.log(
  fail === 0
    ? "\nMoi nut SAU khi sua deu dat WCAG AA (>= 4.5:1)"
    : `\n${fail} nut SAU khi sua VAN TRUOT`,
);
if (fail > 0) process.exitCode = 1;
