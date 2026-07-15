import { NextResponse, type NextRequest } from "next/server";
import { GetObjectCommand, HeadObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { getR2, r2Bucket } from "@/lib/r2";

/** 2 khe video demo trên trang chủ ("Xem kết quả thực tế"). */
const SLOTS: Record<string, string> = {
  goc: "goc.mp4",
  "ban-viet": "ban-viet.mp4",
};

/**
 * GET /api/demo/:slot — phục vụ video demo trang chủ.
 * Admin đã upload → redirect sang R2 (hỗ trợ tua/range); chưa có → dùng file
 * bundled trong public/demo. Redirect cache 5 phút cho nhẹ.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ slot: string }> },
) {
  const { slot } = await params;
  const file = SLOTS[slot];
  if (!file) return new NextResponse("Not found", { status: 404 });

  const key = `demo/${file}`;
  try {
    await getR2().send(new HeadObjectCommand({ Bucket: r2Bucket(), Key: key }));
    const url = await getSignedUrl(
      getR2(),
      new GetObjectCommand({ Bucket: r2Bucket(), Key: key }),
      { expiresIn: 3600 },
    );
    return new NextResponse(null, {
      status: 302,
      headers: { Location: url, "Cache-Control": "public, max-age=300" },
    });
  } catch {
    // admin chưa upload → dùng video demo mặc định trong public/demo
    return new NextResponse(null, {
      status: 302,
      headers: {
        Location: new URL(`/demo/${file}`, req.url).toString(),
        "Cache-Control": "public, max-age=300",
      },
    });
  }
}
