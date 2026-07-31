import "server-only";
import nodemailer from "nodemailer";
import { SITE_NAME, SITE_URL } from "@/lib/site";

/**
 * Gửi email qua Gmail SMTP. Cần env:
 *   GMAIL_USER          = địa chỉ Gmail gửi đi (vd subvideoaiglobal@gmail.com)
 *   GMAIL_APP_PASSWORD  = App Password 16 ký tự (KHÔNG phải mật khẩu Gmail thường;
 *                         tạo ở myaccount.google.com/apppasswords, cần bật 2FA)
 * Chưa cấu hình → ném lỗi rõ ràng để biết mà điền env.
 */
function transporter() {
  const user = process.env.GMAIL_USER;
  const pass = process.env.GMAIL_APP_PASSWORD;
  if (!user || !pass) {
    throw new Error(
      "Chưa cấu hình gửi email: thiếu GMAIL_USER / GMAIL_APP_PASSWORD",
    );
  }
  return nodemailer.createTransport({
    service: "gmail",
    auth: { user, pass },
  });
}

/** Gửi email đặt lại mật khẩu (link do better-auth sinh ra). */
export async function sendResetPasswordEmail(to: string, resetUrl: string) {
  const from = `${SITE_NAME} <${process.env.GMAIL_USER}>`;
  await transporter().sendMail({
    from,
    to,
    subject: `Đặt lại mật khẩu — ${SITE_NAME}`,
    text:
      `Bạn (hoặc ai đó) đã yêu cầu đặt lại mật khẩu cho tài khoản ${to} tại ${SITE_NAME}.\n\n` +
      `Bấm vào link sau để đặt mật khẩu mới (hết hạn sau 1 giờ):\n${resetUrl}\n\n` +
      `Nếu không phải bạn yêu cầu, hãy bỏ qua email này — mật khẩu của bạn không thay đổi.`,
    html: `
      <div style="font-family:system-ui,-apple-system,Segoe UI,sans-serif;max-width:480px;margin:0 auto;padding:24px;color:#1f2937">
        <h2 style="margin:0 0 8px;font-size:20px;color:#ee5631">${SITE_NAME}</h2>
        <p style="margin:0 0 16px;color:#4b5563">Yêu cầu đặt lại mật khẩu cho tài khoản <b>${to}</b>.</p>
        <a href="${resetUrl}" style="display:inline-block;background:#ee5631;color:#fff;text-decoration:none;font-weight:600;padding:12px 24px;border-radius:10px">Đặt mật khẩu mới</a>
        <p style="margin:16px 0 0;font-size:13px;color:#9ca3af">Link hết hạn sau 1 giờ. Không phải bạn yêu cầu? Bỏ qua email này.</p>
        <p style="margin:16px 0 0;font-size:12px;color:#9ca3af">Hoặc mở link: <br>${resetUrl}</p>
        <p style="margin:20px 0 0;font-size:12px;color:#c0c4cc">${SITE_URL}</p>
      </div>`,
  });
}
