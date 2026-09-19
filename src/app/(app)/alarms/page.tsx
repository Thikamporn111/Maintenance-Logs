import type { Metadata } from "next";
import Link from "next/link";
import { requirePage } from "@/lib/auth/dal";
import { listAlarms, listMachines } from "@/lib/data/repo";
import { can } from "@/lib/permissions";
import { fmtDateTime } from "@/lib/time";
import { ALARM_STATUS } from "@/lib/types";
import { pick, queryText } from "@/lib/validation";
import { FilterForm } from "@/components/client";
import { Icon } from "@/components/icons";
import { Empty, LinkButton, Notice, Options, PageHeader, StatusPill } from "@/components/ui";

export const metadata: Metadata = { title: "Alarms" };
const DATE = /^\d{4}-\d{2}-\d{2}$/;

export default async function AlarmsPage({ searchParams }: PageProps<"/alarms">) {
  const user = await requirePage("alarms");
  const sp = await searchParams;
  const machines = await listMachines();
  const f = {
    q: queryText(sp.q),
    status: pick(sp.status, ALARM_STATUS),
    machineId: pick(sp.machine, machines.map((m) => m.id)),
    from: typeof sp.from === "string" && DATE.test(sp.from) ? sp.from : "",
    to: typeof sp.to === "string" && DATE.test(sp.to) ? sp.to : "",
  };
  const badRange = !!(f.from && f.to && f.from > f.to);
  const alarms = badRange ? [] : await listAlarms(f);
  const total = (await listAlarms()).length;
  const nameOf = (id: string) => machines.find((m) => m.id === id)?.name ?? id;

  return (
    <>
      <PageHeader title="Alarms">
        {can(user.role, "alarm:create") && <LinkButton href="/alarms/new" icon="plus" primary>บันทึก Alarm</LinkButton>}
      </PageHeader>
      <Notice code={sp.notice} id={sp.id} />
      <section className="panel">
        <div className="panel-head">
          <FilterForm>
            <label className="relative">
              <span className="sr-only">ค้นหา</span>
              <Icon name="search" className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-faint" />
              <input className="input w-60 pl-8" type="search" name="q" defaultValue={f.q} placeholder="ค้นหา Alarm Code / รายละเอียด" maxLength={100} />
            </label>
            <select className="input w-auto" name="status" defaultValue={f.status} aria-label="กรองสถานะ"><Options list={ALARM_STATUS} placeholder="ทุกสถานะ" /></select>
            <select className="input w-auto max-w-56" name="machine" defaultValue={f.machineId} aria-label="กรองเครื่องจักร">
              <Options list={machines.map((m) => [m.id, `${m.id} · ${m.name}`] as const)} placeholder="ทุกเครื่อง" />
            </select>
            <label className="flex items-center gap-1.5 text-[13px] text-muted">ตั้งแต่<input className="input w-auto" type="date" name="from" defaultValue={f.from} /></label>
            <label className="flex items-center gap-1.5 text-[13px] text-muted">ถึง<input className="input w-auto" type="date" name="to" defaultValue={f.to} /></label>
          </FilterForm>
        </div>
        {badRange ? <Empty><span className="err">วันที่เริ่มต้องไม่เกินวันที่สิ้นสุด</span></Empty> : alarms.length ? (
          <div className="table-wrap">
            <table className="data-table">
              <thead><tr><th>เวลาเกิด</th><th>เครื่องจักร</th><th>Alarm</th><th>สาเหตุ</th><th>สถานะ</th></tr></thead>
              <tbody>
                {alarms.map((a) => (
                  <tr key={a.id}>
                    <td className="num whitespace-nowrap"><Link href={`/alarms/${a.id}`} className="font-mono font-semibold text-accent hover:underline">{a.id}</Link><span className="sub">{fmtDateTime(a.occurredAt)}</span></td>
                    <td><span className="font-mono">{a.machineId}</span><span className="sub">{nameOf(a.machineId)}</span></td>
                    <td><b className="font-mono">{a.code}</b> {a.description}</td>
                    <td>{a.cause || <span className="text-muted">ยังไม่ระบุ</span>}</td>
                    <td><StatusPill status={a.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : <Empty>ไม่พบ Alarm ที่ตรงกับเงื่อนไข</Empty>}
        <p className="px-4 py-3 text-[13px] text-muted">แสดง {alarms.length} จาก {total} รายการ</p>
      </section>
    </>
  );
}
