import type { Metadata } from "next";
import Link from "next/link";
import { requirePage } from "@/lib/auth/dal";
import { activeAlarms, listMachines, listPlans } from "@/lib/data/repo";
import { can } from "@/lib/permissions";
import { dueText } from "@/lib/pm";
import { fmtDate } from "@/lib/time";
import { MACHINE_STATUS, MACHINE_TYPES } from "@/lib/types";
import { pick, queryText } from "@/lib/validation";
import { FilterForm } from "@/components/client";
import { Icon } from "@/components/icons";
import { Empty, LinkButton, Notice, Options, PageHeader, StatusPill } from "@/components/ui";

export const metadata: Metadata = { title: "Machines" };

export default async function MachinesPage({ searchParams }: PageProps<"/machines">) {
  const user = await requirePage("machines");
  const sp = await searchParams;
  const f = { q: queryText(sp.q), status: pick(sp.status, MACHINE_STATUS), type: pick(sp.type, MACHINE_TYPES) };
  const [machines, alarms, plans] = await Promise.all([listMachines(f), activeAlarms(), listPlans()]);
  const total = (await listMachines()).length;
  const write = can(user.role, "machine:write");

  return (
    <>
      <PageHeader title="Machines">
        {write ? <LinkButton href="/machines/new" icon="plus" primary>เพิ่มเครื่องจักร</LinkButton>
          : <span className="hint inline-flex items-center gap-1"><Icon name="lock" className="size-4" /> ดูได้อย่างเดียว</span>}
      </PageHeader>
      <Notice code={sp.notice} id={sp.id} />
      <section className="panel">
        <div className="panel-head">
          <FilterForm>
            <label className="relative">
              <span className="sr-only">ค้นหา</span>
              <Icon name="search" className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-faint" />
              <input className="input w-64 pl-8" type="search" name="q" defaultValue={f.q} placeholder="ค้นหา Machine ID หรือชื่อ" maxLength={100} />
            </label>
            <select className="input w-auto" name="status" defaultValue={f.status} aria-label="กรองสถานะ"><Options list={MACHINE_STATUS} placeholder="ทุกสถานะ" /></select>
            <select className="input w-auto" name="type" defaultValue={f.type} aria-label="กรองประเภท"><Options list={MACHINE_TYPES} placeholder="ทุกประเภท" /></select>
          </FilterForm>
        </div>
        {machines.length ? (
          <div className="table-wrap">
            <table className="data-table">
              <thead><tr><th>Machine ID</th><th>ชื่อเครื่อง</th><th>ประเภท</th><th>Location</th><th>สถานะ</th><th>Alarm ค้าง</th><th>PM ถัดไป</th><th /></tr></thead>
              <tbody>
                {machines.map((m) => {
                  const open = alarms.filter((a) => a.machineId === m.id).length;
                  const next = plans.find((p) => p.machineId === m.id);
                  return (
                    <tr key={m.id}>
                      <td><Link href={`/machines/${m.id}`} className="font-mono font-semibold text-accent hover:underline">{m.id}</Link></td>
                      <td>{m.name}</td>
                      <td>{m.type}</td>
                      <td>{m.location}</td>
                      <td><StatusPill status={m.status} /></td>
                      <td className="num">{open ? <b className="text-alarm">{open}</b> : <span className="text-muted">0</span>}</td>
                      <td>{next ? <><span className="num">{fmtDate(next.nextDue)}</span><span className={`sub ${next.state === "overdue" ? "due-overdue" : next.state === "soon" ? "due-soon" : ""}`}>{next.workOrderId ? "ออกใบงานแล้ว" : dueText(next.nextDue)}</span></> : <span className="text-muted">ไม่มีแผน</span>}</td>
                      <td className="text-right">{write && <Link href={`/machines/${m.id}/edit`} className="icon-btn" aria-label={`แก้ไข ${m.id}`} title="แก้ไข"><Icon name="edit" /></Link>}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : <Empty>ไม่พบเครื่องจักรที่ตรงกับเงื่อนไข</Empty>}
        <p className="px-4 py-3 text-[13px] text-muted">แสดง {machines.length} จาก {total} เครื่อง · กดที่ Machine ID เพื่อดูประวัติและแผน PM</p>
      </section>
    </>
  );
}
