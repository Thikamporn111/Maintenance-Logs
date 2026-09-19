import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requirePermission } from "@/lib/auth/dal";
import { getPlan } from "@/lib/data/repo";
import { ConfirmButton } from "@/components/client";
import { PageHeader } from "@/components/ui";
import { PlanForm } from "../../PlanForm";
import { deactivatePlanAction, updatePlanAction } from "../../actions";
import { planOptions } from "../../options";

export const metadata: Metadata = { title: "แก้ไขแผน PM" };

export default async function EditPlanPage({ params }: PageProps<"/plan/[id]/edit">) {
  await requirePermission("plan:write");
  const { id } = await params;
  const p = await getPlan(id);
  if (!p || !p.active) notFound();
  const opts = await planOptions();
  return (
    <>
      <PageHeader title={`แก้ไขแผน ${p.id}`}>
        <ConfirmButton action={deactivatePlanAction} fields={{ id: p.id }} message={`ปิดใช้งานแผน ${p.id}? แผนจะไม่แสดงในปฏิทินอีก แต่ใบงานเดิมยังอยู่ครบ`}>
          ปิดใช้งานแผน
        </ConfirmButton>
      </PageHeader>
      <PlanForm action={updatePlanAction.bind(null, p.id)} isNew={false} cancelHref={`/plan/${p.id}`} {...opts}
        initial={{ machineId: p.machineId, technicianId: p.technicianId, task: p.task, intervalDays: String(p.intervalDays), nextDue: p.nextDue, lastDone: p.lastDone ?? "", checklist: p.checklist }} />
    </>
  );
}
