import { describe, expect, it } from "vitest";
import {
  alarmCreateSchema, alarmUpdateSchema, fieldErrors, machineSchema, maintenanceSchema, pick, planSchema,
} from "@/lib/validation";
import { addDays, todayStr } from "@/lib/pm";

const errorsOf = (r: { success: boolean; error?: import("zod").ZodError }) => (r.success ? {} : fieldErrors(r.error!));

describe("machineSchema", () => {
  const valid = { id: "m-011", name: "CNC Lathe #3", type: "CNC", location: "Line A", status: "Running" };

  it("accepts a valid machine and normalises the ID to upper case", () => {
    const r = machineSchema.safeParse(valid);
    expect(r.success).toBe(true);
    expect(r.data?.id).toBe("M-011");
  });

  it("rejects an ID that is not M-000", () => {
    expect(errorsOf(machineSchema.safeParse({ ...valid, id: "MC-1" })).id).toMatch("M-000");
  });

  it("rejects empty required fields", () => {
    const e = errorsOf(machineSchema.safeParse({ id: "", name: "", type: "", location: "", status: "" }));
    expect(Object.keys(e).sort()).toEqual(["id", "location", "name", "status", "type"]);
  });

  it("rejects a status outside the allowed list", () => {
    expect(errorsOf(machineSchema.safeParse({ ...valid, status: "Broken" })).status).toBeDefined();
  });
});

describe("alarm rules", () => {
  it("rejects an alarm time in the future", () => {
    const future = new Date(Date.now() + 3_600_000).toISOString();
    const r = alarmCreateSchema.safeParse({ machineId: "M-001", code: "E-201", description: "Spindle overload", occurredAt: future });
    expect(errorsOf(r).occurredAt).toMatch("อนาคต");
  });

  it("requires cause and action before closing (REQ-ALM-02)", () => {
    const e = errorsOf(alarmUpdateSchema.safeParse({ status: "Closed", cause: "", action: "" }));
    expect(e.cause).toBeDefined();
    expect(e.action).toBeDefined();
  });

  it("allows In Progress without an action", () => {
    expect(alarmUpdateSchema.safeParse({ status: "In Progress" }).success).toBe(true);
  });
});

describe("maintenance rules", () => {
  const base = { machineId: "M-001", technicianId: "u2", type: "Corrective", date: "2026-09-19T08:00", status: "Open", problem: "Belt slip" };

  it("requires an action when the job is Done", () => {
    expect(errorsOf(maintenanceSchema.safeParse({ ...base, status: "Done" })).action).toBeDefined();
  });

  it("requires the awaited part when Waiting Part", () => {
    expect(errorsOf(maintenanceSchema.safeParse({ ...base, status: "Waiting Part" })).action).toMatch("อะไหล่");
  });

  it("rejects a malformed alarm reference", () => {
    expect(errorsOf(maintenanceSchema.safeParse({ ...base, alarmId: "1 OR 1=1" })).alarmId).toBeDefined();
  });
});

describe("planSchema", () => {
  const base = { machineId: "M-006", technicianId: "u3", task: "Monthly PM", intervalDays: "30", nextDue: addDays(todayStr(), 5) };

  it("accepts only the supported intervals", () => {
    expect(planSchema.safeParse(base).success).toBe(true);
    expect(errorsOf(planSchema.safeParse({ ...base, intervalDays: "3" })).intervalDays).toBeDefined();
  });

  it("rejects a last-done date in the future", () => {
    expect(errorsOf(planSchema.safeParse({ ...base, lastDone: addDays(todayStr(), 1) })).lastDone).toBeDefined();
  });

  it("requires the next due date to be after the last done date", () => {
    const today = todayStr();
    expect(errorsOf(planSchema.safeParse({ ...base, lastDone: today, nextDue: today })).nextDue).toBeDefined();
  });
});

describe("pick", () => {
  it("drops query values that are not in the allow-list", () => {
    expect(pick("Open", ["Open", "Closed"])).toBe("Open");
    expect(pick("<script>", ["Open", "Closed"])).toBe("");
  });
});
