import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";
import { applyCreditDelta, schema } from "@dichvideo/db";
import { SIGNUP_TRIAL_CREDITS } from "@dichvideo/shared";
import { db } from "./db";
import { sendResetPasswordEmail, sendVerifyEmail } from "./email";

/**
 * Tặng xu dùng thử — gọi từ HAI đường: Google (đã xác minh sẵn lúc tạo tài
 * khoản) và email/mật khẩu (sau khi bấm link xác minh).
 *
 * Khoá chống-trùng `(signup, userId, signup_trial)` là thứ giữ cho không ai
 * nhận hai lần: xác minh lại email, hoặc đổi email rồi xác minh tiếp, đều rơi
 * vào đúng khoá đó và `applyCreditDelta` trả null thay vì cộng thêm.
 */
async function grantSignupCredits(userId: string) {
  await applyCreditDelta(db, {
    userId,
    delta: SIGNUP_TRIAL_CREDITS,
    reason: "signup_trial",
    refType: "signup",
    refId: userId,
  });
}

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: "pg",
    schema: {
      user: schema.user,
      session: schema.session,
      account: schema.account,
      verification: schema.verification,
    },
  }),
  // giữ đăng nhập lâu: phiên 30 ngày, mỗi ngày dùng lại tự gia hạn thêm
  // (mặc định 7 ngày — user phàn nàn hay phải đăng nhập lại)
  session: {
    expiresIn: 60 * 60 * 24 * 30,
    updateAge: 60 * 60 * 24,
    // đọc session từ cookie ký sẵn trong 5 phút — đỡ query DB mỗi request
    cookieCache: {
      enabled: true,
      maxAge: 60 * 5,
    },
  },
  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID ?? "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? "",
    },
  },
  // email + mật khẩu: đăng nhập được từ điện thoại/LAN (Google OAuth kén redirect URI)
  emailAndPassword: {
    enabled: true,
    minPasswordLength: 6,
    /**
     * BẮT XÁC MINH EMAIL trước khi tạo phiên đăng nhập.
     *
     * Mỗi tài khoản mới được tặng xu dùng thử, mà file phụ đề tải về KHÔNG có
     * watermark — nên trước đây một email rác là một suất dịch miễn phí, và rào
     * 5 tài khoản/giờ/IP thì đổi IP là qua.
     *
     * ⚠️ Nếu Gmail SMTP hỏng thì đăng ký bằng email/mật khẩu sẽ tắc. Đăng nhập
     * bằng Google KHÔNG bị ảnh hưởng (Google đã xác minh sẵn, xem databaseHooks
     * bên dưới) nên luôn còn một đường vào — đó là lý do giữ cả hai cách.
     */
    requireEmailVerification: true,
    // quên mật khẩu: better-auth sinh link đặt lại, ta gửi qua email (Gmail SMTP)
    sendResetPassword: async ({ user, url }) => {
      await sendResetPasswordEmail(user.email, url);
    },
    resetPasswordTokenExpiresIn: 60 * 60, // 1 giờ
  },
  user: {
    additionalFields: {
      creditBalance: {
        type: "number",
        defaultValue: 0,
        input: false,
      },
    },
  },
  emailVerification: {
    sendVerificationEmail: async ({ user, url }) => {
      await sendVerifyEmail(user.email, url);
    },
    /** gửi ngay lúc đăng ký — khách không phải bấm thêm nút nào */
    sendOnSignUp: true,
    /** thử đăng nhập khi chưa xác minh → gửi lại link, khỏi cần nút "gửi lại" riêng */
    sendOnSignIn: true,
    /** xác minh xong vào thẳng app, không bắt đăng nhập lại */
    autoSignInAfterVerification: true,
    expiresIn: 60 * 60,
    afterEmailVerification: async (user) => {
      await grantSignupCredits(user.id);
    },
  },
  databaseHooks: {
    user: {
      create: {
        after: async (newUser) => {
          /**
           * Chỉ tặng xu NGAY khi email đã được xác minh sẵn — tức là đăng nhập
           * bằng Google (Google đã xác minh hộ). Đăng ký bằng email/mật khẩu thì
           * `emailVerified = false`, phải chờ bấm link trong thư mới được tặng
           * (xem `afterEmailVerification`). Nếu tặng ngay từ đây thì việc bắt xác
           * minh chẳng chặn được gì: xu đã nằm sẵn trong tài khoản rồi.
           */
          if (newUser.emailVerified) await grantSignupCredits(newUser.id);
        },
      },
    },
  },
  plugins: [nextCookies()],
});
