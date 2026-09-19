import type { Metadata } from "next";
import Link from "next/link";
import { requirePage } from "@/lib/auth/dal";
import { listMachines, listMaintenance, listUsers } from "@/lib/data/repo";
import { can } from "@/lib/permissions";
import { fmtDateTime } from "@/lib/time";
import { MNT_STATUS, MNT_TYPES } from "@/lib/types";
import { pick, queryText } from "@/lib/validation";
import { FilterForm } from "@/components/client";
import { Icon } from "@/components/icons";
import { Empty, LinkButton, Notice, Options, PageHeader, StatusPill } from "@/components/ui";

export const metadata: Metadata = { title: "Maintenance" };

export default async function MaintenancePage({ searchParams }: PageProps<"/maintenance">) {
  const user = await requirePage("maintenance");
  const sp = await searchParams;
  const [users, machines] = await Promise.all([listUsers(), listMachines()]);
  const techs = users.filter((u) => u.role !== "viewer");
  const f = { q: queryText(sp.q), status: pick(sp.status, MNT_STATUS), technicianId: pick(sp.tech, techs.map((u) => u.id)), type: pick(sp.type, MNT_TYPES) };
  const rows = await listMaintenance(f);
  const total = (await listMaintenance()).length;
  const write = can(user.role, "maintenance:write");
  const nameOf = (id: string) => users.find((u) => u.id === id)?.name ?? "—";
  const machineOf = (id: string) => machines.find((m) => m.id === id)?.name ?? id;

  return (
    <>
      <PageHeader title="Maintenance">
        {write && <LinkButton href="/maintenance/new" icon="plus" primary>สร้างงานซ่อม</LinkButton>}
      </PageHeader>
      <Notice code={sp.notice} id={sp.id} />
      <section className="panel">
        <div className="panel-head">
          <FilterForm>
            <label className="relative">
              <span className="sr-only">ค้นหา</span>
              <Icon name="search" className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-faint" />
              <input className="input w-60 pl-8" type="search" name="q" defaultValue={f.q} placeholder="ค้นหาเลขงาน / ปัญหา / เครื่อง" maxLength={100} />
            </label>
            <select className="input w-auto" name="status" defaultValue={f.status} aria-label="กรองสถานะ"><Options list={MNT_STATUS} placeholder="ทุกสถานะ" /></select>
            <select className="input w-auto" name="tech" defaultValue={f.technicianId} aria-label="กรองช่าง"><Options list={techs.map((u) => [u.id, u.name] as const)} placeholder="ช่างทุกคน" /></select>
            <select className="input w-auto" name="type" defaultValue={f.type} aria-label="กรองประเภทงาน"><Options list={MNT_TYPES} placeholder="ทุกประเภทงาน" /></select>
          </FilterForm>
        </div>
        {rows.length ? (
          <div className="table-wrap">
            <table className="data-table">
              <thead><tr><th>เลขงาน</th><th>เครื่องจักร</th><th>ปัญหา / การแก้ไข</th><th>ช่าง</th><th>ประเภท</th><th>สถานะ</th></tr></thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id}>
                    <td className="num whitespace-nowrap">
                      {write ? <Link href={`/maintenance/${r.id}/edit`} className="font-mono font-semibold text-accent hover:underline">{r.id}</Link> : <b className="font-mono">{r.id}</b>}
                      {r.planId && <span className="tag">{r.planId}</span>}
                      <span className="sub">{fmtDateTime(r.date)}</span>
                    </td>
                    <td><Link href={`/machines/${r.machineId}`} className="font-mono hover:underline">{r.machineId}</Link><span className="sub">{machineOf(r.machineId)}</span></td>
                    <td className="max-w-[28rem]">{r.problem.split("\n")[0]}<span className="sub">{r.action || "ยังไม่บันทึกการแก้ไข"}</span></td>
                    <td>{nameOf(r.technicianId)}</td>
                    <td>{r.type}</td>
                    <td><StatusPill status={r.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : <Empty>ไม่พบงานซ่อมที่ตรงกับเงื่อนไข</Empty>}
        <p className="px-4 py-3 text-[13px] text-muted">แสดง {rows.length} จาก {total} งาน</p>
      </section>
    </>
  );
}
