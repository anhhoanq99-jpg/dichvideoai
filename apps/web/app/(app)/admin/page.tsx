import { notFound, redirect } from "next/navigation";
import { and, count, desc, eq, gte, sql } from "drizzle-orm";
import { Coins, Shield, TrendingUp, Users, Wallet } from "lucide-react";
import {
  communityComments,
  communityPosts,
  creditLedger,
  schema,
  usageEvents,
} from "@dichvideo/db";
import { db } from "@/lib/db";
import { getSession } from "@/lib/session";
import { getLang } from "@/lib/i18n";
import { isAdminEmail } from "@/lib/admin";
import { AdminDemoClient } from "./admin-demo-client";
import { AdminUsagePanel } from "./admin-usage-panel";
import { AdminTabs } from "./admin-tabs";
import {
  AdminModerationClient,
  type ModComment,
  type ModPost,
} from "./admin-moderation-client";

export const dynamic = "force-dynamic";

const T = {
  vi: {
    title: "Quản trị",
    revTitle: "Doanh thu & chi phí",
    revAll: "Tổng nạp",
    rev30: "Nạp 30 ngày",
    revToday: "Nạp hôm nay",
    payers: "Người đã nạp",
    outstanding: "Xu đang lưu hành",
    aiCost: "Chi phí AI (USD)",
    recent: "Lượt nạp gần đây",
    noTopups: "Chưa có lượt nạp nào.",
    demoTitle: "Video demo trang chủ",
    usageTitle: "Mức tiêu thụ API & hạn mức",
    modTitle: "Kiểm duyệt cộng đồng",
    xu: "xu",
  },
  en: {
    title: "Admin",
    revTitle: "Revenue & cost",
    revAll: "Total top-ups",
    rev30: "Top-ups (30d)",
    revToday: "Top-ups today",
    payers: "Paying users",
    outstanding: "Credits outstanding",
    aiCost: "AI cost (USD)",
    recent: "Recent top-ups",
    noTopups: "No top-ups yet.",
    demoTitle: "Homepage demo videos",
    usageTitle: "API usage & quotas",
    modTitle: "Community moderation",
    xu: "credits",
  },
} as const;

const num = (n: number) => new Intl.NumberFormat("vi-VN").format(n);
const fmtWhen = (d: Date) =>
  new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(d);

function StatCard({
  icon,
  label,
  value,
  sub,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub?: string;
}) {
  return (
    <div className="rounded-2xl border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900">
      <div className="flex items-center gap-2 text-xs font-medium text-neutral-500 dark:text-neutral-400">
        {icon}
        {label}
      </div>
      <p className="mt-1.5 text-xl font-bold tracking-tight">{value}</p>
      {sub && <p className="text-xs text-neutral-400">{sub}</p>}
    </div>
  );
}

