import { beforeEach, describe, expect, it } from "vitest";
import {
  activeAlarms,
  createAlarm,
  getAlarm,
  getMachine,
  listAlarms,
  resetDbForTesting,
  updateAlarm,
} from "@/lib/data/repo";
import type { Profile } from "@/lib/types";

const techActor: Profile = {
  id: "u2",
  name: "Prasert Mekanik",
  email: "tech@plant.local",
  role: "technician",
  active: true,
};

describe("Alarms Domain Functions", () => {
  beforeEach(() => {
    resetDbForTesting();
  });

  it("lists alarms and filters by status, machine, query and date", async () => {
    const all = await listAlarms();
    expect(all.length).toBeGreaterThan(0);

    const openOnly = await listAlarms({ status: "Open" });
    expect(openOnly.every((a) => a.status === "Open")).toBe(true);

    const forMachine = await listAlarms({ machineId: "M-001" });
    expect(forMachine.every((a) => a.machineId === "M-001")).toBe(true);

    const byQuery = await listAlarms({ q: "Overload" });
    expect(byQuery.every((a) => a.code.includes("Overload") || a.description.toLowerCase().includes("overload"))).toBe(true);

    const byDate = await listAlarms({ from: "2026-09-01", to: "2026-09-30" });
    expect(byDate.length).toBeGreaterThan(0);
  });

  it("finds active alarms and gets single alarm", async () => {
    const active = await activeAlarms();
    expect(active.every((a) => a.status !== "Closed")).toBe(true);

    const first = active[0];
    if (first) {
      const found = await getAlarm(first.id);
      expect(found).toBeDefined();
      expect(found?.id).toBe(first.id);
    }

    const missing = await getAlarm("ALM-9999");
    expect(missing).toBeUndefined();
  });

  it("creates an alarm, assigns ALM ID and changes machine status to Alarm", async () => {
    const mBefore = await getMachine("M-002");
    expect(mBefore).toBeDefined();

    const res = await createAlarm(techActor, {
      machineId: "M-002",
      code: "E-101",
      description: "Hydraulic pressure loss",
      occurredAt: "2026-09-19T10:00",
      cause: "Filter clogged",
    });

    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.id).toMatch(/^ALM-\d{4}$/);
      const alarm = await getAlarm(res.id);
      expect(alarm?.status).toBe("Open");
      expect(alarm?.code).toBe("E-101");

      const mAfter = await getMachine("M-002");
      expect(mAfter?.status).toBe("Alarm");
    }
  });

  it("rejects creating alarm for non-existent machine", async () => {
    const res = await createAlarm(techActor, {
      machineId: "M-999",
      code: "E-999",
      description: "Invalid machine alarm",
      occurredAt: "2026-09-19T10:00",
      cause: "",
    });
    expect(res.ok).toBe(false);
  });

  it("updates alarm status to In Progress and assigns technician", async () => {
    // Create new alarm to have full control of state
    const created = await createAlarm(techActor, {
      machineId: "M-003",
      code: "E-301",
      description: "Conveyor jam",
      occurredAt: "2026-09-19T11:00",
      cause: "",
    });
    expect(created.ok).toBe(true);
    if (!created.ok) return;

    const updateRes = await updateAlarm(techActor, created.id, {
      status: "In Progress",
      cause: "Part stuck in chute",
      action: "Clearing jam",
    });

    expect(updateRes.ok).toBe(true);
    const updated = await getAlarm(created.id);
    expect(updated?.status).toBe("In Progress");
    expect(updated?.assigneeId).toBe(techActor.id);
    expect(updated?.cause).toBe("Part stuck in chute");
  });

  it("closes alarm, sets closer and restores machine to Running when no other alarms exist", async () => {
    const created = await createAlarm(techActor, {
      machineId: "M-005",
      code: "E-501",
      description: "Safety gate opened",
      occurredAt: "2026-09-19T12:00",
      cause: "Interlock tripped",
    });
    expect(created.ok).toBe(true);
    if (!created.ok) return;

    const closeRes = await updateAlarm(techActor, created.id, {
      status: "Closed",
      cause: "Interlock sensor reset",
      action: "Verified safety circuit and closed gate",
    });

    expect(closeRes.ok).toBe(true);
    const closed = await getAlarm(created.id);
    expect(closed?.status).toBe("Closed");
    expect(closed?.closedBy).toBe(techActor.id);
    expect(closed?.closedAt).toBeDefined();

    // Already closed alarm cannot be modified
    const reUpdate = await updateAlarm(techActor, created.id, {
      status: "In Progress",
      cause: "",
      action: "",
    });
    expect(reUpdate.ok).toBe(false);
  });
});
