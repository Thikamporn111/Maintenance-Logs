import { beforeEach, describe, expect, it } from "vitest";
import { createMachine, listAudit, resetDbForTesting } from "@/lib/data/repo";
import type { Profile } from "@/lib/types";

const adminActor: Profile = {
  id: "u1",
  name: "Tanawat Chitratta",
  email: "admin@plant.local",
  role: "admin",
  active: true,
};

describe("Audit Log Functions", () => {
  beforeEach(() => {
    resetDbForTesting();
  });

  it("retrieves audit log records and respects limit", async () => {
    const logs = await listAudit(5);
    expect(logs.length).toBeLessThanOrEqual(5);
    logs.forEach((entry) => {
      expect(entry.at).toBeDefined();
      expect(entry.userId).toBeDefined();
      expect(entry.text).toBeDefined();
    });
  });

  it("appends audit entry when an action is executed", async () => {
    const logsBefore = await listAudit(100);
    const countBefore = logsBefore.length;

    await createMachine(adminActor, {
      id: "M-077",
      name: "Audit Test Machine",
      type: "CNC",
      location: "Line A",
      status: "Running",
    });

    const logsAfter = await listAudit(100);
    expect(logsAfter.length).toBe(countBefore + 1);
    expect(logsAfter[0].userId).toBe(adminActor.id);
    expect(logsAfter[0].text).toContain("M-077");
  });
});
