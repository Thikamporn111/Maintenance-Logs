// Date helpers and state rules for preventive maintenance (PM) plans.
// Plan dates are calendar dates (YYYY-MM-DD) in the plant's local time.
import type { MaintenanceRecord, PmPlan } from "./types";
import { plantDate } from "./time";

export type PlanState = "overdue" | "soon" | "issued" | "ok";

export const PLAN_STATE_LABEL: Record<PlanState, string> = {
  overdue: "เกินกำหนด",
  soon: "ครบกำหนดใน 7 วัน",
  issued: "ออกใบงานแล้ว",
  ok: "ตามแผน",
};

export const PLAN_STATE_RANK: Record<PlanState, number> = { overdue: 0, soon: 1, issued: 2, ok: 3 };

const pad = (n: number) => String(n).padStart(2, "0");

export function toDateStr(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function parseDateStr(s: string): Date {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d);
}

/** Today's date at the plant (UTC+7), regardless of the server's time zone. */
export function todayStr(now: Date = new Date()): string {
  return plantDate(now);
}

export function addDays(s: string, n: number): string {
  const d = parseDateStr(s);
  d.setDate(d.getDate() + n);
  return toDateStr(d);
}

export function daysBetween(a: string, b: string): number {
  return Math.round((parseDateStr(b).getTime() - parseDateStr(a).getTime()) / 864e5);
}

/** Monday of the week containing `s`. */
export function weekStart(s: string): string {
  const d = parseDateStr(s);
  return addDays(s, -((d.getDay() + 6) % 7));
}

export function isoWeek(s: string): number {
  const d = parseDateStr(s);
  d.setDate(d.getDate() + 3 - ((d.getDay() + 6) % 7));
  const w1 = new Date(d.getFullYear(), 0, 4);
  return 1 + Math.round(((d.getTime() - w1.getTime()) / 864e5 - 3 + ((w1.getDay() + 6) % 7)) / 7);
}

/** The open work order issued from this plan, if any. */
export function openWorkOrder(plan: PmPlan, records: MaintenanceRecord[]): MaintenanceRecord | undefined {
  return records.find((r) => r.planId === plan.id && r.status !== "Done");
}

export function planState(plan: PmPlan, records: MaintenanceRecord[], today: string = todayStr()): PlanState {
  if (openWorkOrder(plan, records)) return "issued";
  const n = daysBetween(today, plan.nextDue);
  if (n < 0) return "overdue";
  return n <= 7 ? "soon" : "ok";
}

export function dueText(nextDue: string, today: string = todayStr(), locale: string = "th"): string {
  const n = daysBetween(today, nextDue);
  if (locale === "en") {
    if (n < 0) return `${-n} day(s) overdue`;
    if (n === 0) return "Today";
    return `In ${n} day(s)`;
  }
  if (n < 0) return `เกิน ${-n} วัน`;
  if (n === 0) return "วันนี้";
  return `อีก ${n} วัน`;
}

/** Due dates of a plan from its next due date up to `end`, capped to avoid runaway loops. */
export function occurrences(plan: PmPlan, end: string, max = 100): string[] {
  const out: string[] = [];
  for (let d = plan.nextDue, i = 0; d <= end && i < max; d = addDays(d, plan.intervalDays), i++) out.push(d);
  return out;
}

/** Plan after its work order is completed on `doneOn`. */
export function advancePlan(plan: PmPlan, doneOn: string): PmPlan {
  return { ...plan, lastDone: doneOn, nextDue: addDays(doneOn, plan.intervalDays) };
}

export function freqLabel(days: number, locale: string = "th"): string {
  if (locale === "en") {
    const labelsEn: Record<number, string> = {
      7: "Every week (7 days)",
      14: "Every 2 weeks (14 days)",
      30: "Every month (30 days)",
      90: "Every quarter (90 days)",
      180: "Every 6 months (180 days)",
      365: "Every year (365 days)",
    };
    return labelsEn[days] ?? `Every ${days} days`;
  }
  const labels: Record<number, string> = {
    7: "ทุกสัปดาห์ (7 วัน)",
    14: "ทุก 2 สัปดาห์ (14 วัน)",
    30: "ทุกเดือน (30 วัน)",
    90: "ทุกไตรมาส (90 วัน)",
    180: "ทุก 6 เดือน (180 วัน)",
    365: "ทุกปี (365 วัน)",
  };
  return labels[days] ?? `ทุก ${days} วัน`;
}
