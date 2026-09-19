import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requirePermission } from "@/lib/auth/dal";
import { getMaintenance } from "@/lib/data/repo";
import { toPlantInput } from "@/lib/time";
import { PageHeader } from "@/components/ui";
import { MaintenanceForm } from "../../MaintenanceForm";
import { updateMaintenanceAction } from "../../actions";
import { maintenanceOptions } from "../../options";

export const metadata: Metadata = { title: "แก้ไขงานซ่อม" };

export default async function EditMaintenancePage({ params }: PageProps<"/maintenance/[id]/edit">) {
  await requirePermission("maintenance:write");
  const { id } = await params;
  const r = await getMaintenance(id);
  if (!r) notFound();
  const opts = await maintenanceOptions(r.alarmId);
  const initial = { ...r, date: toPlantInput(r.date), alarmId: r.alarmId ?? "", planId: r.planId ?? "" };
  return (
    <>
      <PageHeader title={`แก้ไขงาน ${r.id}`} />
      <MaintenanceForm action={updateMaintenanceAction.bind(null, r.id)} initial={initial} {...opts} submitLabel="บันทึกการแก้ไข" />
    </>
  );
}
