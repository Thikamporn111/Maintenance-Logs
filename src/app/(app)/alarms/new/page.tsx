import type { Metadata } from "next";
import { requirePermission } from "@/lib/auth/dal";
import { listMachines } from "@/lib/data/repo";
import { toPlantInput } from "@/lib/time";
import { PageHeader } from "@/components/ui";
import { AlarmCreateForm } from "../AlarmForms";
import { createAlarmAction } from "../actions";

export const metadata: Metadata = { title: "บันทึก Alarm" };

export default async function NewAlarmPage() {
  await requirePermission("alarm:create");
  const machines = (await listMachines()).map((m) => [m.id, `${m.id} · ${m.name}`] as [string, string]);
  return (
    <>
      <PageHeader title="บันทึก Alarm" />
      <AlarmCreateForm action={createAlarmAction} machines={machines} initial={{ machineId: "", code: "", occurredAt: toPlantInput(), description: "", cause: "" }} />
    </>
  );
}
