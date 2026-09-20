import type { Metadata } from "next";
import Link from "next/link";
import { cookies } from "next/headers";
import { requirePage } from "@/lib/auth/dal";
import { listMachines, listPlans, listUsers } from "@/lib/data/repo";
import { can } from "@/lib/permissions";
import { type PlanState } from "@/lib/pm";
import { pick, queryText } from "@/lib/validation";
import { FilterForm } from "@/components/client";
import { Icon } from "@/components/icons";
import { FormError, LinkButton, Notice, PageHeader } from "@/components/ui";
import { getDictionary, type Locale } from "@/lib/i18n";
import { MachineTimeline, PlanCalendar, PlanList } from "./views";

export const metadata: Metadata = { title: "Maintenance Plan" };

const VIEWS = ["machine", "calendar", "list"] as const;
const STATES: PlanState[] = ["overdue", "soon", "issued", "ok"];
const SUM_CLASS: Record<PlanState, string> = {
  overdue: "border-l-alarm [&_b]:text-alarm",
  soon: "border-l-warn [&_b]:text-warn",
  issued: "border-l-accent [&_b]:text-accent",
  ok: "border-l-ok [&_b]:text-ok",
};

export default async function PlanPage({ searchParams }: PageProps<"/plan">) {
  const user = await requirePage("plan");
  const cookieStore = await cookies();
  const locale = (cookieStore.get("locale")?.value || "th") as Locale;
  const t = getDictionary(locale);

  const sp = await searchParams;
  const view = pick(sp.view, VIEWS) || "machine";
  const state = pick(sp.state, STATES);
  const q = queryText(sp.q);
  const month = Math.max(-24, Math.min(24, Number.parseInt(typeof sp.month === "string" ? sp.month : "0", 10) || 0));

  const [all, filtered, machines, users] = await Promise.all([
    listPlans(),
    listPlans({ state, q }),
    listMachines(),
    listUsers(),
  ]);

  const count = (s: PlanState) => all.filter((p) => p.state === s).length;
  const href = (over: Record<string, string | number | undefined>) => {
    const params = new URLSearchParams();
    const merged = { view, state, q, month: view === "calendar" ? month : undefined, ...over };
    Object.entries(merged).forEach(([k, v]) => {
      if (v !== undefined && v !== "" && !(k === "view" && v === "machine") && !(k === "month" && v === 0))
        params.set(k, String(v));
    });
    const s = params.toString();
    return s ? `/plan?${s}` : "/plan";
  };

  const errorMessage = typeof sp.error === "string" ? decodeURIComponent(sp.error) : undefined;

  return (
    <>
      <PageHeader title={t.plan.title}>
        {can(user.role, "plan:write") && (
          <LinkButton href="/plan/new" icon="plus" primary>
            {t.plan.create}
          </LinkButton>
        )}
      </PageHeader>
      <Notice code={sp.notice} id={sp.id} locale={locale} />
      <FormError message={errorMessage} />

      <div className="grid grid-cols-2 gap-3.5 lg:grid-cols-4">
        {STATES.map((s) => (
          <Link
            key={s}
            href={href({ state: state === s ? "" : s })}
            aria-current={state === s ? "true" : undefined}
            className={`flex flex-col justify-between rounded-xl border border-l-4 border-line bg-surface p-4 sm:p-5 shadow-xs hover:shadow-md transition-all aria-[current]:ring-2 aria-[current]:ring-accent ${SUM_CLASS[s]}`}
          >
            <span className="text-xs sm:text-[13px] font-medium text-muted">{t.plan.stateLabels[s]}</span>
            <b className="num text-3xl sm:text-4xl font-bold tracking-tight mt-1">{count(s)}</b>
          </Link>
        ))}
      </div>

      <section className="panel">
        <div className="panel-head">
          <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
            <div className="inline-flex overflow-hidden rounded-lg border border-line-strong p-0.5 bg-surface-2" role="group" aria-label={t.common.viewLabel}>
              {VIEWS.map((v) => (
                <Link
                  key={v}
                  href={href({ view: v, month: undefined })}
                  aria-current={view === v ? "page" : undefined}
                  className={`px-3.5 py-1.5 text-xs sm:text-sm font-medium rounded-md transition-colors ${
                    view === v ? "bg-accent text-accent-ink shadow-xs" : "text-muted hover:text-ink"
                  }`}
                >
                  {v === "machine" ? t.plan.viewMachine : v === "calendar" ? t.plan.viewCalendar : t.plan.viewList}
                </Link>
              ))}
            </div>
            {state && (
              <Link href={href({ state: "" })} className="btn btn-sm text-xs">
                {t.plan.clearFilter}: {t.plan.stateLabels[state]} ✕
              </Link>
            )}
          </div>

          <FilterForm className="flex items-center gap-2.5 flex-1 max-w-md ml-auto">
            <input type="hidden" name="view" value={view === "machine" ? "" : view} />
            <input type="hidden" name="state" value={state} />
            <label className="relative w-full">
              <span className="sr-only">{t.common.search}</span>
              <Icon
                name="search"
                className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-faint"
              />
              <input
                className="input w-full pl-9.5"
                type="search"
                name="q"
                defaultValue={q}
                placeholder={t.plan.searchPlaceholder}
                maxLength={100}
              />
            </label>
          </FilterForm>
        </div>

        {view === "machine" && (
          <MachineTimeline
            plans={filtered}
            machines={machines}
            filtering={!!(state || q)}
            canAdd={can(user.role, "plan:write")}
            locale={locale}
          />
        )}
        {view === "calendar" && (
          <PlanCalendar plans={filtered} monthOffset={month} baseHref={(mo) => href({ month: mo })} locale={locale} />
        )}
        {view === "list" && (
          <PlanList
            plans={filtered}
            canIssue={can(user.role, "plan:issue")}
            canEdit={can(user.role, "plan:write")}
            technicianName={(id) => users.find((u) => u.id === id)?.name ?? "—"}
            locale={locale}
          />
        )}
      </section>
    </>
  );
}
