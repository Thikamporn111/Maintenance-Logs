import type { Metadata } from "next";
import Link from "next/link";
import { cookies } from "next/headers";
import { requirePage } from "@/lib/auth/dal";
import { listAlarms, listMachines } from "@/lib/data/repo";
import { can } from "@/lib/permissions";
import { fmtDateTime } from "@/lib/time";
import { ALARM_STATUS } from "@/lib/types";
import { pick, queryText } from "@/lib/validation";
import { FilterForm } from "@/components/client";
import { Icon } from "@/components/icons";
import { Empty, LinkButton, Notice, Options, PageHeader, StatusPill } from "@/components/ui";
import { getDictionary, type Locale } from "@/lib/i18n";

export const metadata: Metadata = { title: "Alarms" };
const DATE = /^\d{4}-\d{2}-\d{2}$/;

export default async function AlarmsPage({ searchParams }: PageProps<"/alarms">) {
  const user = await requirePage("alarms");
  const cookieStore = await cookies();
  const locale = (cookieStore.get("locale")?.value || "th") as Locale;
  const t = getDictionary(locale);

  const sp = await searchParams;
  const machines = await listMachines();
  const f = {
    q: queryText(sp.q),
    status: pick(sp.status, ALARM_STATUS),
    machineId: pick(sp.machine, machines.map((m) => m.id)),
    from: typeof sp.from === "string" && DATE.test(sp.from) ? sp.from : "",
    to: typeof sp.to === "string" && DATE.test(sp.to) ? sp.to : "",
  };
  const badRange = !!(f.from && f.to && f.from > f.to);
  const alarms = badRange ? [] : await listAlarms(f);
  const total = (await listAlarms()).length;
  const nameOf = (id: string) => machines.find((m) => m.id === id)?.name ?? id;

  const footerText = t.alarms.showingFooter
    .replace("{count}", String(alarms.length))
    .replace("{total}", String(total));

  return (
    <>
      <PageHeader title={t.alarms.title}>
        {can(user.role, "alarm:create") && (
          <LinkButton href="/alarms/new" icon="plus" primary>
            {t.alarms.add}
          </LinkButton>
        )}
      </PageHeader>
      <Notice code={sp.notice} id={sp.id} locale={locale} />

      <section className="panel">
        <div className="panel-head">
          <FilterForm>
            <label className="relative flex-1 min-w-[200px] sm:min-w-[260px]">
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
                placeholder={t.alarms.searchPlaceholder}
                maxLength={100}
              />
            </label>
            <select
              className="input w-full sm:w-auto min-w-[140px]"
              name="status"
              defaultValue={f.status}
              aria-label={t.common.statusHeader}
            >
              <Options list={ALARM_STATUS} placeholder={t.common.allStatus} />
            </select>
            <select
              className="input w-full sm:w-auto min-w-[170px]"
              name="machine"
              defaultValue={f.machineId}
              aria-label={t.alarms.machine}
            >
              <Options
                list={machines.map((m) => [m.id, `${m.id} · ${m.name}`] as const)}
                placeholder={t.common.allMachines}
              />
            </select>
            <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
              <label className="flex items-center gap-1.5 text-[13px] text-muted font-medium">
                {t.alarms.from}
                <input className="input w-auto min-h-[38px] py-1 text-xs" type="date" name="from" defaultValue={f.from} />
              </label>
              <label className="flex items-center gap-1.5 text-[13px] text-muted font-medium">
                {t.alarms.to}
                <input className="input w-auto min-h-[38px] py-1 text-xs" type="date" name="to" defaultValue={f.to} />
              </label>
            </div>
          </FilterForm>
        </div>

        {badRange ? (
          <Empty>
            <span className="err font-semibold">{t.alarms.badRange}</span>
          </Empty>
        ) : alarms.length ? (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th className="w-44">{t.alarms.occurredAt}</th>
                  <th className="w-48">{t.alarms.machine}</th>
                  <th>{t.alarms.alarm}</th>
                  <th>{t.alarms.cause}</th>
                  <th className="w-32">{t.common.statusHeader}</th>
                  <th className="w-20 text-right">{t.common.actionHeader}</th>
                </tr>
              </thead>
              <tbody>
                {alarms.map((a) => (
                  <tr key={a.id}>
                    <td className="num whitespace-nowrap">
                      <div className="leading-tight">
                        <Link
                          href={`/alarms/${a.id}`}
                          className="font-mono font-bold text-accent hover:underline text-[13px]"
                        >
                          {a.id}
                        </Link>
                        <span className="sub mt-0.5">{fmtDateTime(a.occurredAt)}</span>
                      </div>
                    </td>
                    <td>
                      <div className="leading-tight">
                        <span className="font-mono font-semibold text-ink">{a.machineId}</span>
                        <span className="sub mt-0.5">{nameOf(a.machineId)}</span>
                      </div>
                    </td>
                    <td>
                      <b className="font-mono text-sm">{a.code}</b>{" "}
                      <span className="text-ink">{a.description}</span>
                    </td>
                    <td>
                      {a.cause ? (
                        <span>{a.cause}</span>
                      ) : (
                        <span className="text-muted text-xs italic">{t.alarms.unspecified}</span>
                      )}
                    </td>
                    <td>
                      <StatusPill status={a.status} />
                    </td>
                    <td className="text-right">
                      <Link
                        href={`/alarms/${a.id}`}
                        className="btn btn-sm"
                        title={t.common.edit}
                      >
                        <span>{t.common.edit}</span>
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <Empty>{t.alarms.notFound}</Empty>
        )}
        <div className="px-5 py-3.5 text-[13px] text-muted border-t border-line bg-surface-2/40">
          {footerText}
        </div>
      </section>
    </>
  );
}
