import { beforeEach, describe, expect, it } from "vitest";
import {
  createPlan,
  deactivatePlan,
  getPlan,
  listPlans,
  resetDbForTesting,
  updatePlan,
} from "@/lib/data/repo";
import { addDays, todayStr } from "@/lib/pm";
import type { Profile } from "@/lib/types";

const adminActor: Profile = {
  id: "u1",
  name: "Tanawat Chitratta",
  email: "admin@plant.local",
  role: "admin",
  active: true,
};

describe("Plan Domain Functions", () => {
  beforeEach(() => {
    resetDbForTesting();
  });

  it("lists active plans with state evaluation and supports filtering", async () => {
    const all = await listPlans();
    expect(all.length).toBeGreaterThan(0);
    expect(all.every((p) => p.active)).toBe(true);
    expect(all.every((p) => ["overdue", "soon", "issued", "ok"].includes(p.state))).toBe(true);

    const filtered = await listPlans({ q: "CNC" });
    expect(filtered.length).toBeGreaterThan(0);

    const overduePlans = await listPlans({ state: "overdue" });
    expect(overduePlans.every((p) => p.state === "overdue")).toBe(true);
  });

  it("retrieves a single PM plan by ID", async () => {
    const p = await getPlan("PM-001");
    expect(p).toBeDefined();
    expect(p?.id).toBe("PM-001");

    const missing = await getPlan("PM-999");
    expect(missing).toBeUndefined();
  });

  it("creates a new PM plan, assigns PM ID and persists", async () => {
    const today = todayStr();
    const nextDue = addDays(today, 30);

    const res = await createPlan(adminActor, {
      machineId: "M-002",
      technicianId: "u2",
      task: "Bi-monthly Hydraulic Fluid Change",
      checklist: "Drain fluid, replace filter, refill 20L",
      intervalDays: 30,
      nextDue,
      lastDone: today,
    });

    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.id).toMatch(/^PM-\d{3}$/);
      const created = await getPlan(res.id);
      expect(created?.task).toBe("Bi-monthly Hydraulic Fluid Change");
      expect(created?.intervalDays).toBe(30);
      expect(created?.active).toBe(true);
    }
  });

  it("rejects creating plan for non-existent machine or technician", async () => {
    const badMachine = await createPlan(adminActor, {
      machineId: "M-999",
      technicianId: "u2",
      task: "Test",
      checklist: "",
      intervalDays: 30,
      nextDue: "2026-10-01",
      lastDone: "",
    });
    expect(badMachine.ok).toBe(false);

    const badTech = await createPlan(adminActor, {
      machineId: "M-001",
      technicianId: "u999",
      task: "Test",
      checklist: "",
      intervalDays: 30,
      nextDue: "2026-10-01",
      lastDone: "",
    });
    expect(badTech.ok).toBe(false);
  });

  it("updates an existing plan", async () => {
    const res = await updatePlan(adminActor, "PM-001", {
      machineId: "M-001",
      technicianId: "u2",
      task: "CNC 5-Axis Monthly Service Rev B",
      checklist: "Check spindles, verify coolant concentration",
      intervalDays: 30,
      nextDue: "2026-10-15",
      lastDone: "2026-09-15",
    });

    expect(res.ok).toBe(true);
    const updated = await getPlan("PM-001");
    expect(updated?.task).toBe("CNC 5-Axis Monthly Service Rev B");
    expect(updated?.nextDue).toBe("2026-10-15");
  });

  it("deactivates a plan and excludes it from active list", async () => {
    const res = await deactivatePlan(adminActor, "PM-001");
    expect(res.ok).toBe(true);

    const planInDb = await getPlan("PM-001");
    expect(planInDb?.active).toBe(false);

    const activeList = await listPlans();
    expect(activeList.some((p) => p.id === "PM-001")).toBe(false);
  });
});
