import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requirePage } from "@/lib/auth/dal";
import { getMachine, listAlarms, listMaintenance, listPlans, listUsers, machineReferences } from "@/lib/data/repo";
import { can } from "@/lib/permissions";
import { dueText, freqLabel } from "@/lib/pm";
import { fmtDate, fmtDateTime } from "@/lib/time";
import { ConfirmButton } from "@/components/client";
import { Icon } from "@/components/icons";
import { LinkButton, Notice, PageHeader, StatusPill } from "@/components/ui";
import { deleteMachineAction } from "../actions";

export const metadata: Metadata = { title: "ข้อมูลเครื่องจักร" };

export default async function MachineDetailPage({ params, searchParams }: PageProps<"/machines/[id]">) {
  const user = await requirePage("machines");
  const { id } = await params;
  const sp = await searchParams;
  const m = await getMachine(id);
  if (!m) notFound();

  const [alarms, jobs, plans, users, refs] = await Promise.all([
    listAlarms({ machineId: id }), listMaintenance(), listPlans(), listUsers(), machineReferences(id),
  ]);
  const myJobs = jobs.filter((r) => r.machineId === id);
  const myPlans = plans.filter((p) => p.machineId === id);
  const name = (uid: string) => users.find((u) => u.id === uid)?.name ?? "—";
  const history = [
    ...alarms.map((a) => ({ at: a.occurredAt, kind: "alarm" as const, a })),
    ...myJobs.map((r) => ({ at: r.date, kind: "job" as const, r })),
  ].sort((x, y) => y.at.localeCompare(x.at));
  const write = can(user.role, "machine:write");
  const hasRefs = refs.alarms + refs.maintenance + refs.plans > 0;

  return (
    <>
      <PageHeader title={`${m.id} · ${m.name}`}>
        {can(user.role, "plan:write") && <LinkButton href={`/plan/new?machine=${m.id}`} icon="plus">เพิ่มแผน PM</LinkButton>}
        {write && <LinkButton href={`/machines/${m.id}/edit`} icon="edit">แก้ไข</LinkButton>}
      </PageHeader>
      <Notice code={sp.notice} id={sp.id} />

      <div className="grid gap-4 lg:grid-cols-[1fr_1.4fr]">
        <div className="flex flex-col gap-4">
          <section className="panel p-4">
            <dl className="grid grid-cols-[120px_minmax(0,1fr)] gap-x-3 gap-y-2 text-[13.5px]">
              <dt className="text-muted">Machine ID</dt><dd className="font-mono font-semibold">{m.id}</dd>
              <dt className="text-muted">ประเภท</dt><dd>{m.type}</dd>
              <dt className="text-muted">Location</dt><dd>{m.location}</dd>
              <dt className="text-muted">สถานะ</dt><dd><StatusPill status={m.status} /></dd>
              <dt className="text-muted">Alarm ทั้งหมด</dt><dd className="num">{alarms.length} ครั้ง</dd>
            </dl>
          </section>

          <section className="panel">
            <div className="panel-head"><h2>แผนซ่อมบำรุง (PM)</h2></div>
            <div className="flex flex-col gap-2 p-4">
              {myPlans.length ? myPlans.map((p) => (
                <Link key={p.id} href={`/plan/${p.id}`} className="grid grid-cols-[minmax(0,1fr)_auto] gap-x-2.5 rounded-lg border border-line px-3 py-2 hover:border-line-strong hover:bg-surface-2">
                  <span><b className="font-mono">{p.id}</b> {p.task}</span>
                  <span className={p.state === "overdue" ? "due-overdue" : p.state === "soon" ? "due-soon" : "text-muted"}>{p.workOrderId ? "ออกใบงานแล้ว" : dueText(p.nextDue)}</span>
                  <small className="col-span-2 text-muted">{freqLabel(p.intervalDays)} · ครบกำหนด {fmtDate(p.nextDue)} · ทำล่าสุด {fmtDate(p.lastDone)}</small>
                </Link>
              )) : <p className="callout">ยังไม่มีแผน PM สำหรับเครื่องนี้</p>}
            </div>
          </section>

          {write && (
            <section className="panel p-4">
              <h2 className="mb-2 text-[15px] font-semibold">ลบเครื่องจักร</h2>
              {hasRefs ? (
                <p className="callout">ลบไม่ได้ เพราะมี Alarm {refs.alarms} รายการ งานซ่อม {refs.maintenance} งาน และแผน PM {refs.plans} แผนอ้างอิงอยู่ ถ้าเลิกใช้เครื่องนี้แล้วให้แก้สถานะเป็น <b>Stop</b> แทน เพื่อเก็บประวัติไว้</p>
              ) : (
                <ConfirmButton action={deleteMachineAction} fields={{ id: m.id }} message={`ลบ ${m.id} ${m.name} ถาวร? ย้อนกลับไม่ได้`}>
                  <Icon name="trash" /> ลบเครื่องจักร
                </ConfirmButton>
              )}
            </section>
          )}
        </div>

        <section className="panel">
          <div className="panel-head"><h2>ประวัติเครื่อง (Alarm และงานซ่อม)</h2></div>
          {history.length ? (
            <ol className="m-4 flex flex-col gap-3.5 border-l-2 border-line pl-4">
              {history.map((h) => (
                <li key={h.kind === "alarm" ? h.a.id : h.r.id} className="relative">
                  <span className={`absolute -left-[23px] top-1.5 size-3 rounded-full border-2 bg-surface ${h.kind === "alarm" ? "border-alarm" : "border-mnt"}`} />
                  {h.kind === "alarm" ? (
                    <Link href={`/alarms/${h.a.id}`} className="hover:underline"><b className="font-mono">{h.a.code}</b> {h.a.description}</Link>
                  ) : (
                    <Link href={`/maintenance/${h.r.id}/edit`} className="hover:underline"><b className="font-mono">{h.r.id}</b> {h.r.problem.split("\n")[0]}</Link>
                  )}{" "}
                  <StatusPill status={h.kind === "alarm" ? h.a.status : h.r.status} />
                  <span className="sub">
                    {fmtDateTime(h.at)}
                    {h.kind === "job" && ` · ${name(h.r.technicianId)}`}
                    {(h.kind === "alarm" ? h.a.action : h.r.action) && ` · ${h.kind === "alarm" ? h.a.action : h.r.action}`}
                  </span>
                </li>
              ))}
            </ol>
          ) : <p className="p-4 text-muted">ยังไม่มีประวัติ</p>}
        </section>
      </div>
    </>
  );
}
