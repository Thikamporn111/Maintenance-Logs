// ─────────────────────────────────────────────────────────────────────────────
// DATA LAYER: Supabase with In-Memory Mock Fallback
// When NEXT_PUBLIC_SUPABASE_URL is configured, queries execute against Supabase.
// Otherwise, falls back to in-memory mock data (seed.ts) for offline/test environments.
// ─────────────────────────────────────────────────────────────────────────────
import "server-only";
import { createSeed, type Seed } from "./seed";
import type {
  Alarm,
  AlarmStatus,
  AuditEntry,
  Machine,
  MachineStatus,
  MaintenanceRecord,
  MaintenanceStatus,
  MaintenanceType,
  PmPlan,
  Profile,
  Role,
  RoleDefinition,
  Page,
  Permission,
} from "../types";
import { advancePlan, planState, todayStr, type PlanState } from "../pm";
import { parsePlantDateTime, plantDate } from "../time";
import type { FieldErrors } from "../validation";
import { isSupabaseConfigured } from "../supabase/config";
import { createClient } from "../supabase/server";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";


const g = globalThis as unknown as { __maintenanceLogsStore?: Seed };
const db = (): Seed => (g.__maintenanceLogsStore ??= createSeed());

export type Result = { ok: true; id: string } | { ok: false; errors: FieldErrors };
const fail = (errors: FieldErrors): Result => ({ ok: false, errors });

function nextId(ids: string[], prefix: string, width: number): string {
  const n = ids.reduce((mx, id) => Math.max(mx, parseInt(id.split("-")[1], 10) || 0), 0) + 1;
  return `${prefix}-${String(n).padStart(width, "0")}`;
}

async function audit(actor: Profile, text: string) {
  if (isSupabaseConfigured()) {
    try {
      const supabase = await createClient();
      await supabase.from("audit_log").insert({
        at: new Date().toISOString(),
        user_id: actor.id,
        text,
      });
      return;
    } catch (e) {
      console.error("Failed to insert audit log to Supabase:", e);
    }
  }
  db().audit.unshift({ at: new Date().toISOString(), userId: actor.id, text });
}

const lc = (s: string) => s.toLowerCase();

// Database Mapping Types and Helpers
interface DbAlarmRow {
  id: string;
  machine_id: string;
  code: string;
  description: string;
  occurred_at: string;
  cause?: string | null;
  action?: string | null;
  status: AlarmStatus;
  assignee_id?: string | null;
  closed_at?: string | null;
  closed_by?: string | null;
  updated_at?: string | null;
}

interface DbMaintenanceRow {
  id: string;
  machine_id: string;
  technician_id: string;
  type: MaintenanceType;
  problem: string;
  action?: string | null;
  date: string;
  status: MaintenanceStatus;
  alarm_id?: string | null;
  plan_id?: string | null;
}

interface DbPlanRow {
  id: string;
  machine_id: string;
  technician_id?: string | null;
  task: string;
  checklist?: string | null;
  interval_days: number;
  last_done?: string | null;
  next_due: string;
  active: boolean;
}

interface DbAuditRow {
  at: string;
  user_id?: string | null;
  text: string;
}

function mapAlarm(r: DbAlarmRow): Alarm {
  return {
    id: r.id,
    machineId: r.machine_id,
    code: r.code,
    description: r.description,
    occurredAt: r.occurred_at,
    cause: r.cause ?? "",
    action: r.action ?? "",
    status: r.status,
    assigneeId: r.assignee_id ?? null,
    closedAt: r.closed_at ?? null,
    closedBy: r.closed_by ?? null,
    updatedAt: r.updated_at ?? r.occurred_at,
  };
}

function mapMaintenance(r: DbMaintenanceRow): MaintenanceRecord {
  return {
    id: r.id,
    machineId: r.machine_id,
    technicianId: r.technician_id,
    type: r.type,
    problem: r.problem,
    action: r.action ?? "",
    date: r.date,
    status: r.status,
    alarmId: r.alarm_id ?? null,
    planId: r.plan_id ?? null,
  };
}

function mapPlan(r: DbPlanRow): PmPlan {
  return {
    id: r.id,
    machineId: r.machine_id,
    technicianId: r.technician_id ?? "",
    task: r.task,
    checklist: r.checklist ?? "",
    intervalDays: r.interval_days,
    lastDone: r.last_done ?? null,
    nextDue: r.next_due,
    active: r.active,
  };
}

function mapAudit(r: DbAuditRow): AuditEntry {
  return {
    at: r.at,
    userId: r.user_id ?? "",
    text: r.text,
  };
}

// ── Users / profiles ─────────────────────────────────────────────────────────
export async function listUsers(): Promise<Profile[]> {
  if (isSupabaseConfigured()) {
    try {
      const supabase = await createClient();
      const { data, error } = await supabase
        .from("profiles")
        .select("id, name, email, role, active")
        .order("name");
      if (!error && data) {
        const providerMap = new Map<string, "google" | "local">();
        const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
        const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
        if (serviceKey) {
          try {
            const adminSupabase = createSupabaseClient(url, serviceKey, {
              auth: { autoRefreshToken: false, persistSession: false },
            });
            const { data: authData } = await adminSupabase.auth.admin.listUsers();
            if (authData?.users) {
              authData.users.forEach((au) => {
                const isGoogle =
                  au.app_metadata?.provider === "google" ||
                  (Array.isArray(au.app_metadata?.providers) && au.app_metadata.providers.includes("google")) ||
                  au.user_metadata?.iss === "https://accounts.google.com" ||
                  Boolean(au.user_metadata?.provider_id) ||
                  au.identities?.some((ident: { provider?: string }) => ident.provider === "google");
                providerMap.set(au.id, isGoogle ? "google" : "local");
                if (au.email) providerMap.set(au.email.toLowerCase(), isGoogle ? "google" : "local");
              });
            }
          } catch (adminErr) {
            console.warn("Could not retrieve auth providers:", adminErr);
          }
        }
        return (data as Profile[]).map((u) => ({
          ...u,
          provider:
            providerMap.get(u.id) ||
            providerMap.get(u.email.toLowerCase()) ||
            "local",
        }));
      }
    } catch (e) {
      console.error("Error fetching users from Supabase:", e);
    }
  }
  return db().users;
}

export async function getUser(id: string): Promise<Profile | undefined> {
  if (isSupabaseConfigured()) {
    try {
      const supabase = await createClient();
      const { data, error } = await supabase
        .from("profiles")
        .select("id, name, email, role, active")
        .eq("id", id)
        .single();
      if (!error && data) {
        let provider: "google" | "local" = "local";
        const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
        const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
        if (serviceKey) {
          try {
            const adminSupabase = createSupabaseClient(url, serviceKey, {
              auth: { autoRefreshToken: false, persistSession: false },
            });
            const { data: authUser } = await adminSupabase.auth.admin.getUserById(id);
            if (authUser?.user) {
              const isGoogle =
                authUser.user.app_metadata?.provider === "google" ||
                (Array.isArray(authUser.user.app_metadata?.providers) &&
                  authUser.user.app_metadata.providers.includes("google")) ||
                authUser.user.user_metadata?.iss === "https://accounts.google.com" ||
                Boolean(authUser.user.user_metadata?.provider_id) ||
                authUser.user.identities?.some((ident) => ident.provider === "google");
              provider = isGoogle ? "google" : "local";
            }
          } catch {
            // ignore
          }
        }
        return { ...(data as Profile), provider };
      }
    } catch (e) {
      console.error("Error fetching user from Supabase:", e);
    }
  }
  return db().users.find((u) => u.id === id);
}

