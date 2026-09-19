import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requirePage } from "@/lib/auth/dal";
import { getAlarm, getMachine, getUser, listMaintenance } from "@/lib/data/repo";
import { can } from "@/lib/permissions";
import { fmtDateTime } from "@/lib/time";
import { LinkButton, Notice, PageHeader, StatusPill } from "@/components/ui";
import { AlarmUpdateForm } from "../AlarmForms";
import { updateAlarmAction } from "../actions";

export const metadata: Metadata = { title: "รายละเอียด Alarm" };

export default async function AlarmDetailPage({ params, searchParams }: PageProps<"/alarms/[id]">) {
  const user = await requirePage("alarms");
  const { id } = await params;
  const sp = await searchParams;
  const a = await getAlarm(id);
  if (!a) notFound();
  const [machine, assignee, closer, jobs] = await Promise.all([
    getMachine(a.machineId), a.assigneeId ? getUser(a.assigneeId) : undefined, a.closedBy ? getUser(a.closedBy) : undefined, listMaintenance(),
  ]);
  const linkedJobs = jobs.filter((r) => r.alarmId === a.id);
  const editable = can(user.role, "alarm:update") && a.status !== "Closed";

  return (
    <>
      <PageHeader title={`${a.id} · ${a.code}`}>
        {can(user.role, "maintenance:write") && <LinkButton href={`/maintenance/new?alarm=${a.id}`} icon="wrench">สร้างงานซ่อม</LinkButton>}
      </PageHeader>
      <Notice code={sp.notice} id={sp.id} />
      <div className="grid gap-4 lg:grid-cols-2">
        <section className="panel p-4">
          <dl className="grid grid-cols-[120px_minmax(0,1fr)] gap-x-3 gap-y-2 text-[13.5px]">
            <dt className="text-muted">สถานะ</dt><dd><StatusPill status={a.status} /></dd>
            <dt className="text-muted">เครื่องจักร</dt><dd><Link href={`/machines/${a.machineId}`} className="font-mono text-accent hover:underline">{a.machineId}</Link> · {machine?.name}</dd>
            <dt className="text-muted">Alarm</dt><dd><b className="font-mono">{a.code}</b> {a.description}</dd>
            <dt className="text-muted">เวลาเกิด</dt><dd>{fmtDateTime(a.occurredAt)}</dd>
            {assignee && <><dt className="text-muted">ผู้รับงาน</dt><dd>{assignee.name}</dd></>}
            <dt className="text-muted">สาเหตุ</dt><dd>{a.cause || <span className="text-muted">ยังไม่ระบุ</span>}</dd>
            <dt className="text-muted">Action Taken</dt><dd>{a.action || <span className="text-muted">ยังไม่ระบุ</span>}</dd>
            {a.status === "Closed" && <><dt className="text-muted">ปิดโดย</dt><dd>{closer?.name ?? "—"} · {fmtDateTime(a.closedAt)}</dd></>}
            <dt className="text-muted">งานซ่อม</dt>
            <dd>{linkedJobs.length ? linkedJobs.map((r) => <Link key={r.id} href={`/maintenance/${r.id}/edit`} className="mr-2 font-mono text-accent hover:underline">{r.id}</Link>) : <span className="text-muted">ยังไม่มี</span>}</dd>
          </dl>
        </section>
        <section className="panel p-4">
          <h2 className="mb-3 text-[15px] font-semibold">อัปเดตสถานะ</h2>
          {editable ? (
            <AlarmUpdateForm action={updateAlarmAction.bind(null, a.id)} initial={{ status: a.status, cause: a.cause, action: a.action }} />
          ) : (
            <p className="callout">{a.status === "Closed" ? "Alarm นี้ปิดแล้ว ข้อมูลถูกล็อกไว้เพื่อเก็บเป็นประวัติ" : "บัญชีนี้ดูได้อย่างเดียว"}</p>
          )}
        </section>
      </div>
    </>
  );
}
