import type { Metadata } from "next";
import Link from "next/link";
import { requirePage } from "@/lib/auth/dal";
import { dashboardStats } from "@/lib/data/repo";
import { canView } from "@/lib/permissions";
import { fmtDateTime } from "@/lib/time";
import { AlarmChart, StatusBar, TopMachines } from "@/components/charts";
import { PageHeader, StatusPill } from "@/components/ui";

export const metadata: Metadata = { title: "Dashboard" };

export default async function DashboardPage() {
  const user = await requirePage("dashboard");
  const s = await dashboardStats();
  const canSee = (p: Parameters<typeof canView>[1]) => canView(user.role, p);

  const kpis = [
    { label: "เครื่องจักรทั้งหมด", value: s.totalMachines, tone: "border-t-accent", href: "/machines" },
    { label: "Running", value: s.byStatus.Running, tone: "border-t-ok text-ok", href: "/machines?status=Running" },
    { label: "Stop", value: s.byStatus.Stop, tone: "border-t-line-strong", href: "/machines?status=Stop" },
    { label: "Alarm", value: s.byStatus.Alarm, tone: "border-t-alarm text-alarm", href: "/machines?status=Alarm" },
    { label: "Maintenance", value: s.byStatus.Maintenance, tone: "border-t-mnt text-mnt", href: "/machines?status=Maintenance" },
    { label: "Alarm ที่ยังไม่ปิด", value: s.activeAlarmCount, tone: "border-t-alarm text-alarm", href: "/alarms?status=Open" },
  ];
  const minis = [
    { label: "งานซ่อมค้าง", value: String(s.openMaintenance), href: "/maintenance", page: "maintenance" as const },
    { label: `PM เกินกำหนด · ครบใน 7 วันอีก ${s.pmSoon}`, value: String(s.pmOverdue), href: "/plan?view=list&state=overdue", page: "plan" as const, alert: s.pmOverdue > 0 },
    { label: "MTTR 7 วัน (เวลาซ่อมเฉลี่ย)", value: `${s.mttrMinutes} นาที`, href: "/alarms?status=Closed", page: "alarms" as const },
    { label: "Alarm วันนี้", value: String(s.alarmsToday), href: "/alarms", page: "alarms" as const },
  ];

  return (
    <>
      <PageHeader title="Dashboard" />
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
        {kpis.map((k) => {
          const body = (
            <>
              <span className={`num text-[30px] font-semibold leading-tight ${k.tone.split(" ").slice(1).join(" ")}`}>{k.value}</span>
              <span className="text-[13px] text-muted">{k.label}</span>
            </>
          );
          const cls = `flex flex-col gap-1 rounded-[10px] border border-line border-t-[3px] bg-surface px-4 py-3.5 ${k.tone.split(" ")[0]}`;
          return canSee("machines")
            ? <Link key={k.label} href={k.href} className={`${cls} hover:border-line-strong`}>{body}</Link>
            : <div key={k.label} className={cls}>{body}</div>;
        })}
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
        <section className="panel">
          <div className="panel-head"><h2>จำนวน Alarm 7 วันล่าสุด</h2><span className="ml-auto text-[13px] text-muted">รวม {s.alarmsWeek} ครั้ง</span></div>
          <div className="p-4"><AlarmChart data={s.perDay} /></div>
        </section>
        <section className="panel">
          <div className="panel-head"><h2>สถานะเครื่องจักรตอนนี้</h2></div>
          <div className="p-4">
            <StatusBar counts={s.byStatus} />
            <div className="mt-4 grid grid-cols-2 gap-3">
              {minis.map((m) => {
                const body = (
                  <>
                    <b className={`num block text-xl ${m.alert ? "text-alarm" : ""}`}>{m.value}</b>
                    <span className="text-[12.5px] text-muted">{m.label}</span>
                  </>
                );
                return canSee(m.page)
                  ? <Link key={m.label} href={m.href} className="rounded-lg bg-surface-2 px-3 py-2.5 hover:bg-accent-soft">{body}</Link>
                  : <div key={m.label} className="rounded-lg bg-surface-2 px-3 py-2.5">{body}</div>;
              })}
            </div>
          </div>
        </section>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
        <section className="panel">
          <div className="panel-head">
            <h2>Alarm ที่ต้องจัดการ</h2>
            {canSee("alarms") && <Link href="/alarms?status=Open" className="btn btn-sm ml-auto">ดูทั้งหมด</Link>}
          </div>
          {s.activeAlarms.length ? (
            <ul>
              {s.activeAlarms.map((a) => {
                const body = (
                  <>
                    <span className={`w-1 self-stretch rounded ${a.status === "Open" ? "bg-alarm" : "bg-mnt"}`} />
                    <span className="min-w-0"><b className="font-mono">{a.code}</b> {a.description}<span className="sub">{a.machineId} · {a.machineName} · {fmtDateTime(a.occurredAt)}</span></span>
                    <StatusPill status={a.status} />
                  </>
                );
                const cls = "grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 border-b border-line px-4 py-2.5 last:border-b-0";
                return (
                  <li key={a.id}>
                    {canSee("alarms") ? <Link href={`/alarms/${a.id}`} className={`${cls} hover:bg-surface-2`}>{body}</Link> : <div className={cls}>{body}</div>}
                  </li>
                );
              })}
            </ul>
          ) : <p className="px-4 py-10 text-center text-muted">ไม่มี Alarm ค้าง</p>}
        </section>
        <section className="panel">
          <div className="panel-head"><h2>เครื่องที่เกิด Alarm บ่อย (7 วัน)</h2></div>
          <div className="p-4"><TopMachines rows={s.topMachines} /></div>
        </section>
      </div>
    </>
  );
}
