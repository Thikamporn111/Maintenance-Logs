import { describe, expect, it } from "vitest";
import { addDays, advancePlan, daysBetween, dueText, occurrences, planState, weekStart } from "@/lib/pm";
import { can, canView } from "@/lib/permissions";
import type { MaintenanceRecord, PmPlan } from "@/lib/types";

const TODAY = "2026-09-19";
const plan = (over: Partial<PmPlan> = {}): PmPlan => ({
  id: "PM-001", machineId: "M-001", technicianId: "u2", task: "Monthly PM", checklist: "",
  intervalDays: 30, lastDone: "2026-08-20", nextDue: "2026-09-25", active: true, ...over,
});
const wo = (over: Partial<MaintenanceRecord> = {}): MaintenanceRecord => ({
  id: "MNT-0001", machineId: "M-001", technicianId: "u2", type: "Preventive", problem: "PM", action: "",
  date: "2026-09-19T08:00:00.000Z", status: "Open", alarmId: null, planId: "PM-001", ...over,
});

describe("PM date helpers", () => {
  it("adds days across month boundaries", () => {
    expect(addDays("2026-09-28", 5)).toBe("2026-10-03");
    expect(daysBetween("2026-09-19", "2026-10-19")).toBe(30);
  });

  it("finds Monday of the week", () => {
    expect(weekStart("2026-09-19")).toBe("2026-09-14"); // Saturday -> Monday
  });

  it("describes how far away a due date is", () => {
    expect(dueText("2026-09-16", TODAY)).toBe("เกิน 3 วัน");
    expect(dueText(TODAY, TODAY)).toBe("วันนี้");
    expect(dueText("2026-09-22", TODAY)).toBe("อีก 3 วัน");
  });
});

describe("planState", () => {
  it("is overdue, soon or ok by due date", () => {
    expect(planState(plan({ nextDue: "2026-09-18" }), [], TODAY)).toBe("overdue");
    expect(planState(plan({ nextDue: "2026-09-26" }), [], TODAY)).toBe("soon");
    expect(planState(plan({ nextDue: "2026-10-10" }), [], TODAY)).toBe("ok");
  });

  it("is issued while a work order from the plan is still open", () => {
    expect(planState(plan({ nextDue: "2026-09-18" }), [wo()], TODAY)).toBe("issued");
    expect(planState(plan({ nextDue: "2026-09-18" }), [wo({ status: "Done" })], TODAY)).toBe("overdue");
  });

  it("projects recurring due dates", () => {
    expect(occurrences(plan({ intervalDays: 7, nextDue: "2026-09-20" }), "2026-10-05")).toEqual(["2026-09-20", "2026-09-27", "2026-10-04"]);
  });

  it("moves the next due date forward after completion", () => {
    expect(advancePlan(plan(), TODAY)).toMatchObject({ lastDone: TODAY, nextDue: "2026-10-19" });
  });
});

describe("permissions", () => {
  it("lets only admins manage machines and users", () => {
    expect(can("admin", "machine:write")).toBe(true);
    expect(can("technician", "machine:write")).toBe(false);
    expect(can("technician", "users:manage")).toBe(false);
  });

  it("lets technicians work alarms, maintenance and issue PM work orders", () => {
    expect(can("technician", "alarm:update")).toBe(true);
    expect(can("technician", "maintenance:write")).toBe(true);
    expect(can("technician", "plan:issue")).toBe(true);
    expect(can("technician", "plan:write")).toBe(false);
  });

  it("limits viewers to the dashboard (REQ-SEC-01)", () => {
    expect(canView("viewer", "dashboard")).toBe(true);
    expect(canView("viewer", "machines")).toBe(false);
    expect(canView("technician", "users")).toBe(false);
  });
});
