import type { Metadata } from "next";
import Link from "next/link";
import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import { requirePage } from "@/lib/auth/dal";
import { getMachine, listAlarms, listMaintenance, listPlans, listUsers, machineReferences } from "@/lib/data/repo";
import { can } from "@/lib/permissions";
import { dueText, freqLabel } from "@/lib/pm";
import { fmtDate, fmtDateTime } from "@/lib/time";
import { ConfirmButton } from "@/components/client";
import { Icon } from "@/components/icons";
import { FormError, LinkButton, Notice, PageHeader, StatusPill } from "@/components/ui";
import { getDictionary, type Locale } from "@/lib/i18n";
import { deleteMachineAction } from "../actions";

export const metadata: Metadata = { title: "Machine Details" };

export default async function MachineDetailPage({ params, searchParams }: PageProps<"/machines/[id]">) {
  const user = await requirePage("machines");
  const cookieStore = await cookies();
  const locale = (cookieStore.get("locale")?.value || "th") as Locale;
  const t = getDictionary(locale);

  const { id } = await params;
  const sp = await searchParams;
  const m = await getMachine(id);
  if (!m) notFound();

  const [alarms, jobs, plans, users, refs] = await Promise.all([
    listAlarms({ machineId: id }),
    listMaintenance(),
    listPlans(),
    listUsers(),
    machineReferences(id),
  ]);
  const myJobs = jobs.filter((r) => r.machineId === id);
  const myPlans = plans.filter((p) => p.machineId === id);
  const name = (uid: string) => users.find((u) => u.id === uid)?.name ?? "—";
  const history = [
    ...alarms.map((a) => ({ at: a.occurredAt, kind: "alarm" as const, a })),
    ...myJobs.map((r) => ({ at: r.date, kind: "job" as const, r })),
  ].sort((x, y) => y.at.localeCompare(x.at));
  const write = can(user.role, "machine:write");
  const hasRefs = refs.alarms + refs.maintenance + refs.plans > 0;

  const errorMessage = typeof sp.error === "string" ? decodeURIComponent(sp.error) : undefined;

  return (
    <>
      <PageHeader title={`${m.id} · ${m.name}`}>
        {can(user.role, "plan:write") && (
          <LinkButton href={`/plan/new?machine=${m.id}`} icon="plus">
            {t.plan.create}
          </LinkButton>
        )}
        {write && (
          <LinkButton href={`/machines/${m.id}/edit`} icon="edit">
            {t.common.edit}
          </LinkButton>
        )}
      </PageHeader>
      <Notice code={sp.notice} id={sp.id} locale={locale} />
      <FormError message={errorMessage} />

      <div className="grid gap-5 lg:grid-cols-[1fr_1.5fr] 2xl:grid-cols-[1fr_1.8fr]">
        <div className="flex flex-col gap-5">
          <section className="panel p-5 sm:p-6">
            <h2 className="text-base font-semibold border-b border-line pb-3 mb-4">{t.machines.generalInfo}</h2>
            <dl className="grid grid-cols-[130px_minmax(0,1fr)] gap-x-4 gap-y-3 text-[13.5px]">
              <dt className="text-muted">{t.machines.machineId}</dt>
              <dd className="font-mono font-bold text-accent">{m.id}</dd>
              <dt className="text-muted">{t.machines.type}</dt>
              <dd className="font-medium text-ink">{m.type}</dd>
              <dt className="text-muted">{t.machines.location}</dt>
              <dd className="text-ink">{m.location}</dd>
              <dt className="text-muted">{t.machines.currentStatus}</dt>
              <dd>
                <StatusPill status={m.status} label={t.status[m.status] || m.status} />
              </dd>
              <dt className="text-muted">{t.machines.totalAlarms}</dt>
              <dd className="num font-semibold">{t.machines.totalAlarmsCount.replace("{count}", String(alarms.length))}</dd>
            </dl>
          </section>

          <section className="panel">
            <div className="panel-head">
              <h2>{t.machines.pmPlans}</h2>
            </div>
            <div className="flex flex-col gap-2.5 p-4 sm:p-5">
              {myPlans.length ? (
                myPlans.map((p) => (
                  <Link
                    key={p.id}
                    href={`/plan/${p.id}`}
                    className="grid grid-cols-[minmax(0,1fr)_auto] gap-x-3 rounded-xl border border-line p-3.5 hover:border-line-strong hover:bg-surface-2 transition-colors"
                  >
                    <span>
                      <b className="font-mono text-accent">{p.id}</b> {p.task}
                    </span>
                    <span
                      className={
                        p.state === "overdue"
                          ? "due-overdue"
                          : p.state === "soon"
                          ? "due-soon"
                          : "text-muted"
                      }
                    >
                      {p.workOrderId ? t.machines.workOrderIssued : dueText(p.nextDue, undefined, locale)}
                    </span>
                    <small className="col-span-2 text-muted mt-1">
                      {freqLabel(p.intervalDays, locale)} · {t.plan.nextDueLabel} {fmtDate(p.nextDue, undefined, locale)} · {t.plan.lastDoneLabel} {fmtDate(p.lastDone, undefined, locale)}
                    </small>
                  </Link>
                ))
              ) : (
                <p className="callout">{t.machines.noPmForMachine}</p>
              )}
            </div>
          </section>

          {write && (
            <section className="panel p-5">
              <h2 className="mb-2 text-sm font-semibold text-alarm">{t.machines.deleteTitle}</h2>
              {hasRefs ? (
                <p className="callout text-xs leading-relaxed">
                  {t.machines.deleteBlocked
                    .replace("{alarms}", String(refs.alarms))
                    .replace("{maintenance}", String(refs.maintenance))
                    .replace("{plans}", String(refs.plans))}
                </p>
              ) : (
                <ConfirmButton
                  action={deleteMachineAction}
                  fields={{ id: m.id }}
                  message={t.machines.deleteConfirm.replace("{id}", m.id).replace("{name}", m.name)}
                >
                  <Icon name="trash" /> {t.machines.deleteBtn}
                </ConfirmButton>
              )}
            </section>
          )}
        </div>

        <section className="panel flex flex-col">
          <div className="panel-head">
            <h2>{t.machines.historyTitle}</h2>
            <span className="text-xs text-muted font-medium">{t.machines.historyCount.replace("{count}", String(history.length))}</span>
          </div>
          <div className="p-5 sm:p-6 flex-1">
            {history.length ? (
              <ol className="relative flex flex-col gap-4 border-l-2 border-line pl-5 ml-2">
                {history.map((h) => (
                  <li key={h.kind === "alarm" ? h.a.id : h.r.id} className="relative">
                    <span
                      className={`absolute -left-[27px] top-1.5 size-3.5 rounded-full border-2 bg-surface ${
                        h.kind === "alarm" ? "border-alarm" : "border-mnt"
                      }`}
                    />
                    <div className="flex flex-wrap items-center gap-2">
                      {h.kind === "alarm" ? (
                        <Link href={`/alarms/${h.a.id}`} className="hover:underline">
                          <b className="font-mono text-alarm">{h.a.code}</b> {h.a.description}
                        </Link>
                      ) : (
                        <Link href={`/maintenance/${h.r.id}/edit`} className="hover:underline">
                          <b className="font-mono text-mnt">{h.r.id}</b> {h.r.problem.split("\n")[0]}
                        </Link>
                      )}
                      <StatusPill
                        status={h.kind === "alarm" ? h.a.status : h.r.status}
                        label={t.status[h.kind === "alarm" ? h.a.status : h.r.status] || (h.kind === "alarm" ? h.a.status : h.r.status)}
                      />
                    </div>
                    <span className="sub mt-1">
                      {fmtDateTime(h.at, locale)}
                      {h.kind === "job" && ` · ${name(h.r.technicianId)}`}
                      {(h.kind === "alarm" ? h.a.action : h.r.action) &&
                        ` · ${h.kind === "alarm" ? h.a.action : h.r.action}`}
                    </span>
                  </li>
                ))}
              </ol>
            ) : (
              <p className="py-12 text-center text-muted">{t.machines.noHistory}</p>
            )}
          </div>
        </section>
      </div>
    </>
  );
}
