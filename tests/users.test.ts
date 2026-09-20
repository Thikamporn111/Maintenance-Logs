import { beforeEach, describe, expect, it } from "vitest";
import {
  createUser,
  findUserByEmail,
  getUser,
  listUsers,
  resetDbForTesting,
  setUserActive,
  setUserRole,
  updateUser,
} from "@/lib/data/repo";
import { userCreateSchema, userUpdateSchema } from "@/lib/validation";
import type { Profile } from "@/lib/types";

const adminActor: Profile = {
  id: "u1",
  name: "Tanawat Chitratta",
  email: "admin@plant.local",
  role: "admin",
  active: true,
};

describe("Users Domain & Validation Functions", () => {
  beforeEach(() => {
    resetDbForTesting();
  });

  it("lists all users and finds user by ID or email", async () => {
    const users = await listUsers();
    expect(users.length).toBeGreaterThanOrEqual(4);

    const u1 = await getUser("u1");
    expect(u1).toBeDefined();
    expect(u1?.email).toBe("admin@plant.local");

    const byEmail = await findUserByEmail("ADMIN@PLANT.LOCAL");
    expect(byEmail).toBeDefined();
    expect(byEmail?.id).toBe("u1");

    // u1 is local, u4 is google
    expect(u1?.provider).toBe("local");
    const u4 = await getUser("u4");
    expect(u4?.provider).toBe("google");
  });

  it("creates a new user and rejects duplicate email", async () => {
    const res = await createUser(adminActor, {
      name: "Somsak Engineer",
      email: "somsak@plant.local",
      role: "technician",
      password: "password123",
    });

    expect(res.ok).toBe(true);
    if (res.ok) {
      const created = await getUser(res.id);
      expect(created?.name).toBe("Somsak Engineer");
      expect(created?.role).toBe("technician");
      expect(created?.active).toBe(true);
    }

    // Duplicate email must be rejected
    const dupRes = await createUser(adminActor, {
      name: "Another Somsak",
      email: "somsak@plant.local",
      role: "viewer",
    });
    expect(dupRes.ok).toBe(false);
    if (!dupRes.ok) {
      expect(dupRes.errors.email).toBeDefined();
    }
  });

  it("allows admin to edit all attributes of a user (name, email, role, password, active)", async () => {
    // Edit user u2
    const res = await updateUser(adminActor, "u2", {
      name: "Prasert Mekanik Senior",
      email: "prasert.senior@plant.local",
      role: "admin",
      password: "NewSecretPassword123!",
      active: true,
    });

    expect(res.ok).toBe(true);
    const updated = await getUser("u2");
    expect(updated?.name).toBe("Prasert Mekanik Senior");
    expect(updated?.email).toBe("prasert.senior@plant.local");
    expect(updated?.role).toBe("admin");
    expect(updated?.active).toBe(true);
  });

  it("prevents admin from deactivating or demoting themselves", async () => {
    // Try to deactivate self
    const deactRes = await updateUser(adminActor, "u1", {
      name: "Tanawat Chitratta",
      email: "admin@plant.local",
      role: "admin",
      active: false,
    });
    expect(deactRes.ok).toBe(false);
    if (!deactRes.ok) {
      expect(deactRes.errors.active).toContain("ปิดการใช้งาน");
    }

    // Try to demote self
    const demoteRes = await updateUser(adminActor, "u1", {
      name: "Tanawat Chitratta",
      email: "admin@plant.local",
      role: "viewer",
      active: true,
    });
    expect(demoteRes.ok).toBe(false);
    if (!demoteRes.ok) {
      expect(demoteRes.errors.role).toContain("Role");
    }
  });

  it("rejects updating to an email already in use by another user", async () => {
    // Try to change u2's email to u1's email
    const res = await updateUser(adminActor, "u2", {
      name: "Prasert",
      email: "admin@plant.local",
      role: "technician",
      active: true,
    });

    expect(res.ok).toBe(false);
    if (!res.ok) {
      expect(res.errors.email).toContain("ใช้อยู่แล้ว");
    }
  });

  it("handles setUserRole and setUserActive directly with safeguards", async () => {
    // Change u3 to viewer
    const r1 = await setUserRole(adminActor, "u3", "viewer");
    expect(r1.ok).toBe(true);
    expect((await getUser("u3"))?.role).toBe("viewer");

    // Try to change own role
    const r2 = await setUserRole(adminActor, "u1", "viewer");
    expect(r2.ok).toBe(false);

    // Toggle active on u3
    const a1 = await setUserActive(adminActor, "u3", false);
    expect(a1.ok).toBe(true);
    expect((await getUser("u3"))?.active).toBe(false);

    // Try to deactivate self
    const a2 = await setUserActive(adminActor, "u1", false);
    expect(a2.ok).toBe(false);
  });

  it("validates userCreateSchema and userUpdateSchema", () => {
    const validCreate = {
      name: "สมชาย ใจดี",
      email: "somchai@plant.local",
      role: "technician",
      password: "securepassword",
    };
    expect(userCreateSchema.safeParse(validCreate).success).toBe(true);

    const invalidCreate = {
      name: "S",
      email: "invalid-email",
      role: "superadmin",
      password: "123",
    };
    const cRes = userCreateSchema.safeParse(invalidCreate);
    expect(cRes.success).toBe(false);

    const validUpdate = {
      name: "สมหมาย พัฒนา",
      email: "sommai@plant.local",
      role: "admin",
      password: "",
      active: true,
    };
    expect(userUpdateSchema.safeParse(validUpdate).success).toBe(true);
  });
});