export async function findUserByEmail(email: string): Promise<Profile | undefined> {
  if (isSupabaseConfigured()) {
    try {
      const supabase = await createClient();
      const { data, error } = await supabase
        .from("profiles")
        .select("id, name, email, role, active")
        .ilike("email", email)
        .single();
      if (!error && data) return data as Profile;
    } catch (e) {
      console.error("Error finding user by email from Supabase:", e);
    }
  }
  return db().users.find((u) => u.email === lc(email));
}

export async function setUserRole(actor: Profile, id: string, role: Role): Promise<Result> {
  if (id === actor.id) {
    return fail({ form: "เปลี่ยน Role ของตัวเองไม่ได้ เพื่อกันการล็อกตัวเองออกจากระบบ" });
  }

  const user = await getUser(id);
  if (!user) return fail({ form: "ไม่พบผู้ใช้" });

  const roleDef = await getRole(role);
  if (!roleDef) return fail({ form: "ไม่พบ Role นี้ในระบบ" });

  // Prevent demoting the last active administrator
  if (user.role === "admin" && role !== "admin") {
    const allUsers = await listUsers();
    const otherAdmins = allUsers.filter((u) => u.role === "admin" && u.id !== id && u.active);
    if (otherAdmins.length === 0) {
      return fail({ form: "ไม่สามารถลดสิทธิ์ Admin บัญชีนี้ได้ เนื่องจากต้องมี Admin ประจำระบบอย่างน้อย 1 บัญชี" });
    }
  }

  if (isSupabaseConfigured()) {
    try {
      const supabase = await createClient();
      const { error } = await supabase.from("profiles").update({ role }).eq("id", id);
      if (error) return fail({ form: error.message });

      await audit(actor, `เปลี่ยน Role ของ ${user.email} จาก ${user.role} เป็น ${role}`);
      return { ok: true, id };
    } catch (e) {
      console.error("Error updating user role in Supabase:", e);
    }
  }

  const u = db().users.find((x) => x.id === id);
  if (!u) return fail({ form: "ไม่พบผู้ใช้" });
  const prev = u.role;
  u.role = role;
  await audit(actor, `เปลี่ยน Role ของ ${u.email} จาก ${prev} เป็น ${role}`);
  return { ok: true, id };
}

export async function setUserActive(actor: Profile, id: string, active: boolean): Promise<Result> {
  if (id === actor.id) {
    return fail({ form: "ปิดการใช้งานบัญชีตัวเองไม่ได้" });
  }

  const user = await getUser(id);
  if (!user) return fail({ form: "ไม่พบผู้ใช้" });

  // Prevent deactivating the last active administrator
  if (user.role === "admin" && !active) {
    const allUsers = await listUsers();
    const otherAdmins = allUsers.filter((u) => u.role === "admin" && u.id !== id && u.active);
    if (otherAdmins.length === 0) {
      return fail({ form: "ไม่สามารถปิดการใช้งาน Admin บัญชีนี้ได้ เนื่องจากต้องมี Admin ประจำระบบอย่างน้อย 1 บัญชี" });
    }
  }

  if (isSupabaseConfigured()) {
    try {
      const supabase = await createClient();
      const { error } = await supabase.from("profiles").update({ active }).eq("id", id);
      if (error) return fail({ form: error.message });

      await audit(actor, `${active ? "เปิด" : "ปิด"}การใช้งานบัญชี ${user.email}`);
      return { ok: true, id };
    } catch (e) {
      console.error("Error updating user active state in Supabase:", e);
    }
  }

  const u = db().users.find((x) => x.id === id);
  if (!u) return fail({ form: "ไม่พบผู้ใช้" });
  u.active = active;
  await audit(actor, `${active ? "เปิด" : "ปิด"}การใช้งานบัญชี ${u.email}`);
  return { ok: true, id };
}

export async function createUser(
  actor: Profile,
  data: { name: string; email: string; role: Role; password?: string }
): Promise<Result> {
  const email = data.email.trim().toLowerCase();
  const existing = await findUserByEmail(email);
  if (existing) {
    return fail({ email: "อีเมลนี้มีอยู่ในระบบแล้ว" });
  }

  const roleDef = await getRole(data.role);
  if (!roleDef) {
    return fail({ role: "ไม่พบ Role นี้ในระบบ" });
  }

  if (isSupabaseConfigured()) {
    try {
      const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
      const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;

      if (serviceKey) {
        const adminSupabase = createSupabaseClient(url, serviceKey, {
          auth: { autoRefreshToken: false, persistSession: false },
        });

        const { data: newUser, error: authError } = await adminSupabase.auth.admin.createUser({
          email,
          password: data.password || "Plant123456!",
          email_confirm: true,
          user_metadata: { full_name: data.name, role: data.role },
        });

        if (authError) return fail({ email: authError.message });

        await adminSupabase.from("profiles").upsert({
          id: newUser.user.id,
          name: data.name,
          email,
          role: data.role,
          active: true,
        });

        await audit(actor, `สร้างผู้ใช้ใหม่ ${email} (Role: ${data.role})`);
        return { ok: true, id: newUser.user.id };
      }

      // Without service key, pre-approve user in public.profiles for Google/Auth login
      const supabase = await createClient();
      const id = crypto.randomUUID();
      const { error } = await supabase.from("profiles").insert({
        id,
        name: data.name,
        email,
        role: data.role,
        active: true,
      });

      if (error) return fail({ form: error.message });

      await audit(actor, `กำหนดสิทธิ์ผู้ใช้ล่วงหน้า ${email} (Role: ${data.role})`);
      return { ok: true, id };
    } catch (e) {
      console.error("Error creating user in Supabase:", e);
      return fail({ form: "เกิดข้อผิดพลาดในการสร้างผู้ใช้" });
    }
  }

  const s = db();
  const id = `u${s.users.length + 1}`;
  s.users.push({
    id,
    name: data.name,
    email,
    role: data.role,
    active: true,
  });
  await audit(actor, `สร้างผู้ใช้ ${email} (Role: ${data.role})`);
  return { ok: true, id };
}

