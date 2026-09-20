import type { Metadata } from "next";
import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import { requirePermission } from "@/lib/auth/dal";
import { getMaintenance } from "@/lib/data/repo";
import { toPlantInput } from "@/lib/time";
import { PageHeader } from "@/components/ui";
import { getDictionary, type Locale } from "@/lib/i18n";
import { MaintenanceForm } from "../../MaintenanceForm";
import { updateMaintenanceAction } from "../../actions";
import { maintenanceOptions } from "../../options";

export const metadata: Metadata = { title: "Edit Maintenance" };

export default async function EditMaintenancePage({ params }: PageProps<"/maintenance/[id]/edit">) {
  await requirePermission("maintenance:write");
  const cookieStore = await cookies();
  const locale = (cookieStore.get("locale")?.value || "th") as Locale;
  const t = getDictionary(locale);

  const { id } = await params;
  const r = await getMaintenance(id);
  if (!r) notFound();
  const opts = await maintenanceOptions(r.alarmId);
  const initial = { ...r, date: toPlantInput(r.date), alarmId: r.alarmId ?? "", planId: r.planId ?? "" };
  return (
    <>
      <PageHeader title={t.maintenance.editTitle.replace("{id}", r.id)} />
      <MaintenanceForm
        action={updateMaintenanceAction.bind(null, r.id)}
        initial={initial}
        {...opts}
        submitLabel={t.maintenance.saveChanges}
        locale={locale}
      />
    </>
  );
}
