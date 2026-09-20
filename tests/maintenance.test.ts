import { beforeEach, describe, expect, it } from "vitest";
import {
  createMaintenance,
  getMachine,
  getMaintenance,
  getPlan,
  listMaintenance,
  resetDbForTesting,
  updateMaintenance,
} from "@/lib/data/repo";
import type { Profile } from "@/lib/types";

const techActor: Profile = {
  id: "u2",
  name: "Prasert Mekanik",
  email: "tech@plant.local",
  role: "technician",
  active: true,
};

describe("Maintenance Domain Functions", () => {
  beforeEach(() => {
    resetDbForTesting();
  });

  it("lists maintenance jobs and applies filter conditions", async () => {
    const all = await listMaintenance();
    expect(all.length).toBeGreaterThan(0);

    const openJobs = await listMaintenance({ status: "Open" });
    expect(openJobs.every((j) => j.status === "Open")).toBe(true);

    const preventive = await listMaintenance({ type: "Preventive" });
    expect(preventive.every((j) => j.type === "Preventive")).toBe(true);

    const forTech = await listMaintenance({ technicianId: "u2" });
    expect(forTech.every((j) => j.technicianId === "u2")).toBe(true);

    const searched = await listMaintenance({ q: "M-001" });
    expect(searched.length).toBeGreaterThan(0);
  });

  it("retrieves a single maintenance job by ID", async () => {
    const job = await getMaintenance("MNT-0312");
    expect(job).toBeDefined();
    expect(job?.id).toBe("MNT-0312");

    const missing = await getMaintenance("MNT-9999");
    expect(missing).toBeUndefined();
  });

  it("creates a maintenance job and switches machine status to Maintenance when In Progress", async () => {
    const res = await createMaintenance(techActor, {
      machineId: "M-001",
      technicianId: "u2",
      type: "Corrective",
      date: "2026-09-19T09:00",
      status: "In Progress",
      problem: "Spindle bearing vibration check",
      action: "Diagnosing bearing wear",
      alarmId: "",
      planId: "",
    });

    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.id).toMatch(/^MNT-\d{4}$/);
      const created = await getMaintenance(res.id);
      expect(created?.problem).toBe("Spindle bearing vibration check");

      const machine = await getMachine("M-001");
      expect(machine?.status).toBe("Maintenance");
    }
  });

  it("rejects creating maintenance job with non-existent machine or technician", async () => {
    const badMachine = await createMaintenance(techActor, {
      machineId: "M-999",
      technicianId: "u2",
      type: "Corrective",
      date: "2026-09-19T09:00",
      status: "Open",
      problem: "Test",
      action: "",
      alarmId: "",
      planId: "",
    });
    expect(badMachine.ok).toBe(false);

    const badTech = await createMaintenance(techActor, {
      machineId: "M-001",
      technicianId: "u999",
      type: "Corrective",
      date: "2026-09-19T09:00",
      status: "Open",
      problem: "Test",
      action: "",
      alarmId: "",
      planId: "",
    });
    expect(badTech.ok).toBe(false);
  });

  it("updates maintenance job and advances linked PM plan when completed", async () => {
    // 1. Create PM maintenance job linked to PM-001 (which belongs to M-006)
    const planBefore = await getPlan("PM-001");
    expect(planBefore).toBeDefined();
    const oldDue = planBefore?.nextDue;

    const res = await createMaintenance(techActor, {
      machineId: "M-006",
      technicianId: "u3",
      type: "Preventive",
      date: "2026-09-19T08:00",
      status: "In Progress",
      problem: "Execute PM-001 checklist",
      action: "Inspecting hydraulic system",
      alarmId: "",
      planId: "PM-001",
    });
    expect(res.ok).toBe(true);
    if (!res.ok) return;

    // 2. Complete the maintenance job
    const updateRes = await updateMaintenance(techActor, res.id, {
      machineId: "M-006",
      technicianId: "u3",
      type: "Preventive",
      date: "2026-09-19T08:00",
      status: "Done",
      problem: "Execute PM-001 checklist",
      action: "Completed lubrication, replaced filters, tested OK",
      alarmId: "",
      planId: "PM-001",
    });
    expect(updateRes.ok).toBe(true);

    // 3. Verify that the PM plan's nextDue was advanced
    const planAfter = await getPlan("PM-001");
    expect(planAfter?.lastDone).toBeDefined();
    expect(planAfter?.nextDue).not.toBe(oldDue);
  });
});