export async function updateUser(
  actor: Profile,
  id: string,
  data: { name: string; email: string; role: Role; password?: string; active: boolean }
): Promise<Result> {
  const user = await getUser(id);
  if (!user) return fail({ form: "ไม่พบผู้ใช้นี้ในระบบ" });

  const roleDef = await getRole(data.role);
  if (!roleDef) return fail({ role: "ไม่พบ Role นี้ในระบบ" });

  if (id === actor.id) {
    if (!data.active) {
      return fail({ active: "ปิดการใช้งานบัญชีตัวเองไม่ได้" });
    }
    if (data.role !== "admin") {
      const allUsers = await listUsers();
      const otherAdmins = allUsers.filter((u) => u.role === "admin" && u.id !== actor.id && u.active);
      if (otherAdmins.length === 0) {
        return fail({ role: "ไม่สามารถเปลี่ยน Role หรือลดสิทธิ์ตัวเองได้ เนื่องจากต้องมี Admin ประจำระบบอย่างน้อย 1 บัญชี" });
      }
    }
  } else {
    if (user.role === "admin" && data.role !== "admin") {
      const allUsers = await listUsers();
      const otherAdmins = allUsers.filter((u) => u.role === "admin" && u.id !== id && u.active);
      if (otherAdmins.length === 0) {
        return fail({ role: "ไม่สามารถลดสิทธิ์ Admin บัญชีนี้ได้ เนื่องจากต้องมี Admin ประจำระบบอย่างน้อย 1 บัญชี" });
      }
    }
    if (user.role === "admin" && !data.active) {
      const allUsers = await listUsers();
      const otherAdmins = allUsers.filter((u) => u.role === "admin" && u.id !== id && u.active);
      if (otherAdmins.length === 0) {
        return fail({ active: "ไม่สามารถปิดการใช้งาน Admin บัญชีนี้ได้ เนื่องจากต้องมี Admin ประจำระบบอย่างน้อย 1 บัญชี" });
      }
    }
  }

  const email = data.email.trim().toLowerCase();
  const existingWithEmail = await findUserByEmail(email);
  if (existingWithEmail && existingWithEmail.id !== id) {
    return fail({ email: "อีเมลนี้มีผู้ใช้งานอื่นใช้อยู่แล้ว" });
  }

  if (isSupabaseConfigured()) {
    try {
      const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
      const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;

      if (serviceKey) {
        const adminSupabase = createSupabaseClient(url, serviceKey, {
          auth: { autoRefreshToken: false, persistSession: false },
        });

        const updateAuthPayload: { email: string; password?: string; user_metadata: { full_name: string; role: Role } } = {
          email,
          user_metadata: { full_name: data.name, role: data.role },
        };
        if (data.password && data.password.trim()) {
          updateAuthPayload.password = data.password.trim();
        }

        try {
          await adminSupabase.auth.admin.updateUserById(id, updateAuthPayload);
        } catch (authErr) {
          console.warn("Supabase auth user update warning:", authErr);
        }

        const { error: profileError } = await adminSupabase
          .from("profiles")
          .update({
            name: data.name,
            email,
            role: data.role,
            active: data.active,
            updated_at: new Date().toISOString(),
          })
          .eq("id", id);

        if (profileError) return fail({ form: profileError.message });

        await audit(
          actor,
          `แก้ไขข้อมูลผู้ใช้ ${email} (Role: ${data.role}, Active: ${data.active}${data.password ? ", เปลี่ยนรหัสผ่าน" : ""})`
        );
        return { ok: true, id };
      }

      const supabase = await createClient();
      const { error: profileError } = await supabase
        .from("profiles")
        .update({
          name: data.name,
          email,
          role: data.role,
          active: data.active,
          updated_at: new Date().toISOString(),
        })
        .eq("id", id);

      if (profileError) return fail({ form: profileError.message });

      await audit(actor, `แก้ไขข้อมูลผู้ใช้ ${email} (Role: ${data.role}, Active: ${data.active})`);
      return { ok: true, id };
    } catch (e) {
      console.error("Error updating user in Supabase:", e);
      return fail({ form: "เกิดข้อผิดพลาดในการแก้ไขข้อมูลผู้ใช้" });
    }
  }

  const u = db().users.find((x) => x.id === id);
  if (!u) return fail({ form: "ไม่พบผู้ใช้" });
  u.name = data.name;
  u.email = email;
  u.role = data.role;
  u.active = data.active;
  await audit(
    actor,
    `แก้ไขข้อมูลผู้ใช้ ${email} (Role: ${data.role}, Active: ${data.active}${data.password ? ", เปลี่ยนรหัสผ่าน" : ""})`
  );
  return { ok: true, id };
}

// ── Roles & Permissions (RBAC) ──────────────────────────────────────────────
interface DbRoleRow {
  id: string;
  label: string;
  description: string;
  pages: string[];
  permissions: string[];
  is_system?: boolean;
}

function mapRole(r: DbRoleRow): RoleDefinition {
  return {
    id: r.id,
    label: r.label,
    description: r.description || "",
    pages: (Array.isArray(r.pages) ? r.pages : []) as Page[],
    permissions: (Array.isArray(r.permissions) ? r.permissions : []) as Permission[],
    isSystem: Boolean(r.is_system),
  };
}

export async function listRoles(): Promise<RoleDefinition[]> {
  if (isSupabaseConfigured()) {
    try {
      const supabase = await createClient();
      const { data, error } = await supabase.from("roles").select("*").order("id");
      if (!error && data && data.length > 0) {
        return (data as DbRoleRow[]).map(mapRole);
      }
    } catch (e) {
      console.error("Error fetching roles from Supabase:", e);
    }
  }
  return db().roles;
}

export async function getRole(id: string): Promise<RoleDefinition | undefined> {
  if (isSupabaseConfigured()) {
    try {
      const supabase = await createClient();
      const { data, error } = await supabase.from("roles").select("*").eq("id", id).single();
      if (!error && data) {
        return mapRole(data as DbRoleRow);
      }
    } catch (e) {
      console.error("Error fetching role from Supabase:", e);
    }
  }
  return db().roles.find((r) => r.id === id);
}

export async function createRole(
  actor: Profile,
  data: { id: string; label: string; description: string; pages: Page[]; permissions: Permission[] }
): Promise<Result> {
  const roleId = data.id.trim().toLowerCase();
  const existing = await getRole(roleId);
  if (existing) {
    return fail({ id: "รหัส Role นี้มีอยู่ในระบบแล้ว" });
  }

  const label = data.label.trim();
  if (!label) {
    return fail({ label: "กรุณาระบุชื่อ Role" });
  }

  if (isSupabaseConfigured()) {
    try {
      const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
      const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
      const client = serviceKey
        ? createSupabaseClient(url, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } })
        : await createClient();

      const { error } = await client.from("roles").insert({
        id: roleId,
        label,
        description: data.description || "",
        pages: data.pages,
        permissions: data.permissions,
        is_system: false,
      });

      if (error) return fail({ form: error.message });

      await audit(actor, `สร้าง Role ใหม่: ${label} (${roleId})`);
      return { ok: true, id: roleId };
    } catch (e) {
      console.error("Error creating role in Supabase:", e);
      return fail({ form: "เกิดข้อผิดพลาดในการสร้าง Role" });
    }
  }

  const s = db();
  s.roles.push({
    id: roleId,
    label,
    description: data.description || "",
    pages: data.pages,
    permissions: data.permissions,
    isSystem: false,
  });
  await audit(actor, `สร้าง Role ใหม่: ${label} (${roleId})`);
  return { ok: true, id: roleId };
}

