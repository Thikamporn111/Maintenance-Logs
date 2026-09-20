import type { Metadata } from "next";
import { cookies } from "next/headers";
import { requirePermission } from "@/lib/auth/dal";
import { addDays, todayStr } from "@/lib/pm";
import { MACHINE_ID_RE } from "@/lib/validation";
import { PageHeader } from "@/components/ui";
import { getDictionary, type Locale } from "@/lib/i18n";
import { PlanForm } from "../PlanForm";
import { createPlanAction } from "../actions";
import { planOptions } from "../options";

export const metadata: Metadata = { title: "Add PM Plan" };

export default async function NewPlanPage({ searchParams }: PageProps<"/plan/new">) {
  await requirePermission("plan:write");
  const cookieStore = await cookies();
  const locale = (cookieStore.get("locale")?.value || "th") as Locale;
  const t = getDictionary(locale);

  const sp = await searchParams;
  const machineId = typeof sp.machine === "string" && MACHINE_ID_RE.test(sp.machine) ? sp.machine : "";
  const opts = await planOptions();
  return (
    <>
      <PageHeader title={machineId ? t.plan.createForMachineTitle.replace("{machineId}", machineId) : t.plan.createTitle} />
      <PlanForm action={createPlanAction} isNew cancelHref={machineId ? `/machines/${machineId}` : "/plan"} {...opts} locale={locale}
        initial={{ machineId, technicianId: "", task: "", intervalDays: "30", nextDue: addDays(todayStr(), 7), lastDone: "", checklist: "" }} />
    </>
  );
}
