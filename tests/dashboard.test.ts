import { beforeEach, describe, expect, it } from "vitest";
import { dashboardStats, resetDbForTesting } from "@/lib/data/repo";

describe("Dashboard Domain Functions", () => {
  beforeEach(() => {
    resetDbForTesting();
  });

  it("calculates comprehensive dashboard KPI metrics correctly", async () => {
    const stats = await dashboardStats();

    expect(stats.totalMachines).toBeGreaterThanOrEqual(10);
    expect(stats.byStatus).toBeDefined();
    expect(typeof stats.byStatus.Running).toBe("number");
    expect(typeof stats.byStatus.Stop).toBe("number");
    expect(typeof stats.byStatus.Alarm).toBe("number");
    expect(typeof stats.byStatus.Maintenance).toBe("number");

    expect(Array.isArray(stats.activeAlarms)).toBe(true);
    expect(typeof stats.activeAlarmCount).toBe("number");
    expect(typeof stats.openMaintenance).toBe("number");
    expect(typeof stats.alarmsWeek).toBe("number");
    expect(typeof stats.alarmsToday).toBe("number");
    expect(typeof stats.mttrMinutes).toBe("number");

    expect(stats.perDay).toHaveLength(7);
    stats.perDay.forEach((day) => {
      expect(day.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(typeof day.count).toBe("number");
    });

    expect(Array.isArray(stats.topMachines)).toBe(true);
    expect(typeof stats.pmOverdue).toBe("number");
    expect(typeof stats.pmSoon).toBe("number");
  });
});
