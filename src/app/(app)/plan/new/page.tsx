import type { Metadata } from "next";
import { requirePermission } from "@/lib/auth/dal";
import { addDays, todayStr } from "@/lib/pm";
import { MACHINE_ID_RE } from "@/lib/validation";
import { PageHeader } from "@/components/ui";
import { PlanForm } from "../PlanForm";
import { createPlanAction } from "../actions";
import { planOptions } from "../options";

export const metadata: Metadata = { title: "เพิ่มแผน PM" };

export default async function NewPlanPage({ searchParams }: PageProps<"/plan/new">) {
  await requirePermission("plan:write");
  const sp = await searchParams;
  const machineId = typeof sp.machine === "string" && MACHINE_ID_RE.test(sp.machine) ? sp.machine : "";
  const opts = await planOptions();
  return (
    <>
      <PageHeader title={machineId ? `เพิ่มแผน PM ให้ ${machineId}` : "เพิ่มแผน PM"} />
      <PlanForm action={createPlanAction} isNew cancelHref={machineId ? `/machines/${machineId}` : "/plan"} {...opts}
        initial={{ machineId, technicianId: "", task: "", intervalDays: "30", nextDue: addDays(todayStr(), 7), lastDone: "", checklist: "" }} />
    </>
  );
}