export async function updateRole(
  actor: Profile,
  id: string,
  data: { label: string; description: string; pages: Page[]; permissions: Permission[] }
): Promise<Result> {
  const existing = await getRole(id);
  if (!existing) {
    return fail({ form: "ไม่พบ Role นี้ในระบบ" });
  }

  const label = data.label.trim();
  if (!label) {
    return fail({ label: "กรุณาระบุชื่อ Role" });
  }

  // Safety protection for Admin role:
  // Admin must always retain users:manage permission and users page access to prevent admin lockout
  const finalPages = [...data.pages];
  const finalPermissions = [...data.permissions];

  if (id === "admin") {
    if (!finalPermissions.includes("users:manage")) {
      finalPermissions.push("users:manage");
    }
    if (!finalPages.includes("users")) {
      finalPages.push("users");
    }
  }

  if (isSupabaseConfigured()) {
    try {
      const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
      const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
      const client = serviceKey
        ? createSupabaseClient(url, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } })
        : await createClient();

      const { error } = await client
        .from("roles")
        .update({
          label,
          description: data.description || "",
          pages: finalPages,
          permissions: finalPermissions,
          updated_at: new Date().toISOString(),
        })
        .eq("id", id);

      if (error) return fail({ form: error.message });

      await audit(actor, `แก้ไขสิทธิ์ Role: ${label} (${id})`);
      return { ok: true, id };
    } catch (e) {
      console.error("Error updating role in Supabase:", e);
      return fail({ form: "เกิดข้อผิดพลาดในการแก้ไขสิทธิ์ Role" });
    }
  }

  const roleInDb = db().roles.find((r) => r.id === id);
  if (roleInDb) {
    roleInDb.label = label;
    roleInDb.description = data.description || "";
    roleInDb.pages = finalPages;
    roleInDb.permissions = finalPermissions;
  }
  await audit(actor, `แก้ไขสิทธิ์ Role: ${label} (${id})`);
  return { ok: true, id };
}

export async function deleteRole(actor: Profile, id: string): Promise<Result> {
  const existing = await getRole(id);
  if (!existing) {
    return fail({ form: "ไม่พบ Role นี้ในระบบ" });
  }

  if (existing.isSystem || id === "admin" || id === "technician" || id === "viewer") {
    return fail({ form: "ไม่สามารถลบ System Role เริ่มต้นของระบบได้" });
  }

  // Check if any users are currently assigned to this role
  const users = await listUsers();
  const assignedUsers = users.filter((u) => u.role === id);
  if (assignedUsers.length > 0) {
    return fail({
      form: `ไม่สามารถลบได้ เนื่องจากมีผู้ใช้งาน ${assignedUsers.length} บัญชีกำลังใช้งาน Role นี้อยู่ กรุณาเปลี่ยน Role ของผู้ใช้ก่อนลบ`,
    });
  }

  if (isSupabaseConfigured()) {
    try {
      const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
      const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
      const client = serviceKey
        ? createSupabaseClient(url, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } })
        : await createClient();

      const { error } = await client.from("roles").delete().eq("id", id);
      if (error) return fail({ form: error.message });

      await audit(actor, `ลบ Role: ${existing.label} (${id})`);
      return { ok: true, id };
    } catch (e) {
      console.error("Error deleting role from Supabase:", e);
      return fail({ form: "เกิดข้อผิดพลาดในการลบ Role" });
    }
  }

  const s = db();
  const idx = s.roles.findIndex((r) => r.id === id);
  if (idx !== -1) {
    s.roles.splice(idx, 1);
  }
  await audit(actor, `ลบ Role: ${existing.label} (${id})`);
  return { ok: true, id };
}

export function resetDbForTesting(): void {
  g.__maintenanceLogsStore = createSeed();
}


// ── Machines ─────────────────────────────────────────────────────────────────
export type MachineFilter = { q?: string; status?: string; type?: string };

export async function listMachines(f: MachineFilter = {}): Promise<Machine[]> {
  if (isSupabaseConfigured()) {
    try {
      const supabase = await createClient();
      let query = supabase.from("machines").select("id, name, type, location, status").order("id");
      if (f.status) query = query.eq("status", f.status);
      if (f.type) query = query.eq("type", f.type);
      const { data, error } = await query;
      if (!error && data) {
        const q = lc(f.q ?? "");
        return (data as Machine[]).filter(
          (m) => !q || lc(m.id).includes(q) || lc(m.name).includes(q)
        );
      }
    } catch (e) {
      console.error("Error fetching machines from Supabase:", e);
    }
  }

  const q = lc(f.q ?? "");
  return db()
    .machines.filter(
      (m) =>
        (!q || lc(m.id).includes(q) || lc(m.name).includes(q)) &&
        (!f.status || m.status === f.status) &&
        (!f.type || m.type === f.type)
    )
    .sort((a, b) => a.id.localeCompare(b.id));
}

export async function getMachine(id: string): Promise<Machine | undefined> {
  if (isSupabaseConfigured()) {
    try {
      const supabase = await createClient();
      const { data, error } = await supabase
        .from("machines")
        .select("id, name, type, location, status")
        .eq("id", id)
        .single();
      if (!error && data) return data as Machine;
    } catch (e) {
      console.error("Error fetching machine from Supabase:", e);
    }
  }
  return db().machines.find((m) => m.id === id);
}

export async function createMachine(actor: Profile, data: Machine): Promise<Result> {
  if (isSupabaseConfigured()) {
    try {
      const supabase = await createClient();
      const existing = await getMachine(data.id);
      if (existing) {
        return fail({ id: `Machine ID already exists: มี ${data.id} อยู่แล้ว` });
      }

      const { error } = await supabase.from("machines").insert(data);
      if (error) return fail({ form: error.message });

      await audit(actor, `เพิ่มเครื่อง ${data.id}`);
      return { ok: true, id: data.id };
    } catch (e) {
      console.error("Error creating machine in Supabase:", e);
    }
  }

  if (db().machines.some((m) => m.id === data.id)) {
    return fail({ id: `Machine ID already exists: มี ${data.id} อยู่แล้ว` });
  }
  db().machines.push({ ...data });
  await audit(actor, `เพิ่มเครื่อง ${data.id}`);
  return { ok: true, id: data.id };
}

