import type { Metadata } from "next";
import Link from "next/link";
import { requirePage } from "@/lib/auth/dal";
import { listMachines, listPlans, listUsers } from "@/lib/data/repo";
import { can } from "@/lib/permissions";
import { PLAN_STATE_LABEL, type PlanState } from "@/lib/pm";
import { pick, queryText } from "@/lib/validation";
import { FilterForm } from "@/components/client";
import { Icon } from "@/components/icons";
import { LinkButton, Notice, PageHeader } from "@/components/ui";
import { MachineTimeline, PlanCalendar, PlanList } from "./views";

export const metadata: Metadata = { title: "Maintenance Plan" };

const VIEWS = ["machine", "calendar", "list"] as const;
const STATES: PlanState[] = ["overdue", "soon", "issued", "ok"];
const SUM_CLASS: Record<PlanState, string> = { overdue: "border-l-alarm [&_b]:text-alarm", soon: "border-l-mnt [&_b]:text-mnt", issued: "border-l-accent", ok: "border-l-ok" };

export default async function PlanPage({ searchParams }: PageProps<"/plan">) {
  const user = await requirePage("plan");
  const sp = await searchParams;
  const view = pick(sp.view, VIEWS) || "machine";
  const state = pick(sp.state, STATES);
  const q = queryText(sp.q);
  const month = Math.max(-24, Math.min(24, Number.parseInt(typeof sp.month === "string" ? sp.month : "0", 10) || 0));

  const [all, filtered, machines, users] = await Promise.all([listPlans(), listPlans({ q, state }), listMachines(), listUsers()]);
  const count = (s: PlanState) => all.filter((p) => p.state === s).length;
  const href = (over: Record<string, string | number | undefined>) => {
    const params = new URLSearchParams();
    const merged = { view, state, q, month: view === "calendar" ? month : undefined, ...over };
    Object.entries(merged).forEach(([k, v]) => { if (v !== undefined && v !== "" && !(k === "view" && v === "machine") && !(k === "month" && v === 0)) params.set(k, String(v)); });
    const s = params.toString();
    return s ? `/plan?${s}` : "/plan";
  };

  return (
    <>
      <PageHeader title="Maintenance Plan">
        {can(user.role, "plan:write") && <LinkButton href="/plan/new" icon="plus" primary>เพิ่มแผน PM</LinkButton>}
      </PageHeader>
      <Notice code={sp.notice} id={sp.id} />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {STATES.map((s) => (
          <Link key={s} href={href({ state: state === s ? "" : s })} aria-current={state === s ? "true" : undefined}
            className={`flex flex-col rounded-[10px] border border-l-4 border-line bg-surface px-4 py-3 hover:border-line-strong aria-[current]:ring-2 aria-[current]:ring-accent ${SUM_CLASS[s]}`}>
            <b className="num text-2xl leading-tight">{count(s)}</b>
            <span className="text-[13px] text-muted">{PLAN_STATE_LABEL[s]}</span>
          </Link>
        ))}
      </div>

      <section className="panel">
        <div className="panel-head">
          <div className="inline-flex overflow-hidden rounded-lg border border-line-strong" role="group" aria-label="มุมมอง">
            {VIEWS.map((v, i) => (
              <Link key={v} href={href({ view: v, month: undefined })} aria-current={view === v ? "page" : undefined}
                className={`px-3.5 py-1.5 font-medium ${i ? "border-l border-line-strong" : ""} ${view === v ? "bg-accent text-accent-ink" : "bg-surface text-muted hover:text-ink"}`}>
                {v === "machine" ? "รายเครื่อง" : v === "calendar" ? "ปฏิทิน" : "รายการ"}
              </Link>
            ))}
          </div>
          <FilterForm>
            <input type="hidden" name="view" value={view === "machine" ? "" : view} />
            <input type="hidden" name="state" value={state} />
            <label className="relative">
              <span className="sr-only">ค้นหา</span>
              <Icon name="search" className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-faint" />
              <input className="input w-60 pl-8" type="search" name="q" defaultValue={q} placeholder="ค้นหางาน PM หรือเครื่องจักร" maxLength={100} />
            </label>
          </FilterForm>
          {state && <Link href={href({ state: "" })} className="btn btn-sm">ล้างตัวกรอง: {PLAN_STATE_LABEL[state]}</Link>}
        </div>

        {view === "machine" && <MachineTimeline plans={filtered} machines={machines} filtering={!!(state || q)} canAdd={can(user.role, "plan:write")} />}
        {view === "calendar" && <PlanCalendar plans={filtered} monthOffset={month} baseHref={(mo) => href({ month: mo })} />}
        {view === "list" && (
          <PlanList plans={filtered} canIssue={can(user.role, "plan:issue")} canEdit={can(user.role, "plan:write")}
            technicianName={(id) => users.find((u) => u.id === id)?.name ?? "—"} />
        )}
      </section>
    </>
  );
}