export default async function AdminPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  // không phải admin → 404 (không lộ sự tồn tại của trang)
  if (!isAdminEmail(session.user.email)) notFound();
  const lang = await getLang();
  const t = T[lang];

  // Mốc thời gian tính bằng giờ DB (tránh gọi Date.now() trong render — rule purity).
  const since30d = sql`now() - interval '30 days'`;
  const startOfToday = sql`date_trunc('day', now())`;
  const isTopup = eq(creditLedger.reason, "topup");

  // Doanh thu = tổng delta các lượt nạp (1 xu = 1 VND). Chi phí = tổng usage_events.
  const [[all], [d30row], [today], [outstanding], [cost], recentTopups, modPosts, modComments] =
    await Promise.all([
      db
        .select({
          sum: sql<string>`coalesce(sum(${creditLedger.delta}), 0)`,
          cnt: sql<string>`count(*)`,
          users: sql<string>`count(distinct ${creditLedger.userId})`,
        })
        .from(creditLedger)
        .where(isTopup),
      db
        .select({ sum: sql<string>`coalesce(sum(${creditLedger.delta}), 0)` })
        .from(creditLedger)
        .where(and(isTopup, gte(creditLedger.createdAt, since30d))),
      db
        .select({ sum: sql<string>`coalesce(sum(${creditLedger.delta}), 0)` })
        .from(creditLedger)
        .where(and(isTopup, gte(creditLedger.createdAt, startOfToday))),
      db
        .select({ sum: sql<string>`coalesce(sum(${schema.user.creditBalance}), 0)` })
        .from(schema.user),
      db
        .select({ micros: sql<string>`coalesce(sum(${usageEvents.costUsdMicros}), 0)` })
        .from(usageEvents),
      db
        .select({
          id: creditLedger.id,
          delta: creditLedger.delta,
          createdAt: creditLedger.createdAt,
          userName: schema.user.name,
          userEmail: schema.user.email,
        })
        .from(creditLedger)
        .innerJoin(schema.user, eq(creditLedger.userId, schema.user.id))
        .where(isTopup)
        .orderBy(desc(creditLedger.createdAt))
        .limit(15),
      db
        .select({
          id: communityPosts.id,
          title: communityPosts.title,
          body: communityPosts.body,
          isAdmin: communityPosts.isAdmin,
          createdAt: communityPosts.createdAt,
          userName: schema.user.name,
          commentCount: count(communityComments.id),
        })
        .from(communityPosts)
        .innerJoin(schema.user, eq(communityPosts.userId, schema.user.id))
        .leftJoin(communityComments, eq(communityComments.postId, communityPosts.id))
        .groupBy(communityPosts.id, schema.user.name)
        .orderBy(desc(communityPosts.createdAt))
        .limit(25),
      db
        .select({
          id: communityComments.id,
          body: communityComments.body,
          isAdmin: communityComments.isAdmin,
          createdAt: communityComments.createdAt,
          userName: schema.user.name,
          postTitle: communityPosts.title,
        })
        .from(communityComments)
        .innerJoin(schema.user, eq(communityComments.userId, schema.user.id))
        .innerJoin(communityPosts, eq(communityComments.postId, communityPosts.id))
        .orderBy(desc(communityComments.createdAt))
        .limit(25),
    ]);

  const revAll = Number(all?.sum ?? 0);
  const rev30 = Number(d30row?.sum ?? 0);
  const revToday = Number(today?.sum ?? 0);
  const payers = Number(all?.users ?? 0);
  const topupCount = Number(all?.cnt ?? 0);
  const outstandingXu = Number(outstanding?.sum ?? 0);
  const aiCostUsd = Number(cost?.micros ?? 0) / 1_000_000;

  const posts: ModPost[] = modPosts.map((p) => ({
    id: p.id,
    title: p.title,
    body: p.body,
    userName: p.userName,
    isAdmin: p.isAdmin,
    commentCount: Number(p.commentCount),
    when: fmtWhen(p.createdAt),
  }));
  const modCommentsView: ModComment[] = modComments.map((c) => ({
    id: c.id,
    body: c.body,
    userName: c.userName,
    isAdmin: c.isAdmin,
    postTitle: c.postTitle,
    when: fmtWhen(c.createdAt),
  }));

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <h1 className="flex items-center gap-2.5 text-2xl font-bold tracking-tight">
        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary-50 dark:bg-primary-950/50">
          <Shield className="h-5 w-5 text-primary-600 dark:text-primary-400" />
        </span>
        {t.title}
      </h1>

      {/* Mỗi mục một tab — trước đây 4 mục xếp dọc một trang rất dài, phải
          cuộn mới thấy phần kiểm duyệt và video demo. */}
      <AdminTabs
        tabs={[
          {
            id: "revenue",
            label: t.revTitle,
            content: (
              <>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                  <StatCard
                    icon={<TrendingUp className="h-4 w-4" />}
                    label={t.revAll}
                    value={`${num(revAll)} ${t.xu}`}
                    sub={`${num(topupCount)} lượt`}
                  />
                  <StatCard icon={<TrendingUp className="h-4 w-4" />} label={t.rev30} value={`${num(rev30)} ${t.xu}`} />
                  <StatCard icon={<TrendingUp className="h-4 w-4" />} label={t.revToday} value={`${num(revToday)} ${t.xu}`} />
                  <StatCard icon={<Users className="h-4 w-4" />} label={t.payers} value={num(payers)} />
                  <StatCard
                    icon={<Coins className="h-4 w-4" />}
                    label={t.outstanding}
                    value={`${num(outstandingXu)} ${t.xu}`}
                  />
                  <StatCard
                    icon={<Wallet className="h-4 w-4" />}
                    label={t.aiCost}
                    value={`$${aiCostUsd.toFixed(2)}`}
                  />
                </div>

                <h3 className="mb-2 mt-5 text-sm font-semibold text-neutral-500 dark:text-neutral-400">
                  {t.recent}
                </h3>
                {recentTopups.length === 0 ? (
                  <p className="text-sm text-neutral-400">{t.noTopups}</p>
                ) : (
                  <div className="overflow-hidden rounded-2xl border border-neutral-200 dark:border-neutral-800">
                    <table className="w-full text-sm">
                      <tbody>
                        {recentTopups.map((r) => (
                          <tr
                            key={r.id}
                            className="border-b border-neutral-100 last:border-0 dark:border-neutral-800/60"
                          >
                            <td className="px-3 py-2">
                              <p className="font-medium">{r.userName}</p>
                              <p className="truncate text-xs text-neutral-400">{r.userEmail}</p>
                            </td>
                            <td className="whitespace-nowrap px-3 py-2 text-right font-semibold text-success-600 dark:text-success-400">
                              +{num(r.delta)} {t.xu}
                            </td>
                            <td className="whitespace-nowrap px-3 py-2 text-right text-xs text-neutral-400">
                              {fmtWhen(r.createdAt)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </>
            ),
          },
          {
            // Đặt ngay sau doanh thu vì đây là thứ chết trước: hết hạn mức là
            // job dừng giữa chừng, khách trả tiền chịu trận.
            id: "usage",
            label: t.usageTitle,
            content: <AdminUsagePanel lang={lang} />,
          },
          {
            id: "moderation",
            label: t.modTitle,
            badge: posts.length + modCommentsView.length,
            content: (
              <AdminModerationClient
                lang={lang}
                posts={posts}
                comments={modCommentsView}
              />
            ),
          },
          {
            id: "demo",
            label: t.demoTitle,
            content: <AdminDemoClient lang={lang} />,
          },
        ]}
      />
    </div>
  );
}
