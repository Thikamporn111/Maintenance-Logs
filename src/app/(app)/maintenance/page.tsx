import type { Metadata } from "next";
import Link from "next/link";
import { cookies } from "next/headers";
import { requirePage } from "@/lib/auth/dal";
import { listMachines, listMaintenance, listUsers } from "@/lib/data/repo";
import { can } from "@/lib/permissions";
import { fmtDateTime } from "@/lib/time";
import { MNT_STATUS, MNT_TYPES } from "@/lib/types";
import { pick, queryText } from "@/lib/validation";
import { FilterForm } from "@/components/client";
import { Icon } from "@/components/icons";
import { Empty, LinkButton, Notice, Options, PageHeader, StatusPill } from "@/components/ui";
import { getDictionary, type Locale } from "@/lib/i18n";

export const metadata: Metadata = { title: "Maintenance" };

export default async function MaintenancePage({ searchParams }: PageProps<"/maintenance">) {
  const user = await requirePage("maintenance");
  const cookieStore = await cookies();
  const locale = (cookieStore.get("locale")?.value || "th") as Locale;
  const t = getDictionary(locale);

  const sp = await searchParams;
  const [users, machines] = await Promise.all([listUsers(), listMachines()]);
  const techs = users.filter((u) => u.role !== "viewer");
  const f = {
    q: queryText(sp.q),
    status: pick(sp.status, MNT_STATUS),
    technicianId: pick(sp.tech, techs.map((u) => u.id)),
    type: pick(sp.type, MNT_TYPES),
  };
  const rows = await listMaintenance(f);
  const total = (await listMaintenance()).length;
  const write = can(user.role, "maintenance:write");
  const nameOf = (id: string) => users.find((u) => u.id === id)?.name ?? "—";
  const machineOf = (id: string) => machines.find((m) => m.id === id)?.name ?? id;

  const footerText = t.maintenance.showingFooter
    .replace("{count}", String(rows.length))
    .replace("{total}", String(total));

  return (
    <>
      <PageHeader title={t.maintenance.title}>
        {write && (
          <LinkButton href="/maintenance/new" icon="plus" primary>
            {t.maintenance.create}
          </LinkButton>
        )}
      </PageHeader>
      <Notice code={sp.notice} id={sp.id} locale={locale} />

      <section className="panel">
        <div className="panel-head">
          <FilterForm>
            <label className="relative flex-1 min-w-[200px] sm:min-w-[280px]">
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
                placeholder={t.maintenance.searchPlaceholder}
                maxLength={100}
              />
            </label>
            <select
              className="input w-full sm:w-auto min-w-[140px]"
              name="status"
              defaultValue={f.status}
              aria-label={t.common.statusHeader}
            >
              <Options list={MNT_STATUS} placeholder={t.common.allStatus} />
            </select>
            <select
              className="input w-full sm:w-auto min-w-[150px]"
              name="tech"
              defaultValue={f.technicianId}
              aria-label={t.maintenance.technician}
            >
              <Options
                list={techs.map((u) => [u.id, u.name] as const)}
                placeholder={t.common.allTechs}
              />
            </select>
            <select
              className="input w-full sm:w-auto min-w-[150px]"
              name="type"
              defaultValue={f.type}
              aria-label={t.maintenance.type}
            >
              <Options list={MNT_TYPES} placeholder={t.common.allTypes} />
            </select>
          </FilterForm>
        </div>

        {rows.length ? (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th className="w-44">{t.maintenance.workOrder}</th>
                  <th className="w-48">{t.maintenance.machine}</th>
                  <th>{t.maintenance.problemAction}</th>
                  <th className="w-40">{t.maintenance.technician}</th>
                  <th className="w-32">{t.maintenance.type}</th>
                  <th className="w-36">{t.common.statusHeader}</th>
                  <th className="w-20 text-right">{t.common.actionHeader}</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id}>
                    <td className="num whitespace-nowrap">
                      <div className="leading-tight">
                        {write ? (
                          <Link
                            href={`/maintenance/${r.id}/edit`}
                            className="font-mono font-bold text-accent hover:underline text-[13px]"
                          >
                            {r.id}
                          </Link>
                        ) : (
                          <b className="font-mono text-[13px]">{r.id}</b>
                        )}
                        {r.planId && <span className="tag text-[10.5px]">{r.planId}</span>}
                        <span className="sub mt-0.5">{fmtDateTime(r.date)}</span>
                      </div>
                    </td>
                    <td>
                      <div className="leading-tight">
                        <Link
                          href={`/machines/${r.machineId}`}
                          className="font-mono font-semibold hover:underline text-ink"
                        >
                          {r.machineId}
                        </Link>
                        <span className="sub mt-0.5">{machineOf(r.machineId)}</span>
                      </div>
                    </td>
                    <td>
                      <div className="leading-snug">
                        <span className="font-medium text-ink block">{r.problem.split("\n")[0]}</span>
                        <span className="sub mt-0.5">
                          {r.action || t.maintenance.notRecorded}
                        </span>
                      </div>
                    </td>
                    <td>
                      <span className="font-medium">{nameOf(r.technicianId)}</span>
                    </td>
                    <td>
                      <span className="inline-block px-2 py-0.5 rounded-md bg-surface-2 text-xs font-medium text-muted">
                        {r.type}
                      </span>
                    </td>
                    <td>
                      <StatusPill status={r.status} />
                    </td>
                    <td className="text-right">
                      {write ? (
                        <Link
                          href={`/maintenance/${r.id}/edit`}
                          className="btn btn-sm inline-flex items-center gap-1.5"
                          title={t.common.edit}
                        >
                          <Icon name="edit" className="size-3.5" />
                          <span>{t.common.edit}</span>
                        </Link>
                      ) : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <Empty>{t.maintenance.notFound}</Empty>
        )}
        <div className="px-5 py-3.5 text-[13px] text-muted border-t border-line bg-surface-2/40">
          {footerText}
        </div>
      </section>
    </>
  );
}