export async function updateMachine(actor: Profile, id: string, data: Omit<Machine, "id">): Promise<Result> {
  if (isSupabaseConfigured()) {
    try {
      const supabase = await createClient();
      const { error } = await supabase.from("machines").update(data).eq("id", id);
      if (error) return fail({ form: error.message });

      await audit(actor, `แก้ไขข้อมูลเครื่อง ${id}`);
      return { ok: true, id };
    } catch (e) {
      console.error("Error updating machine in Supabase:", e);
    }
  }

  const m = db().machines.find((x) => x.id === id);
  if (!m) return fail({ form: "ไม่พบเครื่องจักร" });
  Object.assign(m, data);
  await audit(actor, `แก้ไขข้อมูลเครื่อง ${id}`);
  return { ok: true, id };
}

export async function machineReferences(id: string) {
  if (isSupabaseConfigured()) {
    try {
      const supabase = await createClient();
      const [a, m, p] = await Promise.all([
        supabase.from("alarms").select("id", { count: "exact", head: true }).eq("machine_id", id),
        supabase.from("maintenance_records").select("id", { count: "exact", head: true }).eq("machine_id", id),
        supabase.from("pm_plans").select("id", { count: "exact", head: true }).eq("machine_id", id).eq("active", true),
      ]);
      return {
        alarms: a.count ?? 0,
        maintenance: m.count ?? 0,
        plans: p.count ?? 0,
      };
    } catch (e) {
      console.error("Error checking machine references in Supabase:", e);
    }
  }

  const s = db();
  return {
    alarms: s.alarms.filter((a) => a.machineId === id).length,
    maintenance: s.maintenance.filter((r) => r.machineId === id).length,
    plans: s.plans.filter((p) => p.machineId === id && p.active).length,
  };
}

export async function deleteMachine(actor: Profile, id: string): Promise<Result> {
  const refs = await machineReferences(id);
  if (refs.alarms || refs.maintenance || refs.plans) {
    return fail({
      form: `ลบ ${id} ไม่ได้ เพราะมี Alarm ${refs.alarms} รายการ งานซ่อม ${refs.maintenance} งาน และแผน PM ${refs.plans} แผนอ้างอิงอยู่ ให้เปลี่ยนสถานะเป็น Stop แทน`,
    });
  }

  if (isSupabaseConfigured()) {
    try {
      const supabase = await createClient();
      const { error } = await supabase.from("machines").delete().eq("id", id);
      if (error) return fail({ form: error.message });

      await audit(actor, `ลบเครื่อง ${id}`);
      return { ok: true, id };
    } catch (e) {
      console.error("Error deleting machine in Supabase:", e);
    }
  }

  const s = db();
  const before = s.machines.length;
  s.machines = s.machines.filter((m) => m.id !== id);
  if (s.machines.length === before) return fail({ form: "ไม่พบเครื่องจักร" });
  await audit(actor, `ลบเครื่อง ${id}`);
  return { ok: true, id };
}

// ── Alarms ───────────────────────────────────────────────────────────────────
export type AlarmFilter = { q?: string; status?: string; machineId?: string; from?: string; to?: string };

export async function listAlarms(f: AlarmFilter = {}): Promise<Alarm[]> {
  if (isSupabaseConfigured()) {
    try {
      const supabase = await createClient();
      let query = supabase.from("alarms").select("*").order("occurred_at", { ascending: false });
      if (f.status) query = query.eq("status", f.status);
      if (f.machineId) query = query.eq("machine_id", f.machineId);
      if (f.from) query = query.gte("occurred_at", `${f.from}T00:00:00+07:00`);
      if (f.to) query = query.lte("occurred_at", `${f.to}T23:59:59+07:00`);

      const { data, error } = await query;
      if (!error && data) {
        const q = lc(f.q ?? "");
        const mapped = data.map(mapAlarm);
        return mapped.filter(
          (a) =>
            !q ||
            lc(a.code).includes(q) ||
            lc(a.description).includes(q) ||
            lc(a.id).includes(q)
        );
      }
    } catch (e) {
      console.error("Error fetching alarms from Supabase:", e);
    }
  }

  const q = lc(f.q ?? "");
  const from = f.from ? parsePlantDateTime(`${f.from}T00:00`) : null;
  const to = f.to ? parsePlantDateTime(`${f.to}T23:59:59`) : null;
  return db()
    .alarms.filter((a) => {
      const t = new Date(a.occurredAt);
      return (
        (!q || lc(a.code).includes(q) || lc(a.description).includes(q) || lc(a.id).includes(q)) &&
        (!f.status || a.status === f.status) &&
        (!f.machineId || a.machineId === f.machineId) &&
        (!from || t >= from) &&
        (!to || t <= to)
      );
    })
    .sort((a, b) => b.occurredAt.localeCompare(a.occurredAt));
}

export async function getAlarm(id: string): Promise<Alarm | undefined> {
  if (isSupabaseConfigured()) {
    try {
      const supabase = await createClient();
      const { data, error } = await supabase.from("alarms").select("*").eq("id", id).single();
      if (!error && data) return mapAlarm(data);
    } catch (e) {
      console.error("Error fetching alarm from Supabase:", e);
    }
  }
  return db().alarms.find((a) => a.id === id);
}

export async function activeAlarms(machineId?: string): Promise<Alarm[]> {
  if (isSupabaseConfigured()) {
    try {
      const supabase = await createClient();
      let query = supabase.from("alarms").select("*").neq("status", "Closed");
      if (machineId) query = query.eq("machine_id", machineId);
      const { data, error } = await query;
      if (!error && data) return data.map(mapAlarm);
    } catch (e) {
      console.error("Error fetching active alarms from Supabase:", e);
    }
  }
  return db().alarms.filter((a) => a.status !== "Closed" && (!machineId || a.machineId === machineId));
}

export async function createAlarm(
  actor: Profile,
  data: { machineId: string; code: string; description: string; occurredAt: string; cause: string }
): Promise<Result> {
  const m = await getMachine(data.machineId);
  if (!m) return fail({ machineId: "ไม่พบเครื่องจักรนี้ใน Machine Master" });

  const occurredAt = parsePlantDateTime(data.occurredAt).toISOString();

  if (isSupabaseConfigured()) {
    try {
      const supabase = await createClient();
      const { data: existingIds } = await supabase.from("alarms").select("id");
      const idList = existingIds?.map((x) => x.id) ?? [];
      const id = nextId(idList, "ALM", 4);

      const { error } = await supabase.from("alarms").insert({
        id,
        machine_id: data.machineId,
        code: data.code,
        description: data.description,
        occurred_at: occurredAt,
        cause: data.cause || "",
        action: "",
        status: "Open",
      });
      if (error) return fail({ form: error.message });

      await audit(actor, `บันทึก ${id} (${data.code}) ที่ ${data.machineId}`);
      return { ok: true, id };
    } catch (e) {
      console.error("Error creating alarm in Supabase:", e);
    }
  }

  const s = db();
  const id = nextId(s.alarms.map((a) => a.id), "ALM", 4);
  s.alarms.push({
    id,
    ...data,
    occurredAt,
    action: "",
    status: "Open",
    assigneeId: null,
    closedAt: null,
    closedBy: null,
    updatedAt: new Date().toISOString(),
  });
  if (m.status !== "Maintenance") m.status = "Alarm";
  await audit(actor, `บันทึก ${id} (${data.code}) ที่ ${data.machineId}`);
  return { ok: true, id };
}

