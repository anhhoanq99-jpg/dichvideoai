/**
 * Nhận diện admin qua email — khai báo ADMIN_EMAILS trong .env
 * (nhiều email phân tách bằng dấu phẩy). Không cần cột riêng trong DB.
 */
export function isAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  return (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean)
    .includes(email.toLowerCase());
}
