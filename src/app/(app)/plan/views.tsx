// Server-rendered views of PM plans: per-machine 12-week timeline, month calendar and list.
import Link from "next/link";
import type { PlanWithState } from "@/lib/data/repo";
import { addDays, daysBetween, dueText, freqLabel, isoWeek, occurrences, parseDateStr, toDateStr, todayStr, weekStart, type PlanState } from "@/lib/pm";
import { fmtDate } from "@/lib/time";
import type { Machine } from "@/lib/types";
import { Icon } from "@/components/icons";
import { Empty } from "@/components/ui";

const MK: Record<PlanState | "projected", string> = { overdue: "mk mk-overdue", soon: "mk mk-soon", issued: "mk mk-issued", ok: "mk", projected: "mk mk-projected" };
const DUE: Record<PlanState, string> = { overdue: "due-overdue", soon: "due-soon", issued: "", ok: "" };

function Marker({ p, date, projected }: { p: PlanWithState; date: string; projected: boolean }) {
  return (
    <Link href={`/plan/${p.id}`} className={`${MK[projected ? "projected" : p.state]} hover:brightness-95`} title={`${p.id} · ${p.task} · ${fmtDate(date)}${projected ? " (รอบถัดไปตามแผน)" : ""}`}>
      {p.id}
    </Link>
  );
}

export function Legend({ extra }: { extra?: React.ReactNode }) {
  const item = (cls: string, label: string) => (
    <span className="inline-flex items-center gap-1.5"><span className={`${cls} inline-block size-2.5 rounded-sm p-0`} />{label}</span>
  );
  return (
    <div className="flex flex-wrap gap-x-4 gap-y-1.5 px-4 py-3 text-[13px] text-muted">
      {item("mk-overdue", "เกินกำหนด")}{item("mk-soon", "ครบใน 7 วัน")}{item("mk-issued", "ออกใบงานแล้ว")}{item("mk", "ตามแผน")}{item("mk-projected", "รอบถัดไป (คาดการณ์)")}
      {extra}
    </div>
  );
}

