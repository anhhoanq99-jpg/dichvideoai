import { redirect } from "next/navigation";
import { AppHeaderShell } from "@/components/app-header-shell";
import { AppSidebar, MobileNav } from "@/components/app-sidebar";
import { BackButton } from "@/components/back-button";
import { BrandLogo } from "@/components/brand-logo";
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
            />
          </span>
        </AppHeaderShell>
        {/* overflow-x-hidden: phần tử nào lỡ rộng hơn màn hình cũng không làm
            trang bị đẩy ngang khi thao tác trên điện thoại */}
        <main className="flex-1 overflow-y-auto overflow-x-hidden p-4 sm:p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
