import { NextResponse, type NextRequest } from "next/server";
import { GetObjectCommand, HeadObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { getR2, r2Bucket } from "@/lib/r2";

/**
 * Các khe video admin quản lý:
 * - goc / ban-viet: 2 video "Xem kết quả thực tế" trang chủ (có file bundled dự phòng)
 * - huong-dan: video hướng dẫn trang Dịch & lồng tiếng (chỉ hiện khi admin đã upload)
 */
const SLOTS: Record<string, { file: string; fallback: boolean }> = {
  goc: { file: "goc.mp4", fallback: true },
  "ban-viet": { file: "ban-viet.mp4", fallback: true },
  "huong-dan": { file: "huong-dan.mp4", fallback: false },
};

/**
 * GET /api/demo/:slot — phục vụ video (redirect sang R2, hỗ trợ tua).
 * ?check=1 → trả JSON { exists } để client biết có video hay chưa (đỡ hiện player rỗng).
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ slot: string }> },
) {
  const { slot } = await params;
  const cfg = SLOTS[slot];
  if (!cfg) return new NextResponse("Not found", { status: 404 });

  const key = `demo/${cfg.file}`;
  let inR2 = false;
  try {
    await getR2().send(new HeadObjectCommand({ Bucket: r2Bucket(), Key: key }));
    inR2 = true;
  } catch {
    inR2 = false;
  }

  if (req.nextUrl.searchParams.get("check") === "1") {
    return NextResponse.json({ exists: inR2 || cfg.fallback });
  }

  if (inR2) {
    const url = await getSignedUrl(
      getR2(),
      new GetObjectCommand({ Bucket: r2Bucket(), Key: key }),
      { expiresIn: 3600 },
    );
    return new NextResponse(null, {
      status: 302,
      headers: { Location: url, "Cache-Control": "public, max-age=300" },
    });
  }
  if (cfg.fallback) {
    return new NextResponse(null, {
      status: 302,
      headers: {
        Location: new URL(`/demo/${cfg.file}`, req.url).toString(),
        "Cache-Control": "public, max-age=300",
      },
    });
  }
  return new NextResponse("Not found", { status: 404 });
}
