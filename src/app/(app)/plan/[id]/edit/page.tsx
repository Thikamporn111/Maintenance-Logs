import type { Metadata } from "next";
import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import { requirePermission } from "@/lib/auth/dal";
import { getPlan } from "@/lib/data/repo";
import { ConfirmButton } from "@/components/client";
import { PageHeader } from "@/components/ui";
import { getDictionary, type Locale } from "@/lib/i18n";
import { PlanForm } from "../../PlanForm";
import { deactivatePlanAction, updatePlanAction } from "../../actions";
import { planOptions } from "../../options";

export const metadata: Metadata = { title: "Edit PM Plan" };

export default async function EditPlanPage({ params }: PageProps<"/plan/[id]/edit">) {
  await requirePermission("plan:write");
  const cookieStore = await cookies();
  const locale = (cookieStore.get("locale")?.value || "th") as Locale;
  const t = getDictionary(locale);

  const { id } = await params;
  const p = await getPlan(id);
  if (!p || !p.active) notFound();
  const opts = await planOptions();
  return (
    <>
      <PageHeader title={t.plan.editTitle.replace("{id}", p.id)}>
        <ConfirmButton action={deactivatePlanAction} fields={{ id: p.id }} message={t.plan.deactivateConfirm.replace("{id}", p.id)}>
          {t.plan.deactivateBtn}
        </ConfirmButton>
      </PageHeader>
      <PlanForm action={updatePlanAction.bind(null, p.id)} isNew={false} cancelHref={`/plan/${p.id}`} {...opts} locale={locale}
        initial={{ machineId: p.machineId, technicianId: p.technicianId, task: p.task, intervalDays: String(p.intervalDays), nextDue: p.nextDue, lastDone: p.lastDone ?? "", checklist: p.checklist }} />
    </>
  );
}
