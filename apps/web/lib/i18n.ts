import { cookies } from "next/headers";

/** Ngôn ngữ giao diện — VI mặc định, lưu trong cookie "lang" (1 năm). */
export type Lang = "vi" | "en";

export const LANG_COOKIE = "lang";

export async function getLang(): Promise<Lang> {
  const store = await cookies();
  return store.get(LANG_COOKIE)?.value === "en" ? "en" : "vi";
}
