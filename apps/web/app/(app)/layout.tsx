import { redirect } from "next/navigation";
import { AppSidebar, MobileNav } from "@/components/app-sidebar";
import { BackButton } from "@/components/back-button";
import { BrandLogo } from "@/components/brand-logo";
import { CreditBalanceChip } from "@/components/credit-balance-chip";
import { LangSwitcher } from "@/components/lang-switcher";
import { ThemeToggle } from "@/components/theme-toggle";
import { UserMenu } from "@/components/user-menu";
import { getLang } from "@/lib/i18n";
import { getSession } from "@/lib/session";

export default async function AppLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const session = await getSession();
  if (!session) redirect("/login");
  const lang = await getLang();

  return (
    <div className="flex h-dvh bg-neutral-50 dark:bg-neutral-950">
      <AppSidebar lang={lang} />
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-14 items-center gap-2.5 border-b border-neutral-200 bg-white px-4 dark:border-neutral-800 dark:bg-neutral-950">
          {/* mobile: nút menu + logo; desktop: sidebar đã có logo */}
          <MobileNav lang={lang} />
          <BackButton label={lang === "vi" ? "Quay lại trang trước" : "Go back"} />
          <span className="lg:hidden">
            <BrandLogo textClassName="hidden sm:inline" />
          </span>
          <span className="ml-auto flex items-center gap-2.5">
            <CreditBalanceChip lang={lang} />
            <LangSwitcher lang={lang} />
            <ThemeToggle />
            <UserMenu
              name={session.user.name}
              email={session.user.email}
              image={session.user.image}
            />
          </span>
        </header>
        {/* overflow-x-hidden: phần tử nào lỡ rộng hơn màn hình cũng không làm
            trang bị đẩy ngang khi thao tác trên điện thoại */}
        <main className="flex-1 overflow-y-auto overflow-x-hidden p-4 sm:p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
