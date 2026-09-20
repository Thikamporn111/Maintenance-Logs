import { describe, expect, it } from "vitest";
import {
  alarmCreateSchema,
  alarmUpdateSchema,
  fieldErrors,
  machineSchema,
  maintenanceSchema,
  pick,
  planSchema,
  roleCreateSchema,
  signupSchema,
  userCreateSchema,
} from "@/lib/validation";
import { addDays, todayStr } from "@/lib/pm";
import { parsePlantDateTime, toPlantInput } from "@/lib/time";

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
  const alarm = { machineId: "M-001", code: "E-201", description: "Spindle overload" };

  it("rejects an alarm time in the future", () => {
    const future = toPlantInput(new Date(Date.now() + 3_600_000).toISOString());
    expect(errorsOf(alarmCreateSchema.safeParse({ ...alarm, occurredAt: future })).occurredAt).toMatch("อนาคต");
  });

  it("accepts the current plant time and rejects non datetime-local input", () => {
    expect(alarmCreateSchema.safeParse({ ...alarm, occurredAt: toPlantInput() }).success).toBe(true);
    expect(errorsOf(alarmCreateSchema.safeParse({ ...alarm, occurredAt: "yesterday" })).occurredAt).toBeDefined();
  });

  it("reads datetime-local values as Thailand time (UTC+7)", () => {
    expect(parsePlantDateTime("2026-09-19T08:00").toISOString()).toBe("2026-09-19T01:00:00.000Z");
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

describe("signupSchema", () => {
  it("validates name, email and password", () => {
    const valid = { name: "Somchai S", email: "somchai@plant.local", password: "password123" };
    expect(signupSchema.safeParse(valid).success).toBe(true);
  });

  it("rejects short passwords and invalid emails", () => {
    const invalid = { name: "S", email: "not-an-email", password: "123" };
    const e = errorsOf(signupSchema.safeParse(invalid));
    expect(e.name).toBeDefined();
    expect(e.email).toBeDefined();
    expect(e.password).toMatch("6 ตัวอักษร");
  });
});

describe("userCreateSchema", () => {
  it("accepts a valid user payload", () => {
    const valid = { name: "Prasert K", email: "prasert@plant.local", role: "technician", password: "password123" };
    expect(userCreateSchema.safeParse(valid).success).toBe(true);
  });

  it("rejects invalid role characters or invalid emails", () => {
    const invalid = { name: "Prasert K", email: "bad-email", role: "TECH!", password: "123" };
    const e = errorsOf(userCreateSchema.safeParse(invalid));
    expect(e.email).toBeDefined();
    expect(e.role).toBeDefined();
    expect(e.password).toBeDefined();
  });
});

describe("roleCreateSchema", () => {
  it("accepts a valid role payload with supported pages and permissions", () => {
    const valid = {
      id: "operator",
      label: "Line Operator",
      description: "Operates production line",
      pages: ["dashboard", "machines", "alarms"],
      permissions: ["alarm:create"],
    };
    expect(roleCreateSchema.safeParse(valid).success).toBe(true);
  });

  it("rejects invalid page names, invalid permissions, or malformed role id", () => {
    const invalid = {
      id: "Operator #1",
      label: "O",
      pages: ["nonexistent_page"],
      permissions: ["hacker:permission"],
    };
    const e = errorsOf(roleCreateSchema.safeParse(invalid));
    expect(e.id).toBeDefined();
    expect(e.label).toBeDefined();
    expect(e.pages).toBeDefined();
    expect(e.permissions).toBeDefined();
  });
});


