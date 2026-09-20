import type { Metadata } from "next";
import Link from "next/link";
import { cookies } from "next/headers";
import { requirePage } from "@/lib/auth/dal";
import { activeAlarms, listMachines, listPlans } from "@/lib/data/repo";
import { can } from "@/lib/permissions";
import { dueText } from "@/lib/pm";
import { fmtDate } from "@/lib/time";
import { MACHINE_STATUS, MACHINE_TYPES } from "@/lib/types";
import { pick, queryText } from "@/lib/validation";
import { FilterForm } from "@/components/client";
import { Icon } from "@/components/icons";
import { Empty, LinkButton, Notice, Options, PageHeader, StatusPill } from "@/components/ui";
import { getDictionary, type Locale } from "@/lib/i18n";

export const metadata: Metadata = { title: "Machines" };

export default async function MachinesPage({ searchParams }: PageProps<"/machines">) {
  const user = await requirePage("machines");
  const cookieStore = await cookies();
  const locale = (cookieStore.get("locale")?.value || "th") as Locale;
  const t = getDictionary(locale);

  const sp = await searchParams;
  const f = { q: queryText(sp.q), status: pick(sp.status, MACHINE_STATUS), type: pick(sp.type, MACHINE_TYPES) };
  const [machines, alarms, plans] = await Promise.all([listMachines(f), activeAlarms(), listPlans()]);
  const total = (await listMachines()).length;
  const write = can(user.role, "machine:write");

  const footerText = t.machines.showingFooter
    .replace("{count}", String(machines.length))
    .replace("{total}", String(total));

  return (
    <>
      <PageHeader title={t.machines.title}>
        {write ? (
          <LinkButton href="/machines/new" icon="plus" primary>
            {t.machines.add}
          </LinkButton>
        ) : (
          <span className="hint inline-flex items-center gap-1.5">
            <Icon name="lock" className="size-4" /> {t.machines.readOnly}
          </span>
        )}
      </PageHeader>
      <Notice code={sp.notice} id={sp.id} locale={locale} />

      <section className="panel">
        <div className="panel-head">
          <FilterForm>
            <label className="relative flex-1 min-w-[220px] sm:min-w-[320px]">
              <span className="sr-only">{t.common.search}</span>
              <Icon
                name="search"
                className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-faint"
              />
              <input
                className="input w-full pl-9.5"
                type="search"
                name="q"
                defaultValue={f.q}
                placeholder={t.machines.searchPlaceholder}
                maxLength={100}
              />
            </label>
            <select
              className="input w-full sm:w-auto min-w-[160px]"
              name="status"
              defaultValue={f.status}
              aria-label={t.common.statusHeader}
            >
              <Options list={MACHINE_STATUS} placeholder={t.common.allStatus} />
            </select>
            <select
              className="input w-full sm:w-auto min-w-[160px]"
              name="type"
              defaultValue={f.type}
              aria-label={t.machines.type}
            >
              <Options list={MACHINE_TYPES} placeholder={t.common.allTypes} />
            </select>
          </FilterForm>
        </div>

        {machines.length ? (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th className="w-36">{t.machines.machineId}</th>
                  <th>{t.machines.name}</th>
                  <th className="w-40">{t.machines.type}</th>
                  <th className="w-40">{t.machines.location}</th>
                  <th className="w-36">{t.machines.status}</th>
                  <th className="w-32 text-center">{t.machines.openAlarms}</th>
                  <th className="w-48">{t.machines.nextPm}</th>
                  <th className="w-20 text-right">{t.common.actionHeader}</th>
                </tr>
              </thead>
              <tbody>
                {machines.map((m) => {
                  const open = alarms.filter((a) => a.machineId === m.id).length;
                  const next = plans.find((p) => p.machineId === m.id);
                  return (
                    <tr key={m.id}>
                      <td>
                        <Link
                          href={`/machines/${m.id}`}
                          className="font-mono font-bold text-accent hover:underline text-[13.5px]"
                        >
                          {m.id}
                        </Link>
                      </td>
                      <td className="font-medium text-ink">{m.name}</td>
                      <td>
                        <span className="inline-block px-2 py-0.5 rounded-md bg-surface-2 text-xs font-medium text-muted">
                          {m.type}
                        </span>
                      </td>
                      <td className="text-muted">{m.location}</td>
                      <td>
                        <StatusPill status={m.status} />
                      </td>
                      <td className="num text-center">
                        {open ? (
                          <span className="inline-flex items-center justify-center min-w-[24px] h-[22px] px-1.5 rounded-full bg-alarm-soft font-bold text-alarm text-xs">
                            {open}
                          </span>
                        ) : (
                          <span className="text-muted text-xs">0</span>
                        )}
                      </td>
                      <td>
                        {next ? (
                          <div className="leading-tight">
                            <span className="num font-medium">{fmtDate(next.nextDue)}</span>
                            <span
                              className={`sub mt-0.5 ${
                                next.state === "overdue"
                                  ? "due-overdue"
                                  : next.state === "soon"
                                  ? "due-soon"
                                  : ""
                              }`}
                            >
                              {next.workOrderId ? t.machines.workOrderIssued : dueText(next.nextDue)}
                            </span>
                          </div>
                        ) : (
                          <span className="text-muted text-xs">{t.machines.noPlan}</span>
                        )}
                      </td>
                      <td className="text-right">
                        {write && (
                          <Link
                            href={`/machines/${m.id}/edit`}
                            className="btn btn-sm inline-flex items-center gap-1.5"
                            aria-label={`${t.common.edit} ${m.id}`}
                            title={t.common.edit}
                          >
                            <Icon name="edit" className="size-3.5" />
                            <span>{t.common.edit}</span>
                          </Link>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <Empty>{t.machines.notFound}</Empty>
        )}
        <div className="px-5 py-3.5 text-[13px] text-muted border-t border-line bg-surface-2/40">
          {footerText}
        </div>
      </section>
    </>
  );
}
