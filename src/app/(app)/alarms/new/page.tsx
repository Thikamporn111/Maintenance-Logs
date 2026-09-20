import type { Metadata } from "next";
import { cookies } from "next/headers";
import { requirePermission } from "@/lib/auth/dal";
import { listMachines } from "@/lib/data/repo";
import { toPlantInput } from "@/lib/time";
import { PageHeader } from "@/components/ui";
import { getDictionary, type Locale } from "@/lib/i18n";
import { AlarmCreateForm } from "../AlarmForms";
import { createAlarmAction } from "../actions";

export const metadata: Metadata = { title: "Log Alarm" };

export default async function NewAlarmPage() {
  await requirePermission("alarm:create");
  const cookieStore = await cookies();
  const locale = (cookieStore.get("locale")?.value || "th") as Locale;
  const t = getDictionary(locale);

  const machines = (await listMachines()).map((m) => [m.id, `${m.id} · ${m.name}`] as [string, string]);
  return (
    <>
      <PageHeader title={t.alarms.addTitle} />
      <AlarmCreateForm action={createAlarmAction} machines={machines} locale={locale} initial={{ machineId: "", code: "", occurredAt: toPlantInput(), description: "", cause: "" }} />
    </>
  );
}