export async function updateAlarm(
  actor: Profile,
  id: string,
  data: { status: AlarmStatus; cause: string; action: string }
): Promise<Result> {
  const a = await getAlarm(id);
  if (!a) return fail({ form: "ไม่พบ Alarm" });
  if (a.status === "Closed") return fail({ form: "Alarm นี้ปิดไปแล้ว แก้ไขไม่ได้" });
  if (data.status === "Closed") {
    if (!data.cause?.trim()) return fail({ cause: "ต้องระบุสาเหตุก่อนปิด Alarm" });
    if (!data.action?.trim()) return fail({ action: "ต้องบันทึก Action Taken ก่อนเปลี่ยนเป็น Closed" });
  }

  const prev = a.status;
  const now = new Date().toISOString();

  if (isSupabaseConfigured()) {
    try {
      const supabase = await createClient();
      const updateData: {
        status: AlarmStatus;
        cause: string;
        action: string;
        updated_at: string;
        assignee_id?: string;
        closed_at?: string;
        closed_by?: string;
      } = {
        status: data.status,
        cause: data.cause,
        action: data.action,
        updated_at: now,
      };
      if (data.status === "In Progress" && !a.assigneeId) {
        updateData.assignee_id = actor.id;
      }
      if (data.status === "Closed") {
        updateData.closed_at = now;
        updateData.closed_by = actor.id;
      }

      const { error } = await supabase.from("alarms").update(updateData).eq("id", id);
      if (error) return fail({ form: error.message });

      await audit(
        actor,
        prev !== data.status ? `เปลี่ยน ${id} จาก ${prev} เป็น ${data.status}` : `แก้ไขรายละเอียด ${id}`
      );
      return { ok: true, id };
    } catch (e) {
      console.error("Error updating alarm in Supabase:", e);
    }
  }

  const alarmInDb = db().alarms.find((x) => x.id === id);
  if (alarmInDb) {
    Object.assign(alarmInDb, { status: data.status, cause: data.cause, action: data.action, updatedAt: now });
    if (data.status === "In Progress" && !alarmInDb.assigneeId) alarmInDb.assigneeId = actor.id;
    if (data.status === "Closed") {
      alarmInDb.closedAt = now;
      alarmInDb.closedBy = actor.id;
      const m = await getMachine(alarmInDb.machineId);
      if (m?.status === "Alarm" && !(await activeAlarms(alarmInDb.machineId)).length) {
        m.status = "Running";
      }
    }
  }
  await audit(actor, prev !== data.status ? `เปลี่ยน ${id} จาก ${prev} เป็น ${data.status}` : `แก้ไขรายละเอียด ${id}`);
  return { ok: true, id };
}

// ── Maintenance records ──────────────────────────────────────────────────────
export type MaintenanceFilter = { q?: string; status?: string; technicianId?: string; type?: string };

export async function listMaintenance(f: MaintenanceFilter = {}): Promise<MaintenanceRecord[]> {
  if (isSupabaseConfigured()) {
    try {
      const supabase = await createClient();
      let query = supabase.from("maintenance_records").select("*").order("date", { ascending: false });
      if (f.status) query = query.eq("status", f.status);
      if (f.technicianId) query = query.eq("technician_id", f.technicianId);
      if (f.type) query = query.eq("type", f.type);

      const { data, error } = await query;
      if (!error && data) {
        const q = lc(f.q ?? "");
        const mapped = data.map(mapMaintenance);
        return mapped.filter(
          (r) =>
            !q ||
            lc([r.id, r.problem, r.action, r.machineId].join(" ")).includes(q)
        );
      }
    } catch (e) {
      console.error("Error fetching maintenance records from Supabase:", e);
    }
  }

  const q = lc(f.q ?? "");
  const s = db();
  const name = (id: string) => s.machines.find((m) => m.id === id)?.name ?? "";
  return s.maintenance
    .filter(
      (r) =>
        (!q || lc([r.id, r.problem, r.action, r.machineId, name(r.machineId)].join(" ")).includes(q)) &&
        (!f.status || r.status === f.status) &&
        (!f.technicianId || r.technicianId === f.technicianId) &&
        (!f.type || r.type === f.type)
    )
    .sort((a, b) => b.date.localeCompare(a.date));
}

export async function getMaintenance(id: string): Promise<MaintenanceRecord | undefined> {
  if (isSupabaseConfigured()) {
    try {
      const supabase = await createClient();
      const { data, error } = await supabase.from("maintenance_records").select("*").eq("id", id).single();
      if (!error && data) return mapMaintenance(data);
    } catch (e) {
      console.error("Error fetching maintenance from Supabase:", e);
    }
  }
  return db().maintenance.find((r) => r.id === id);
}

export type MaintenanceInput = {
  machineId: string;
  technicianId: string;
  type: MaintenanceType;
  date: string;
  status: MaintenanceStatus;
  alarmId: string;
  planId: string;
  problem: string;
  action: string;
};

async function checkMaintenanceRefs(data: MaintenanceInput): Promise<FieldErrors> {
  const e: FieldErrors = {};
  if (!(await getMachine(data.machineId))) e.machineId = "ไม่พบเครื่องจักรนี้";
  const tech = await getUser(data.technicianId);
  if (!tech || !tech.active || tech.role === "viewer") e.technicianId = "เลือกช่างที่มีสิทธิ์รับงาน";
  if (data.status === "Done" && !data.action?.trim()) e.action = "ต้องบันทึกการแก้ไขก่อนปิดงาน";
  if (data.status === "Waiting Part" && !data.action?.trim()) e.action = "ระบุอะไหล่ที่รอ เช่น Vacuum cup x4";
  if (data.alarmId) {
    const a = await getAlarm(data.alarmId);
    if (!a) e.alarmId = "ไม่พบ Alarm นี้";
    else if (a.machineId !== data.machineId) e.alarmId = `Alarm นี้เป็นของ ${a.machineId} ไม่ตรงกับเครื่องที่เลือก`;
  }
  if (data.planId) {
    const p = await getPlan(data.planId);
    if (!p) e.planId = "ไม่พบแผน PM นี้";
    else if (p.machineId !== data.machineId) e.planId = `แผนนี้เป็นของ ${p.machineId} ไม่ตรงกับเครื่องที่เลือก`;
  }
  return e;
}

function syncAfterMaintenance(actor: Profile, r: MaintenanceRecord, wasDone: boolean) {
  const m = db().machines.find((x) => x.id === r.machineId);
  if (m && (r.status === "In Progress" || r.status === "Waiting Part")) m.status = "Maintenance";
  if (m && r.status === "Done" && m.status === "Maintenance") {
    m.status = db().alarms.some((a) => a.machineId === m.id && a.status !== "Closed") ? "Alarm" : "Running";
  }
  if (r.planId && r.status === "Done" && !wasDone) {
    const s = db();
    const i = s.plans.findIndex((p) => p.id === r.planId);
    if (i >= 0) {
      s.plans[i] = advancePlan(s.plans[i], todayStr());
      audit(actor, `${r.planId} ทำเสร็จ (${r.id}) รอบถัดไป ${s.plans[i].nextDue}`);
    }
  }
}

