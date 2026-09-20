import type { Metadata } from "next";
import Link from "next/link";
import { cookies } from "next/headers";
import { requirePage } from "@/lib/auth/dal";
import { dashboardStats } from "@/lib/data/repo";
import { canView } from "@/lib/permissions";
import { fmtDateTime } from "@/lib/time";
import { AlarmChart, StatusBar, TopMachines } from "@/components/charts";
import { PageHeader, StatusPill } from "@/components/ui";
import { getDictionary, type Locale } from "@/lib/i18n";
import { Icon } from "@/components/icons";

export const metadata: Metadata = { title: "Dashboard" };

export default async function DashboardPage() {
  const user = await requirePage("dashboard");
  const s = await dashboardStats();
  const cookieStore = await cookies();
  const locale = (cookieStore.get("locale")?.value || "th") as Locale;
  const t = getDictionary(locale);

  const canSee = (p: Parameters<typeof canView>[1]) => canView(user.role, p);

  const kpis = [
    {
      label: t.dashboard.totalMachines,
      value: s.totalMachines,
      tone: "text-blue-600 dark:text-blue-400 bg-blue-500/10 border-blue-500/30",
      indicator: "bg-blue-600",
      href: "/machines",
    },
    {
      label: t.status.Running,
      value: s.byStatus.Running,
      tone: "text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border-emerald-500/30",
      indicator: "bg-emerald-500",
      href: "/machines?status=Running",
    },
    {
      label: t.status.Stop,
      value: s.byStatus.Stop,
      tone: "text-slate-600 dark:text-slate-400 bg-slate-500/10 border-slate-500/30",
      indicator: "bg-slate-400",
      href: "/machines?status=Stop",
    },
    {
      label: t.status.Alarm,
      value: s.byStatus.Alarm,
      tone: "text-rose-600 dark:text-rose-400 bg-rose-500/10 border-rose-500/30",
      indicator: "bg-rose-500 animate-pulse",
      href: "/machines?status=Alarm",
    },
    {
      label: t.status.Maintenance,
      value: s.byStatus.Maintenance,
      tone: "text-amber-600 dark:text-amber-400 bg-amber-500/10 border-amber-500/30",
      indicator: "bg-amber-500",
      href: "/machines?status=Maintenance",
    },
    {
      label: t.dashboard.activeAlarms,
      value: s.activeAlarmCount,
      tone: "text-rose-600 dark:text-rose-400 bg-rose-500/10 border-rose-500/30",
      indicator: "bg-rose-500 animate-pulse",
      href: "/alarms?status=Open",
    },
  ];

  const minis = [
    {
      label: t.dashboard.openMaintenance,
      value: String(s.openMaintenance),
      href: "/maintenance",
      page: "maintenance" as const,
      icon: "wrench" as const,
    },
    {
      label: `${t.dashboard.pmOverdue} (${t.dashboard.pmSoonPrefix} ${s.pmSoon})`,
      value: String(s.pmOverdue),
      href: "/plan?view=list&state=overdue",
      page: "plan" as const,
      alert: s.pmOverdue > 0,
      icon: "calendar" as const,
    },
    {
      label: t.dashboard.mttr,
      value: `${s.mttrMinutes} ${t.dashboard.minutes}`,
      href: "/alarms?status=Closed",
      page: "alarms" as const,
      icon: "cog" as const,
    },
    {
      label: t.dashboard.alarmsToday,
      value: String(s.alarmsToday),
      href: "/alarms",
      page: "alarms" as const,
      icon: "bell" as const,
    },
  ];

  const totalWeekText = t.dashboard.alarmTotalWeek.replace("{count}", String(s.alarmsWeek));

  return (
    <>
      <PageHeader title={t.dashboard.title}>
        <div className="flex items-center gap-2 text-xs font-mono text-muted bg-surface-2 px-3 py-1.5 rounded-xl border border-line">
          <span className="size-2 rounded-full bg-emerald-500 animate-pulse"></span>
          <span>{locale === "en" ? "REALTIME TELEMETRY" : "ข้อมูลอัปเดตเรียลไทม์"}</span>
        </div>
      </PageHeader>

      {/* ── Top Level KPIs (6 Column Grid) ────────────────────────── */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-6">
        {kpis.map((k) => {
          const body = (
            <div className="flex flex-col justify-between h-full gap-3">
              <div className="flex items-center justify-between">
                <span className="text-xs sm:text-[13px] font-semibold text-muted truncate">
                  {k.label}
                </span>
                <span className={`size-2 rounded-full ${k.indicator}`} />
              </div>
              <div className="flex items-baseline justify-between">
                <span className="num text-3xl sm:text-4xl font-extrabold tracking-tight text-ink">
                  {k.value}
                </span>
              </div>
            </div>
          );
          const cls =
            "rounded-2xl border border-line bg-surface p-4 sm:p-5 shadow-xs transition-all duration-200 hover:shadow-md hover:border-line-strong hover:-translate-y-0.5 cursor-pointer";
          return canSee("machines") ? (
            <Link key={k.label} href={k.href} className={cls}>
              {body}
            </Link>
          ) : (
            <div key={k.label} className={cls}>
              {body}
            </div>
          );
        })}
      </div>

      {/* ── Middle Row: 7-Day Chart & Status Summary ─────────────── */}
      <div className="grid gap-6 lg:grid-cols-2 2xl:grid-cols-[1.4fr_1fr]">
        <section className="panel flex flex-col justify-between shadow-xs">
          <div className="panel-head">
            <div className="flex items-center gap-2.5">
              <span className="grid size-8 place-items-center rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400">
                <Icon name="bell" className="size-4" />
              </span>
              <h2>{t.dashboard.alarmTrend}</h2>
            </div>
            <span className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-surface-2 text-muted border border-line">
              {totalWeekText}
            </span>
          </div>
          <div className="p-5 sm:p-6 flex-1 flex flex-col justify-center">
            <AlarmChart data={s.perDay} locale={locale} />
          </div>
        </section>

        <section className="panel flex flex-col justify-between shadow-xs">
          <div className="panel-head">
            <div className="flex items-center gap-2.5">
              <span className="grid size-8 place-items-center rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                <Icon name="cog" className="size-4" />
              </span>
              <h2>{t.dashboard.machineStatusNow}</h2>
            </div>
          </div>
          <div className="p-5 sm:p-6 flex-1 flex flex-col justify-between gap-6">
            <StatusBar counts={s.byStatus} locale={locale} />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
              {minis.map((m) => {
                const body = (
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <b
                        className={`num block text-2xl font-extrabold tracking-tight ${
                          m.alert ? "text-alarm" : "text-ink"
                        }`}
                      >
                        {m.value}
                      </b>
                      <span className="text-xs text-muted leading-snug font-medium mt-0.5 block">
                        {m.label}
                      </span>
                    </div>
                    <span className="grid size-7 place-items-center rounded-lg bg-surface text-muted shrink-0 border border-line">
                      <Icon name={m.icon} className="size-3.5" />
                    </span>
                  </div>
                );
                return canSee(m.page) ? (
                  <Link
                    key={m.label}
                    href={m.href}
                    className="flex flex-col justify-between rounded-xl bg-surface-2/70 p-3.5 sm:p-4 hover:bg-surface-2 transition-all border border-line/60 hover:border-line"
                  >
                    {body}
                  </Link>
                ) : (
                  <div
                    key={m.label}
                    className="flex flex-col justify-between rounded-xl bg-surface-2/70 p-3.5 sm:p-4 border border-line/60"
                  >
                    {body}
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      </div>

      {/* ── Bottom Row: Action Needed Alarms & Top Machines ─────── */}
      <div className="grid gap-6 lg:grid-cols-2 2xl:grid-cols-[1.4fr_1fr]">
        <section className="panel shadow-xs">
          <div className="panel-head">
            <div className="flex items-center gap-2.5">
              <span className="grid size-8 place-items-center rounded-xl bg-rose-500/10 text-rose-600 dark:text-rose-400">
                <Icon name="alert" className="size-4" />
              </span>
              <h2>{t.dashboard.actionNeededAlarms}</h2>
            </div>
            {canSee("alarms") && (
              <Link href="/alarms?status=Open" className="btn btn-sm">
                {t.dashboard.viewAll}
              </Link>
            )}
          </div>
          {s.activeAlarms.length ? (
            <ul className="divide-y divide-line">
              {s.activeAlarms.map((a) => {
                const body = (
                  <>
                    <span
                      className={`size-2.5 rounded-full shrink-0 ${
                        a.status === "Open" ? "bg-alarm animate-pulse" : "bg-mnt"
                      }`}
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <b className="font-mono text-xs px-2 py-0.5 rounded-md bg-surface-2 text-ink border border-line">
                          {a.code}
                        </b>
                        <span className="text-ink font-semibold text-sm truncate">
                          {a.description}
                        </span>
                      </div>
                      <div className="sub mt-1">
                        <span className="font-mono font-medium text-accent">{a.machineId}</span> · {a.machineName} · {fmtDateTime(a.occurredAt, locale)}
                      </div>
                    </div>
                    <StatusPill status={a.status} />
                  </>
                );
                const cls =
                  "flex items-center gap-3.5 px-5 sm:px-6 py-4 transition-colors";
                return (
                  <li key={a.id}>
                    {canSee("alarms") ? (
                      <Link href={`/alarms/${a.id}`} className={`${cls} hover:bg-surface-2`}>
                        {body}
                      </Link>
                    ) : (
                      <div className={cls}>{body}</div>
                    )}
                  </li>
                );
              })}
            </ul>
          ) : (
            <div className="p-12 text-center text-muted text-sm">
              <Icon name="check" className="size-8 mx-auto text-ok mb-2" />
              <p>{t.dashboard.noActiveAlarms}</p>
            </div>
          )}
        </section>

        <section className="panel flex flex-col justify-between shadow-xs">
          <div className="panel-head">
            <div className="flex items-center gap-2.5">
              <span className="grid size-8 place-items-center rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
                <Icon name="cog" className="size-4" />
              </span>
              <h2>{t.dashboard.topAlarms}</h2>
            </div>
          </div>
          <div className="p-5 sm:p-6 flex-1 flex flex-col justify-center">
            <TopMachines rows={s.topMachines} locale={locale} />
          </div>
        </section>
      </div>
    </>
  );
}
