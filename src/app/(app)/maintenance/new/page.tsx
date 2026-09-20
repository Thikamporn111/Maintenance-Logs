import type { Metadata } from "next";
import { cookies } from "next/headers";
import { requirePermission } from "@/lib/auth/dal";
import { getAlarm, getPlan } from "@/lib/data/repo";
import { toPlantInput } from "@/lib/time";
import { ALARM_ID_RE, PLAN_ID_RE } from "@/lib/validation";
import { PageHeader } from "@/components/ui";
import { getDictionary, type Locale } from "@/lib/i18n";
import { MaintenanceForm } from "../MaintenanceForm";
import { createMaintenanceAction } from "../actions";
import { maintenanceOptions } from "../options";

export const metadata: Metadata = { title: "Create Maintenance" };

export default async function NewMaintenancePage({ searchParams }: PageProps<"/maintenance/new">) {
  const user = await requirePermission("maintenance:write");
  const cookieStore = await cookies();
  const locale = (cookieStore.get("locale")?.value || "th") as Locale;
  const t = getDictionary(locale);

  const sp = await searchParams;
  const initial: Record<string, string> = {
    machineId: "", technicianId: user.role === "technician" ? user.id : "", type: "Corrective", date: toPlantInput(),
    status: "Open", alarmId: "", planId: "", problem: "", action: "",
  };

  // Prefill from an alarm (?alarm=ALM-0001) or a PM plan (?plan=PM-001). IDs are format-checked before lookup.
  const alarm = typeof sp.alarm === "string" && ALARM_ID_RE.test(sp.alarm) ? await getAlarm(sp.alarm) : undefined;
  const plan = typeof sp.plan === "string" && PLAN_ID_RE.test(sp.plan) ? await getPlan(sp.plan) : undefined;
  if (alarm) Object.assign(initial, { machineId: alarm.machineId, alarmId: alarm.status !== "Closed" ? alarm.id : "", problem: `${alarm.code} ${alarm.description}`, status: "In Progress" });
  if (plan && plan.active) {
    Object.assign(initial, {
      machineId: plan.machineId, technicianId: plan.technicianId, type: "Preventive", planId: plan.id,
      date: `${plan.nextDue}T08:00`,
      problem: plan.task + (plan.checklist ? `\n- ${plan.checklist.split("\n").filter(Boolean).join("\n- ")}` : ""),
    });
  }
  const opts = await maintenanceOptions();

  return (
    <>
      <PageHeader title={plan ? t.maintenance.createPmTitle.replace("{id}", plan.id) : t.maintenance.createTitle} />
      <MaintenanceForm
        action={createMaintenanceAction}
        initial={initial}
        {...opts}
        submitLabel={plan ? t.maintenance.submitIssue : t.maintenance.submitCreate}
        locale={locale}
      />
    </>
  );
}