export async function createMaintenance(actor: Profile, data: MaintenanceInput): Promise<Result> {
  const errors = await checkMaintenanceRefs(data);
  if (Object.keys(errors).length) return fail(errors);

  const dateIso = parsePlantDateTime(data.date).toISOString();

  if (isSupabaseConfigured()) {
    try {
      const supabase = await createClient();
      const { data: existing } = await supabase.from("maintenance_records").select("id");
      const id = nextId(existing?.map((x) => x.id) ?? [], "MNT", 4);

      const { error } = await supabase.from("maintenance_records").insert({
        id,
        machine_id: data.machineId,
        technician_id: data.technicianId || null,
        type: data.type,
        problem: data.problem,
        action: data.action || "",
        date: dateIso,
        status: data.status,
        alarm_id: data.alarmId || null,
        plan_id: data.planId || null,
      });
      if (error) return fail({ form: error.message });

      await audit(actor, `สร้างงานซ่อม ${id} ที่ ${data.machineId}`);
      return { ok: true, id };
    } catch (e) {
      console.error("Error creating maintenance in Supabase:", e);
    }
  }

  const s = db();
  const id = nextId(s.maintenance.map((r) => r.id), "MNT", 4);
  const rec: MaintenanceRecord = {
    id,
    ...data,
    date: dateIso,
    alarmId: data.alarmId || null,
    planId: data.planId || null,
  };
  s.maintenance.push(rec);
  await audit(actor, `สร้างงานซ่อม ${id} ที่ ${data.machineId}`);
  syncAfterMaintenance(actor, rec, false);
  return { ok: true, id };
}

export async function updateMaintenance(actor: Profile, id: string, data: MaintenanceInput): Promise<Result> {
  const r = await getMaintenance(id);
  if (!r) return fail({ form: "ไม่พบงานซ่อม" });
  const errors = await checkMaintenanceRefs(data);
  if (Object.keys(errors).length) return fail(errors);

  const prev = r.status;
  const dateIso = parsePlantDateTime(data.date).toISOString();

  if (isSupabaseConfigured()) {
    try {
      const supabase = await createClient();
      const { error } = await supabase
        .from("maintenance_records")
        .update({
          machine_id: data.machineId,
          technician_id: data.technicianId || null,
          type: data.type,
          problem: data.problem,
          action: data.action || "",
          date: dateIso,
          status: data.status,
          alarm_id: data.alarmId || null,
          plan_id: data.planId || null,
        })
        .eq("id", id);
      if (error) return fail({ form: error.message });

      await audit(actor, prev !== data.status ? `เปลี่ยนสถานะ ${id} เป็น ${data.status}` : `แก้ไขงานซ่อม ${id}`);
      return { ok: true, id };
    } catch (e) {
      console.error("Error updating maintenance in Supabase:", e);
    }
  }

  const recInDb = db().maintenance.find((x) => x.id === id);
  if (recInDb) {
    const wasDone = recInDb.status === "Done";
    Object.assign(recInDb, {
      ...data,
      date: dateIso,
      alarmId: data.alarmId || null,
      planId: data.planId || null,
    });
    syncAfterMaintenance(actor, recInDb, wasDone);
  }
  await audit(actor, prev !== data.status ? `เปลี่ยนสถานะ ${id} เป็น ${data.status}` : `แก้ไขงานซ่อม ${id}`);
  return { ok: true, id };
}

// ── PM plans ─────────────────────────────────────────────────────────────────
export type PlanWithState = PmPlan & { state: PlanState; workOrderId: string | null };

export async function listPlans(f: { q?: string; state?: string } = {}): Promise<PlanWithState[]> {
  if (isSupabaseConfigured()) {
    try {
      const supabase = await createClient();
      const [plansRes, mntRes, machinesRes] = await Promise.all([
        supabase.from("pm_plans").select("*").eq("active", true).order("next_due"),
        supabase.from("maintenance_records").select("*").neq("status", "Done"),
        supabase.from("machines").select("id, name"),
      ]);

      if (!plansRes.error && plansRes.data) {
        const q = lc(f.q ?? "");
        const openMnt = (mntRes.data ?? []).map(mapMaintenance);
        const machines = machinesRes.data ?? [];
        const name = (id: string) => machines.find((m) => m.id === id)?.name ?? "";

        const mapped = plansRes.data
          .map(mapPlan)
          .map((p) => ({
            ...p,
            state: planState(p, openMnt),
            workOrderId: openMnt.find((r) => r.planId === p.id)?.id ?? null,
          }))
          .filter(
            (p) =>
              (!f.state || p.state === f.state) &&
              (!q || lc([p.id, p.task, p.machineId, name(p.machineId)].join(" ")).includes(q))
          );
        return mapped;
      }
    } catch (e) {
      console.error("Error fetching plans from Supabase:", e);
    }
  }

  const s = db();
  const q = lc(f.q ?? "");
  const name = (id: string) => s.machines.find((m) => m.id === id)?.name ?? "";
  return s.plans
    .filter((p) => p.active)
    .map((p) => ({
      ...p,
      state: planState(p, s.maintenance),
      workOrderId: s.maintenance.find((r) => r.planId === p.id && r.status !== "Done")?.id ?? null,
    }))
    .filter(
      (p) =>
        (!f.state || p.state === f.state) &&
        (!q || lc([p.id, p.task, p.machineId, name(p.machineId)].join(" ")).includes(q))
    )
    .sort((a, b) => a.nextDue.localeCompare(b.nextDue));
}

export async function getPlan(id: string): Promise<PmPlan | undefined> {
  if (isSupabaseConfigured()) {
    try {
      const supabase = await createClient();
      const { data, error } = await supabase.from("pm_plans").select("*").eq("id", id).single();
      if (!error && data) return mapPlan(data);
    } catch (e) {
      console.error("Error fetching plan from Supabase:", e);
    }
  }
  return db().plans.find((p) => p.id === id);
}

export type PlanInput = Omit<PmPlan, "id" | "active" | "lastDone"> & { lastDone: string };

