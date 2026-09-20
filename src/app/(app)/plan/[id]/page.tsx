import type { Metadata } from "next";
import Link from "next/link";
import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import { requirePage } from "@/lib/auth/dal";
import { getMachine, getUser, listMaintenance, listPlans } from "@/lib/data/repo";
import { can } from "@/lib/permissions";
import { dueText, freqLabel } from "@/lib/pm";
import { fmtDate, fmtDateTime } from "@/lib/time";
import { FormError, LinkButton, Notice, PageHeader, StatusPill } from "@/components/ui";
import { getDictionary, type Locale } from "@/lib/i18n";

export const metadata: Metadata = { title: "PM Plan" };

export default async function PlanDetailPage({ params, searchParams }: PageProps<"/plan/[id]">) {
  const user = await requirePage("plan");
  const cookieStore = await cookies();
  const locale = (cookieStore.get("locale")?.value || "th") as Locale;
  const t = getDictionary(locale);

  const { id } = await params;
  const sp = await searchParams;
  const p = (await listPlans()).find((x) => x.id === id);
  if (!p) notFound();
  const [machine, tech, jobs] = await Promise.all([getMachine(p.machineId), getUser(p.technicianId), listMaintenance()]);
  const history = jobs.filter((r) => r.planId === p.id);
  const items = p.checklist.split("\n").map((s) => s.trim()).filter(Boolean);
  const dueCls = p.state === "overdue" ? "due-overdue" : p.state === "soon" ? "due-soon" : "";

  const errorMessage = typeof sp.error === "string" ? decodeURIComponent(sp.error) : undefined;

  return (
    <>
      <PageHeader title={`${p.id} · ${p.task}`}>
        {p.workOrderId
          ? can(user.role, "maintenance:write") && <LinkButton href={`/maintenance/${p.workOrderId}/edit`} primary>{t.plan.openWorkOrder.replace("{id}", p.workOrderId)}</LinkButton>
          : can(user.role, "plan:issue") && <LinkButton href={`/maintenance/new?plan=${p.id}`} icon="wrench" primary>{t.plan.issueWorkOrder}</LinkButton>}
        {can(user.role, "plan:write") && <LinkButton href={`/plan/${p.id}/edit`} icon="edit">{t.plan.editPlan}</LinkButton>}
      </PageHeader>
      <Notice code={sp.notice} id={sp.id} locale={locale} />
      <FormError message={errorMessage} />
      <div className="grid gap-4 lg:grid-cols-2">
        <section className="panel flex flex-col gap-4 p-4">
          <dl className="grid grid-cols-[120px_minmax(0,1fr)] gap-x-3 gap-y-2 text-[13.5px]">
            <dt className="text-muted">{t.machines.title}</dt><dd><Link href={`/machines/${p.machineId}`} className="font-mono text-accent hover:underline">{p.machineId}</Link> · {machine?.name}</dd>
            <dt className="text-muted">{t.plan.freqLabel}</dt><dd>{freqLabel(p.intervalDays, locale)}</dd>
            <dt className="text-muted">{t.maintenance.technician}</dt><dd>{tech?.name ?? "—"}</dd>
            <dt className="text-muted">{t.plan.lastDoneLabel}</dt><dd>{fmtDate(p.lastDone, undefined, locale)}</dd>
            <dt className="text-muted">{t.plan.nextDueLabel}</dt><dd>{fmtDate(p.nextDue, undefined, locale)} · <span className={dueCls}>{t.plan.stateLabels[p.state]}{p.state !== "issued" && ` (${dueText(p.nextDue, undefined, locale)})`}</span></dd>
          </dl>
          {items.length > 0 && (
            <div>
              <div className="eyebrow mb-1.5">{t.plan.checklistLabel}</div>
              <ol className="flex list-decimal flex-col gap-1 pl-5">{items.map((i) => <li key={i}>{i}</li>)}</ol>
            </div>
          )}
        </section>
        <section className="panel">
          <div className="panel-head"><h2>{t.plan.jobsFromPlan}</h2></div>
          {history.length ? (
            <ul>
              {history.map((r) => (
                <li key={r.id} className="flex items-center gap-3 border-b border-line px-4 py-2.5 last:border-b-0">
                  <Link href={`/maintenance/${r.id}/edit`} className="font-mono font-semibold text-accent hover:underline">{r.id}</Link>
                  <span className="text-[13px] text-muted">{fmtDateTime(r.date, locale)}</span>
                  <span className="ml-auto"><StatusPill status={r.status} label={t.status[r.status] || r.status} /></span>
                </li>
              ))}
            </ul>
          ) : <p className="callout m-4">{t.plan.noJobsFromPlan}</p>}
        </section>
      </div>
    </>
  );
}
