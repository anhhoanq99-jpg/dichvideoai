import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { schema } from "@dichvideo/db";
import { db } from "@/lib/db";
import { AppHeaderShell } from "@/components/app-header-shell";
import { AppSidebar, MobileNav } from "@/components/app-sidebar";
import { BackButton } from "@/components/back-button";
import { BrandLogo } from "@/components/brand-logo";
import { CopyrightLine } from "@/components/copyright-line";
import { CreditBalanceChip } from "@/components/credit-balance-chip";
import { LangSwitcher } from "@/components/lang-switcher";
import { ThemeToggle } from "@/components/theme-toggle";
import { UserMenu } from "@/components/user-menu";
import { getLang } from "@/lib/i18n";
import { isAdminEmail } from "@/lib/admin";
import { getSession } from "@/lib/session";

export default async function AppLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const session = await getSession();
  if (!session) redirect("/login");
  // Tài khoản bị admin khoá → chặn mọi trang app. Truy vấn tươi (không qua cache
  // phiên 5 phút của better-auth) để khoá có hiệu lực ngay ở lần tải trang tiếp.
  const [account] = await db
    .select({ bannedAt: schema.user.bannedAt })
    .from(schema.user)
    .where(eq(schema.user.id, session.user.id));
  if (account?.bannedAt) redirect("/login?banned=1");
  const lang = await getLang();
  const isAdmin = isAdminEmail(session.user.email);

  return (
    <div className="flex h-dvh overflow-x-hidden bg-neutral-50 dark:bg-neutral-950">
      <AppSidebar lang={lang} isAdmin={isAdmin} />
      <div className="flex min-w-0 flex-1 flex-col">
        <AppHeaderShell>
          {/* mobile: nút menu; logo chỉ hiện từ sm+ (điện thoại nhỏ giấu đi cho đỡ chật) */}
          <MobileNav lang={lang} isAdmin={isAdmin} />
          <BackButton label={lang === "vi" ? "Quay lại trang trước" : "Go back"} />
          <span className="hidden sm:inline lg:hidden">
            <BrandLogo textClassName="hidden md:inline" />
          </span>
          <span className="ml-auto flex min-w-0 items-center gap-1.5 sm:gap-2.5">
            <CreditBalanceChip lang={lang} />
            <LangSwitcher lang={lang} />
            <ThemeToggle />
            <UserMenu
              name={session.user.name}
              email={session.user.email}
              image={session.user.image}
              lang={lang}
            />
          </span>
        </AppHeaderShell>
        {/* overflow-x-hidden: phần tử nào lỡ rộng hơn màn hình cũng không làm
            trang bị đẩy ngang khi thao tác trên điện thoại */}
        {/* Dòng bản quyền nằm TRONG vùng cuộn, không ghim đáy màn hình: studio
            và bảng phụ đề đã chật, thêm một dải cố định nữa là mất chỗ làm việc.
            Cuộn hết nội dung mới thấy — đúng chỗ của footer. */}
        <main className="flex flex-1 flex-col overflow-y-auto overflow-x-hidden p-4 sm:p-6">
          <div className="flex-1">{children}</div>
          <CopyrightLine lang={lang} className="mt-6 shrink-0 text-center" />
        </main>
      </div>
    </div>
  );
}