async function checkPlanRefs(data: PlanInput, exceptId?: string): Promise<FieldErrors> {
  const e: FieldErrors = {};
  if (!(await getMachine(data.machineId))) e.machineId = "ไม่พบเครื่องจักรนี้";
  if (data.technicianId) {
    const tech = await getUser(data.technicianId);
    if (!tech || !tech.active || tech.role === "viewer") e.technicianId = "เลือกช่างที่มีสิทธิ์รับงาน";
  }

  if (data.lastDone && data.lastDone > todayStr()) {
    e.lastDone = "วันที่ทำล่าสุดต้องไม่อยู่ในอนาคต";
  } else if (data.lastDone && data.nextDue <= data.lastDone) {
    e.nextDue = "วันครบกำหนดต้องอยู่หลังวันที่ทำล่าสุด";
  }

  const existing = await listPlans();
  const dup = existing.find(
    (p) => p.active && p.id !== exceptId && p.machineId === data.machineId && lc(p.task) === lc(data.task)
  );
  if (dup) e.task = `เครื่องนี้มีแผนชื่อนี้อยู่แล้ว (${dup.id})`;
  return e;
}

export async function createPlan(actor: Profile, data: PlanInput): Promise<Result> {
  const errors = await checkPlanRefs(data);
  if (Object.keys(errors).length) return fail(errors);

  if (isSupabaseConfigured()) {
    try {
      const supabase = await createClient();
      const { data: existing } = await supabase.from("pm_plans").select("id");
      const id = nextId(existing?.map((x) => x.id) ?? [], "PM", 3);

      const { error } = await supabase.from("pm_plans").insert({
        id,
        machine_id: data.machineId,
        technician_id: data.technicianId || null,
        task: data.task,
        checklist: data.checklist || "",
        interval_days: data.intervalDays,
        last_done: data.lastDone || null,
        next_due: data.nextDue,
        active: true,
      });
      if (error) return fail({ form: error.message });

      await audit(actor, `เพิ่มแผน ${id} ที่ ${data.machineId}`);
      return { ok: true, id };
    } catch (e) {
      console.error("Error creating plan in Supabase:", e);
    }
  }

  const s = db();
  const id = nextId(s.plans.map((p) => p.id), "PM", 3);
  s.plans.push({ id, ...data, lastDone: data.lastDone || null, active: true });
  await audit(actor, `เพิ่มแผน ${id} ที่ ${data.machineId}`);
  return { ok: true, id };
}

export async function updatePlan(actor: Profile, id: string, data: PlanInput): Promise<Result> {
  const p = await getPlan(id);
  if (!p || !p.active) return fail({ form: "ไม่พบแผน PM" });
  const errors = await checkPlanRefs(data, id);
  if (Object.keys(errors).length) return fail(errors);

  if (isSupabaseConfigured()) {
    try {
      const supabase = await createClient();
      const { error } = await supabase
        .from("pm_plans")
        .update({
          machine_id: data.machineId,
          technician_id: data.technicianId || null,
          task: data.task,
          checklist: data.checklist || "",
          interval_days: data.intervalDays,
          last_done: data.lastDone || null,
          next_due: data.nextDue,
        })
        .eq("id", id);
      if (error) return fail({ form: error.message });

      await audit(actor, `แก้ไขแผน ${id}`);
      return { ok: true, id };
    } catch (e) {
      console.error("Error updating plan in Supabase:", e);
    }
  }

  const planInDb = db().plans.find((x) => x.id === id && x.active);
  if (planInDb) {
    Object.assign(planInDb, { ...data, lastDone: data.lastDone || null });
  }
  await audit(actor, `แก้ไขแผน ${id}`);
  return { ok: true, id };
}

export async function deactivatePlan(actor: Profile, id: string): Promise<Result> {
  const p = await getPlan(id);
  if (!p || !p.active) return fail({ form: "ไม่พบแผน PM" });

  if (isSupabaseConfigured()) {
    try {
      const supabase = await createClient();
      const { error } = await supabase.from("pm_plans").update({ active: false }).eq("id", id);
      if (error) return fail({ form: error.message });

      await audit(actor, `ปิดใช้งานแผน ${id}`);
      return { ok: true, id };
    } catch (e) {
      console.error("Error deactivating plan in Supabase:", e);
    }
  }

  const planInDb = db().plans.find((x) => x.id === id && x.active);
  if (planInDb) planInDb.active = false;
  await audit(actor, `ปิดใช้งานแผน ${id}`);
  return { ok: true, id };
}

// ── Audit & dashboard ────────────────────────────────────────────────────────
export async function listAudit(limit = 100): Promise<AuditEntry[]> {
  if (isSupabaseConfigured()) {
    try {
      const supabase = await createClient();
      const { data, error } = await supabase
        .from("audit_log")
        .select("*")
        .order("at", { ascending: false })
        .limit(limit);
      if (!error && data) return data.map(mapAudit);
    } catch (e) {
      console.error("Error fetching audit log from Supabase:", e);
    }
  }
  return db().audit.slice(0, limit);
}

export async function dashboardStats() {
  const [machines, alarms, maintenance, plansRaw] = await Promise.all([
    listMachines(),
    listAlarms(),
    listMaintenance(),
    listPlans(),
  ]);

  const weekAgo = Date.now() - 7 * 864e5;
  const byStatus = Object.fromEntries(
    (["Running", "Stop", "Alarm", "Maintenance"] as const).map((st) => [
      st,
      machines.filter((m) => m.status === st).length,
    ])
  ) as Record<MachineStatus, number>;

  const active = alarms
    .filter((a) => a.status !== "Closed")
    .sort((a, b) => b.occurredAt.localeCompare(a.occurredAt));
  const week = alarms.filter((a) => new Date(a.occurredAt).getTime() > weekAgo);
  const closedWeek = week.filter((a) => a.status === "Closed" && a.closedAt);
  const mttr = closedWeek.length
    ? Math.round(
        closedWeek.reduce(
          (sum, a) => sum + (new Date(a.closedAt!).getTime() - new Date(a.occurredAt).getTime()),
          0
        ) /
          closedWeek.length /
          60000
      )
    : 0;

  const today = todayStr();
  const perDay: { date: string; count: number }[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = plantDate(new Date(Date.now() - i * 864e5));
    perDay.push({ date: d, count: alarms.filter((a) => plantDate(new Date(a.occurredAt)) === d).length });
  }

  const counts: Record<string, number> = {};
  week.forEach((a) => (counts[a.machineId] = (counts[a.machineId] ?? 0) + 1));
  const topMachines = Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([id, count]) => ({
      id,
      count,
      type: machines.find((m) => m.id === id)?.type ?? "",
    }));

  const plans = plansRaw.filter((p) => p.active).map((p) => planState(p, maintenance));

  return {
    totalMachines: machines.length,
    byStatus,
    activeAlarms: active
      .slice(0, 8)
      .map((a) => ({ ...a, machineName: machines.find((m) => m.id === a.machineId)?.name ?? a.machineId })),
    activeAlarmCount: active.length,
    openMaintenance: maintenance.filter((r) => r.status !== "Done").length,
    alarmsWeek: week.length,
    alarmsToday: alarms.filter((a) => plantDate(new Date(a.occurredAt)) === today).length,
    mttrMinutes: mttr,
    perDay,
    topMachines,
    pmOverdue: plans.filter((st) => st === "overdue").length,
    pmSoon: plans.filter((st) => st === "soon").length,
  };
}