export function MachineTimeline({ plans, machines, filtering, canAdd }: { plans: PlanWithState[]; machines: Machine[]; filtering: boolean; canAdd: boolean }) {
  const WEEKS = 12;
  const start = weekStart(todayStr());
  const end = addDays(start, WEEKS * 7 - 1);
  const weeks = Array.from({ length: WEEKS }, (_, i) => addDays(start, i * 7));
  const rank: Record<PlanState, number> = { overdue: 0, soon: 1, issued: 2, ok: 3 };
  const rows = machines
    .map((m) => ({ m, mp: plans.filter((p) => p.machineId === m.id) }))
    .filter((r) => !filtering || r.mp.length)
    .map((r) => ({ ...r, rank: r.mp.length ? Math.min(...r.mp.map((p) => rank[p.state])) : 9 }))
    .sort((a, b) => a.rank - b.rank || a.m.id.localeCompare(b.m.id));
  if (!rows.length) return <Empty>ไม่พบเครื่องที่มีแผน PM ตรงกับเงื่อนไข</Empty>;
  const noPlan = machines.filter((m) => !plans.some((p) => p.machineId === m.id)).length;

  return (
    <>
      <div className="table-wrap">
        <table className="data-table min-w-[1180px] table-fixed [&_td]:border-r [&_td]:border-line [&_td]:px-1.5 [&_th]:border-r [&_th]:border-line [&_th]:px-1.5">
          <thead>
            <tr>
              <th className="sticky left-0 z-[1] w-[220px] !pl-4">เครื่องจักร</th>
              <th className="w-[150px]">PM ถัดไป</th>
              {weeks.map((w, i) => (
                <th key={w} className={`text-center ${i === 0 ? "text-accent" : ""}`}>
                  {i === 0 ? "สัปดาห์นี้" : fmtDate(w, { day: "numeric", month: "short" })}
                  <small className="block font-normal text-faint">{i === 0 ? fmtDate(w, { day: "numeric", month: "short" }) : `W${isoWeek(w)}`}</small>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map(({ m, mp }) => {
              const next = mp[0];
              const buckets: { p: PlanWithState; d: string; projected: boolean }[][] = weeks.map(() => []);
              mp.forEach((p) => {
                if (p.nextDue < start) buckets[0].push({ p, d: p.nextDue, projected: false });
                occurrences(p, end).forEach((d) => {
                  if (d >= start) buckets[Math.floor(daysBetween(start, d) / 7)].push({ p, d, projected: d !== p.nextDue });
                });
              });
              return (
                <tr key={m.id}>
                  <th scope="row" className="sticky left-0 z-[1] !bg-surface !pl-4 text-left font-normal text-ink">
                    <Link href={`/machines/${m.id}`} className="block hover:underline">
                      <b><span className="font-mono">{m.id}</span> {m.name}</b>
                      <span className="sub truncate">{m.type} · {m.location} · {mp.length} แผน</span>
                    </Link>
                  </th>
                  {mp.length ? (
                    <>
                      <td><span className="num">{fmtDate(next.nextDue)}</span><span className={`sub ${DUE[next.state]}`}>{next.workOrderId ? "ออกใบงานแล้ว" : dueText(next.nextDue)}</span></td>
                      {buckets.map((b, i) => (
                        <td key={weeks[i]} className={i === 0 ? "bg-accent-soft/40" : ""}>
                          <div className="flex flex-col items-center gap-1">{b.map((x) => <Marker key={`${x.p.id}-${x.d}`} p={x.p} date={x.d} projected={x.projected} />)}</div>
                        </td>
                      ))}
                    </>
                  ) : (
                    <td colSpan={WEEKS + 1}>
                      <div className="flex items-center gap-2.5 pl-2.5 text-[13px] text-muted">
                        <Icon name="alert" className="size-4" /> ยังไม่มีแผน PM สำหรับเครื่องนี้
                        {canAdd && <Link href={`/plan/new?machine=${m.id}`} className="btn btn-sm"><Icon name="plus" className="size-4" /> เพิ่มแผน</Link>}
                      </div>
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <Legend extra={noPlan && !filtering ? <span className="ml-auto">เครื่องที่ยังไม่มีแผน {noPlan} เครื่อง</span> : null} />
    </>
  );
}

export function PlanCalendar({ plans, monthOffset, baseHref }: { plans: PlanWithState[]; monthOffset: number; baseHref: (month: number) => string }) {
  const today = todayStr();
  const t = parseDateStr(today);
  const first = new Date(t.getFullYear(), t.getMonth() + monthOffset, 1);
  const y = first.getFullYear(), m = first.getMonth();
  const lead = (first.getDay() + 6) % 7;
  const cells = Math.ceil((lead + new Date(y, m + 1, 0).getDate()) / 7) * 7;
  const start = toDateStr(new Date(y, m, 1 - lead));
  const end = toDateStr(new Date(y, m, cells - lead));
  const byDay: Record<string, { p: PlanWithState; projected: boolean }[]> = {};
  const add = (d: string, p: PlanWithState, projected: boolean) => (byDay[d] ??= []).push({ p, projected });
  plans.forEach((p) => {
    if (p.nextDue < start && today >= start && today <= end) add(today, p, false); // overdue from an earlier month
    occurrences(p, end, 60).forEach((d) => { if (d >= start) add(d, p, d !== p.nextDue); });
  });
  const label = first.toLocaleDateString("th-TH", { month: "long", year: "numeric" });

  return (
    <>
      <div className="flex items-center gap-2 px-4 py-3">
        <Link href={baseHref(monthOffset - 1)} className="icon-btn" aria-label="เดือนก่อน"><Icon name="left" /></Link>
        <h2 className="min-w-[9em] text-center text-[15px] font-semibold">{label}</h2>
        <Link href={baseHref(monthOffset + 1)} className="icon-btn" aria-label="เดือนถัดไป"><Icon name="right" /></Link>
        {monthOffset !== 0 && <Link href={baseHref(0)} className="btn btn-sm">เดือนนี้</Link>}
      </div>
      <div className="grid grid-cols-7 border-t border-line">
        {["จ", "อ", "พ", "พฤ", "ศ", "ส", "อา"].map((d) => <div key={d} className="border-b border-line bg-surface-2 py-2 text-center text-xs font-semibold text-muted">{d}</div>)}
        {Array.from({ length: cells }, (_, i) => {
          const d = toDateStr(new Date(y, m, 1 - lead + i));
          const inMonth = parseDateStr(d).getMonth() === m;
          return (
            <div key={d} className={`flex min-h-14 min-w-0 flex-col gap-1 border-b border-r border-line p-1 sm:min-h-26 sm:p-1.5 [&:nth-child(7n)]:border-r-0 ${inMonth ? "" : "bg-surface-2"}`}>
              <span className={`num text-[12.5px] ${d === today ? "grid size-6 place-items-center rounded-full bg-accent text-accent-ink" : inMonth ? "text-muted" : "text-faint"}`}>{parseDateStr(d).getDate()}</span>
              {(byDay[d] ?? []).map(({ p, projected }) => (
                <Link key={p.id} href={`/plan/${p.id}`} title={`${p.id} · ${p.machineId} · ${p.task}`}
                  className={`${MK[projected ? "projected" : p.state]} flex min-w-0 items-center gap-1 overflow-hidden text-left font-sans text-[11.5px] font-medium`}>
                  <b className="shrink-0 font-mono text-[11px]">{p.machineId}</b><span className="hidden truncate sm:inline">{p.task}</span>
                </Link>
              ))}
            </div>
          );
        })}
      </div>
      <Legend />
    </>
  );
}

export function PlanList({ plans, technicianName, canIssue, canEdit }: { plans: PlanWithState[]; technicianName: (id: string) => string; canIssue: boolean; canEdit: boolean }) {
  if (!plans.length) return <Empty>ไม่พบแผน PM ที่ตรงกับเงื่อนไข</Empty>;
  return (
    <div className="table-wrap">
      <table className="data-table">
        <thead><tr><th>แผน PM</th><th>เครื่องจักร</th><th>ความถี่</th><th>ทำล่าสุด</th><th>ครบกำหนดถัดไป</th><th>ช่าง</th><th /></tr></thead>
        <tbody>
          {plans.map((p) => (
            <tr key={p.id}>
              <td><Link href={`/plan/${p.id}`} className="font-mono font-semibold text-accent hover:underline">{p.id}</Link><span className="sub text-ink">{p.task}</span></td>
              <td><span className="font-mono">{p.machineId}</span></td>
              <td>{freqLabel(p.intervalDays)}</td>
              <td className="num">{fmtDate(p.lastDone)}</td>
              <td><span className="num">{fmtDate(p.nextDue)}</span><span className={`sub ${DUE[p.state]}`}>{p.workOrderId ? `ออกใบงาน ${p.workOrderId} แล้ว` : dueText(p.nextDue)}</span></td>
              <td>{technicianName(p.technicianId)}</td>
              <td className="text-right">
                <div className="flex justify-end gap-1">
                  {p.workOrderId ? <Link href={`/maintenance/${p.workOrderId}/edit`} className="btn btn-sm">ดูใบงาน</Link>
                    : canIssue && <Link href={`/maintenance/new?plan=${p.id}`} className={`btn btn-sm ${p.state === "overdue" || p.state === "soon" ? "btn-primary" : ""}`}>ออกใบงาน</Link>}
                  {canEdit && <Link href={`/plan/${p.id}/edit`} className="icon-btn" aria-label={`แก้ไข ${p.id}`} title="แก้ไขแผน"><Icon name="edit" /></Link>}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
