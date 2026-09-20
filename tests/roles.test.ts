import { beforeEach, describe, expect, it } from "vitest";
import {
  createRole,
  createUser,
  deleteRole,
  getRole,
  getUser,
  listRoles,
  resetDbForTesting,
  setUserActive,
  setUserRole,
  updateRole,
  updateUser,
} from "@/lib/data/repo";
import { can, canView, pagesFor } from "@/lib/permissions";
import type { Profile } from "@/lib/types";

const adminActor: Profile = {
  id: "u1",
  name: "Tanawat Chitratta",
  email: "admin@plant.local",
  role: "admin",
  active: true,
};

describe("Roles & Dynamic RBAC Management", () => {
  beforeEach(() => {
    resetDbForTesting();
  });

  it("lists system default roles (admin, technician, viewer)", async () => {
    const roles = await listRoles();
    expect(roles.length).toBeGreaterThanOrEqual(3);

    const admin = roles.find((r) => r.id === "admin");
    expect(admin).toBeDefined();
    expect(admin?.isSystem).toBe(true);
    expect(admin?.permissions).toContain("users:manage");
    expect(admin?.pages).toContain("users");

    const tech = roles.find((r) => r.id === "technician");
    expect(tech).toBeDefined();
    expect(tech?.permissions).toContain("alarm:create");
    expect(tech?.permissions).not.toContain("users:manage");

    const viewer = roles.find((r) => r.id === "viewer");
    expect(viewer).toBeDefined();
    expect(viewer?.pages).toEqual(["dashboard"]);
    expect(viewer?.permissions).toEqual([]);
  });

  it("creates a new custom role with custom pages and permissions", async () => {
    const res = await createRole(adminActor, {
      id: "supervisor",
      label: "Supervisor (หัวหน้าช่าง)",
      description: "หัวหน้าช่าง ตรวจสอบและอนุมัติงานซ่อม",
      pages: ["dashboard", "machines", "alarms", "maintenance", "plan", "audit"],
      permissions: [
        "machine:write",
        "alarm:create",
        "alarm:update",
        "maintenance:write",
        "plan:write",
        "plan:issue",
        "audit:read",
      ],
    });

    expect(res.ok).toBe(true);
    if (res.ok) {
      const created = await getRole("supervisor");
      expect(created).toBeDefined();
      expect(created?.label).toBe("Supervisor (หัวหน้าช่าง)");
      expect(created?.isSystem).toBe(false);
      expect(created?.pages).toContain("audit");
      expect(created?.permissions).toContain("plan:write");
      expect(created?.permissions).not.toContain("users:manage");
    }

    // Duplicate ID must be rejected
    const dup = await createRole(adminActor, {
      id: "supervisor",
      label: "Another Supervisor",
      description: "Duplicate",
      pages: ["dashboard"],
      permissions: [],
    });
    expect(dup.ok).toBe(false);
  });

  it("updates permissions of an existing role", async () => {
    // Technician initially doesn't have audit:read or audit page
    const techBefore = await getRole("technician");
    expect(techBefore?.permissions).not.toContain("audit:read");

    const updateRes = await updateRole(adminActor, "technician", {
      label: "Senior Technician",
      description: "ช่างเทคนิคอาวุโส",
      pages: ["dashboard", "machines", "alarms", "maintenance", "plan", "audit"],
      permissions: ["alarm:create", "alarm:update", "maintenance:write", "plan:issue", "audit:read"],
    });

    expect(updateRes.ok).toBe(true);

    const techAfter = await getRole("technician");
    expect(techAfter?.label).toBe("Senior Technician");
    expect(techAfter?.pages).toContain("audit");
    expect(techAfter?.permissions).toContain("audit:read");
  });

  it("protects Admin role from losing users:manage permission and users page access", async () => {
    // Attempt to strip users:manage and users page from admin
    const res = await updateRole(adminActor, "admin", {
      label: "Admin",
      description: "Admin attempting to remove manage users",
      pages: ["dashboard"],
      permissions: ["machine:write"],
    });

    expect(res.ok).toBe(true);
    const admin = await getRole("admin");
    // users:manage and users page must be automatically preserved
    expect(admin?.permissions).toContain("users:manage");
    expect(admin?.pages).toContain("users");
  });

  it("allows assigning custom role to a user and validates dynamic permissions", async () => {
    await createRole(adminActor, {
      id: "operator",
      label: "Operator",
      description: "ผู้ควบคุมเครื่องจักร แจ้งเตือน Alarm ได้เท่านั้น",
      pages: ["dashboard", "machines", "alarms"],
      permissions: ["alarm:create"],
    });

    // Create a new user with this role
    const userRes = await createUser(adminActor, {
      name: "Operator Somchai",
      email: "operator@plant.local",
      role: "operator",
      password: "password123",
    });

    expect(userRes.ok).toBe(true);
    if (userRes.ok) {
      const user = await getUser(userRes.id);
      expect(user?.role).toBe("operator");

      const allRoles = await listRoles();
      expect(can(user!.role, "alarm:create", allRoles)).toBe(true);
      expect(can(user!.role, "alarm:update", allRoles)).toBe(false);
      expect(can(user!.role, "users:manage", allRoles)).toBe(false);

      expect(canView(user!.role, "alarms", allRoles)).toBe(true);
      expect(canView(user!.role, "users", allRoles)).toBe(false);
      expect(pagesFor(user!.role, allRoles)).toEqual(["dashboard", "machines", "alarms"]);
    }
  });

  it("prevents deleting custom role while active users are assigned to it", async () => {
    await createRole(adminActor, {
      id: "quality",
      label: "Quality Control",
      description: "QC Inspector",
      pages: ["dashboard", "machines"],
      permissions: [],
    });

    // Assign to u2
    await updateUser(adminActor, "u2", {
      name: "QC User",
      email: "tech1@plant.local",
      role: "quality",
      active: true,
    });

    // Attempt to delete role 'quality'
    const delRes = await deleteRole(adminActor, "quality");
    expect(delRes.ok).toBe(false);
    if (!delRes.ok) {
      expect(delRes.errors.form).toContain("มีผู้ใช้งาน");
    }

    // Role still exists
    expect(await getRole("quality")).toBeDefined();

    // Reassign u2 back to technician
    await updateUser(adminActor, "u2", {
      name: "Tech User",
      email: "tech1@plant.local",
      role: "technician",
      active: true,
    });

    // Now deletion should succeed
    const delRes2 = await deleteRole(adminActor, "quality");
    expect(delRes2.ok).toBe(true);
    expect(await getRole("quality")).toBeUndefined();
  });

  it("prevents deleting system default roles (admin, technician, viewer)", async () => {
    const delAdmin = await deleteRole(adminActor, "admin");
    expect(delAdmin.ok).toBe(false);

    const delTech = await deleteRole(adminActor, "technician");
    expect(delTech.ok).toBe(false);

    const delViewer = await deleteRole(adminActor, "viewer");
    expect(delViewer.ok).toBe(false);
  });

  it("prevents demoting or deactivating the last active administrator", async () => {
    // u1 is the only admin in seed data. Another admin tries to demote u1
    const admin2: Profile = {
      id: "u_admin2",
      name: "Admin 2",
      email: "admin2@plant.local",
      role: "admin",
      active: true,
    };

    // Try to assign u1 to technician
    const demoteRes = await setUserRole(admin2, "u1", "technician");
    expect(demoteRes.ok).toBe(false);
    if (!demoteRes.ok) {
      expect(demoteRes.errors.form).toContain("อย่างน้อย 1 บัญชี");
    }

    // Try to deactivate u1
    const deactRes = await setUserActive(admin2, "u1", false);
    expect(deactRes.ok).toBe(false);
    if (!deactRes.ok) {
      expect(deactRes.errors.form).toContain("อย่างน้อย 1 บัญชี");
    }

    // Try to set invalid/non-existent role
    const invalidRoleRes = await setUserRole(admin2, "u2", "ghost_role");
    expect(invalidRoleRes.ok).toBe(false);
    if (!invalidRoleRes.ok) {
      expect(invalidRoleRes.errors.form).toContain("ไม่พบ Role");
    }
  });
});
