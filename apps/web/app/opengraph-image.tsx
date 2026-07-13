import { ImageResponse } from "next/og";
import { SITE_NAME } from "@/lib/site";

/**
 * Ảnh share mạng xã hội (og:image) 1200×630 — sinh lúc build, áp cho mọi trang.
 * Font Be Vietnam Pro tải từ Google Fonts (subset đúng ký tự dùng) để dấu
 * tiếng Việt hiển thị chuẩn; nếu tải lỗi thì rơi về font mặc định thay vì fail build.
 */
export const alt = "Dịch Video AI — Việt hóa & lồng tiếng video bằng AI";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const TAGLINE = "Việt hóa & lồng tiếng video bằng AI";
const CHIPS = ["Tách phụ đề", "Dịch chuẩn văn nói", "Lồng tiếng 322+ giọng"];

async function loadVietnameseFont(text: string): Promise<ArrayBuffer | null> {
  try {
    const css = await fetch(
      `https://fonts.googleapis.com/css2?family=Be+Vietnam+Pro:wght@700&text=${encodeURIComponent(text)}`,
    ).then((r) => r.text());
    const url = /src: url\((.+?)\) format\('(?:truetype|opentype)'\)/.exec(css)?.[1];
    if (!url) return null;
    return await fetch(url).then((r) => r.arrayBuffer());
  } catch {
    return null;
  }
}

export default async function OpengraphImage() {
  const font = await loadVietnameseFont(SITE_NAME + TAGLINE + CHIPS.join(""));

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 28,
          backgroundColor: "#14100c",
          fontFamily: "BeVietnamPro",
        }}
      >
        {/* glow cam thương hiệu */}
        <div
          style={{
            position: "absolute",
            top: -220,
            left: 260,
            width: 680,
            height: 520,
            borderRadius: 9999,
            background:
              "radial-gradient(circle, rgba(238,86,49,0.45) 0%, rgba(238,86,49,0) 70%)",
          }}
        />
        {/* logo: khối gradient + nút play */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: 96,
            height: 96,
            borderRadius: 28,
            background: "linear-gradient(135deg, #ee5631 0%, #7c3add 100%)",
          }}
        >
          <svg width="38" height="42" viewBox="0 0 38 42" style={{ marginLeft: 7 }}>
            <path d="M2 2 L36 21 L2 40 Z" fill="#ffffff" />
          </svg>
        </div>
        <div style={{ display: "flex", fontSize: 84, fontWeight: 700, color: "#ffffff" }}>
          {SITE_NAME}
        </div>
        <div style={{ display: "flex", fontSize: 36, color: "#f8a288" }}>{TAGLINE}</div>
        <div style={{ display: "flex", gap: 16, marginTop: 14 }}>
          {CHIPS.map((chip) => (
            <div
              key={chip}
              style={{
                display: "flex",
                padding: "10px 24px",
                borderRadius: 9999,
                border: "1px solid rgba(255,255,255,0.18)",
                backgroundColor: "rgba(255,255,255,0.05)",
                fontSize: 24,
                color: "#d4d4d4",
              }}
            >
              {chip}
            </div>
          ))}
        </div>
      </div>
    ),
    {
      ...size,
      fonts: font
        ? [{ name: "BeVietnamPro", data: font, weight: 700, style: "normal" }]
        : undefined,
    },
  );
}
