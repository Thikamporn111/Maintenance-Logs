import { beforeEach, describe, expect, it } from "vitest";
import {
  createMachine,
  deleteMachine,
  getMachine,
  listMachines,
  machineReferences,
  resetDbForTesting,
  updateMachine,
} from "@/lib/data/repo";
import type { Profile } from "@/lib/types";

const adminActor: Profile = {
  id: "u1",
  name: "Tanawat Chitratta",
  email: "admin@plant.local",
  role: "admin",
  active: true,
};

describe("Machines Domain Functions", () => {
  beforeEach(() => {
    resetDbForTesting();
  });

  it("lists all machines and respects filter criteria", async () => {
    const all = await listMachines();
    expect(all.length).toBeGreaterThanOrEqual(10);

    const byQuery = await listMachines({ q: "CNC" });
    expect(byQuery.length).toBeGreaterThan(0);
    expect(byQuery.every((m) => m.name.includes("CNC") || m.id.includes("CNC"))).toBe(true);

    const byStatus = await listMachines({ status: "Running" });
    expect(byStatus.every((m) => m.status === "Running")).toBe(true);

    const byType = await listMachines({ type: "Robot" });
    expect(byType.every((m) => m.type === "Robot")).toBe(true);
  });

  it("fetches a single machine by ID", async () => {
    const m = await getMachine("M-001");
    expect(m).toBeDefined();
    expect(m?.id).toBe("M-001");

    const missing = await getMachine("M-999");
    expect(missing).toBeUndefined();
  });

  it("creates a new machine and rejects duplicates", async () => {
    const res = await createMachine(adminActor, {
      id: "M-099",
      name: "New Test Press Machine",
      type: "Press",
      location: "Line A",
      status: "Running",
    });
    expect(res.ok).toBe(true);

    const created = await getMachine("M-099");
    expect(created?.name).toBe("New Test Press Machine");

    // Re-creating with same ID must fail
    const dupRes = await createMachine(adminActor, {
      id: "M-099",
      name: "Another Press Machine",
      type: "Press",
      location: "Line B",
      status: "Running",
    });
    expect(dupRes.ok).toBe(false);
    if (!dupRes.ok) {
      expect(dupRes.errors.id).toBeDefined();
    }
  });

  it("updates an existing machine", async () => {
    const res = await updateMachine(adminActor, "M-001", {
      name: "CNC Milling 5-Axis Updated",
      type: "CNC",
      location: "Line B",
      status: "Stop",
    });
    expect(res.ok).toBe(true);

    const updated = await getMachine("M-001");
    expect(updated?.name).toBe("CNC Milling 5-Axis Updated");
    expect(updated?.location).toBe("Line B");
    expect(updated?.status).toBe("Stop");
  });

  it("checks references and prevents deleting machines in use", async () => {
    const refs = await machineReferences("M-001");
    expect(refs.alarms + refs.maintenance + refs.plans).toBeGreaterThan(0);

    const deleteRes = await deleteMachine(adminActor, "M-001");
    expect(deleteRes.ok).toBe(false);
    if (!deleteRes.ok) {
      expect(deleteRes.errors.form).toContain("อ้างอิง");
    }

    // Creating a clean machine with no references can be deleted
    await createMachine(adminActor, {
      id: "M-088",
      name: "Temporary Conveyor",
      type: "Conveyor",
      location: "Line C",
      status: "Running",
    });
    const cleanRefs = await machineReferences("M-088");
    expect(cleanRefs.alarms + cleanRefs.maintenance + cleanRefs.plans).toBe(0);

    const cleanDelete = await deleteMachine(adminActor, "M-088");
    expect(cleanDelete.ok).toBe(true);
    expect(await getMachine("M-088")).toBeUndefined();
  });
});
