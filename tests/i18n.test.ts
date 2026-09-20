import { describe, expect, it } from "vitest";
import { DICTIONARY, getDictionary, type Locale } from "@/lib/i18n";

describe("i18n dictionary", () => {
  it("defaults to thai dictionary when no locale or invalid locale is provided", () => {
    const defaultDict = getDictionary();
    expect(defaultDict.brand).toBe("MTM Machine-Maintenance");
    expect(defaultDict.nav.dashboard).toBe("แดชบอร์ด");

    const fallbackDict = getDictionary("unknown" as Locale);
    expect(fallbackDict.nav.dashboard).toBe("แดชบอร์ด");
  });

  it("returns english dictionary when locale is 'en'", () => {
    const enDict = getDictionary("en");
    expect(enDict.brand).toBe("MTM Machine-Maintenance");
    expect(enDict.nav.dashboard).toBe("Dashboard");
    expect(enDict.nav.machines).toBe("Machines");
    expect(enDict.nav.alarms).toBe("Alarms");
    expect(enDict.nav.maintenance).toBe("Maintenance");
    expect(enDict.nav.plan).toBe("PM Plan");
    expect(enDict.nav.users).toBe("Users");
    expect(enDict.nav.audit).toBe("Audit Log");
    expect(enDict.roles.admin).toBe("Admin");
    expect(enDict.roles.technician).toBe("Technician");
    expect(enDict.roles.viewer).toBe("Viewer");
  });

  it("has matching keys between thai and english dictionaries", () => {
    const thKeys = Object.keys(DICTIONARY.th).sort();
    const enKeys = Object.keys(DICTIONARY.en).sort();
    expect(thKeys).toEqual(enKeys);

    // Navigation keys
    expect(Object.keys(DICTIONARY.th.nav).sort()).toEqual(Object.keys(DICTIONARY.en.nav).sort());
    expect(Object.keys(DICTIONARY.th.navShort).sort()).toEqual(Object.keys(DICTIONARY.en.navShort).sort());

    // Roles
    expect(Object.keys(DICTIONARY.th.roles).sort()).toEqual(Object.keys(DICTIONARY.en.roles).sort());

    // Statuses
    expect(Object.keys(DICTIONARY.th.status).sort()).toEqual(Object.keys(DICTIONARY.en.status).sort());

    // Common
    expect(Object.keys(DICTIONARY.th.common).sort()).toEqual(Object.keys(DICTIONARY.en.common).sort());

    // Dashboard
    expect(Object.keys(DICTIONARY.th.dashboard).sort()).toEqual(Object.keys(DICTIONARY.en.dashboard).sort());

    // Machines
    expect(Object.keys(DICTIONARY.th.machines).sort()).toEqual(Object.keys(DICTIONARY.en.machines).sort());

    // Alarms
    expect(Object.keys(DICTIONARY.th.alarms).sort()).toEqual(Object.keys(DICTIONARY.en.alarms).sort());

    // Maintenance
    expect(Object.keys(DICTIONARY.th.maintenance).sort()).toEqual(Object.keys(DICTIONARY.en.maintenance).sort());

    // Plan
    expect(Object.keys(DICTIONARY.th.plan).sort()).toEqual(Object.keys(DICTIONARY.en.plan).sort());

    // Users
    expect(Object.keys(DICTIONARY.th.users).sort()).toEqual(Object.keys(DICTIONARY.en.users).sort());

    // Login
    expect(Object.keys(DICTIONARY.th.login).sort()).toEqual(Object.keys(DICTIONARY.en.login).sort());

    // Errors
    expect(Object.keys(DICTIONARY.th.errors).sort()).toEqual(Object.keys(DICTIONARY.en.errors).sort());
  });

  it("translates machine and job statuses accurately", () => {
    const th = getDictionary("th");
    const en = getDictionary("en");

    expect(th.status.Running).toBe("กำลังทำงาน");
    expect(en.status.Running).toBe("Running");

    expect(th.status.Open).toBe("รอซ่อม / รอดำเนินการ");
    expect(en.status.Open).toBe("Open");

    expect(th.status.Done).toBe("เสร็จสิ้น");
    expect(en.status.Done).toBe("Done");
  });
});
