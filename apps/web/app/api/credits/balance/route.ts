import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { schema } from "@dichvideo/db";
import { db } from "@/lib/db";
import { getSession } from "@/lib/session";
import { jsonError } from "@/lib/api-helpers";

/** Số dư credits hiện tại — trang Nạp tiền poll để báo "tiền đã vào" tức thì. */
export async function GET() {
  const session = await getSession();
  if (!session) return jsonError("Chưa đăng nhập", 401);
  const [row] = await db
    .select({ balance: schema.user.creditBalance })
    .from(schema.user)
    .where(eq(schema.user.id, session.user.id));
  return NextResponse.json({ balance: row?.balance ?? 0 });
}
