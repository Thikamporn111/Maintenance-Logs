// ─────────────────────────────────────────────────────────────────────────────
// MOCK DATA LAYER (in-memory). Replace the body of each function with Supabase
// queries — the pages and server actions only call these functions, so nothing
// else needs to change. See docs/supabase-handoff.md.
//
// Rules implemented here (status sync, audit, FK restrict, PM advance) should
// move to Postgres constraints/triggers + RLS so no client can bypass them.
// Data resets when the server restarts and is not shared between Vercel instances.
// ─────────────────────────────────────────────────────────────────────────────
import "server-only";
import { createSeed, type Seed } from "./seed";
import type {
  Alarm, AlarmStatus, AuditEntry, Machine, MachineStatus, MaintenanceRecord, MaintenanceStatus, MaintenanceType, PmPlan, Profile, Role,
} from "../types";
import { advancePlan, planState, todayStr, type PlanState } from "../pm";
import { parsePlantDateTime, plantDate } from "../time";
import type { FieldErrors } from "../validation";

const g = globalThis as unknown as { __maintenanceLogsStore?: Seed };
const db = (): Seed => (g.__maintenanceLogsStore ??= createSeed());

export type Result = { ok: true; id: string } | { ok: false; errors: FieldErrors };
const fail = (errors: FieldErrors): Result => ({ ok: false, errors });

function nextId(ids: string[], prefix: string, width: number): string {
  const n = ids.reduce((mx, id) => Math.max(mx, parseInt(id.split("-")[1], 10) || 0), 0) + 1;
  return `${prefix}-${String(n).padStart(width, "0")}`;
}
function audit(actor: Profile, text: string) {
  db().audit.unshift({ at: new Date().toISOString(), userId: actor.id, text });
}
const lc = (s: string) => s.toLowerCase();

// ── Users / profiles ─────────────────────────────────────────────────────────
export async function listUsers(): Promise<Profile[]> {
  return db().users;
}
export async function getUser(id: string): Promise<Profile | undefined> {
  return db().users.find((u) => u.id === id);
}
export async function findUserByEmail(email: string): Promise<Profile | undefined> {
  return db().users.find((u) => u.email === lc(email));
}
export async function setUserRole(actor: Profile, id: string, role: Role): Promise<Result> {
  const u = db().users.find((x) => x.id === id);
  if (!u) return fail({ form: "ไม่พบผู้ใช้" });
  if (u.id === actor.id) return fail({ form: "เปลี่ยน Role ของตัวเองไม่ได้ เพื่อกันการล็อกตัวเองออกจากระบบ" });
  const prev = u.role;
  u.role = role;
  audit(actor, `เปลี่ยน Role ของ ${u.email} จาก ${prev} เป็น ${role}`);
  return { ok: true, id };
}
export async function setUserActive(actor: Profile, id: string, active: boolean): Promise<Result> {
  const u = db().users.find((x) => x.id === id);
  if (!u) return fail({ form: "ไม่พบผู้ใช้" });
  if (u.id === actor.id) return fail({ form: "ปิดการใช้งานบัญชีตัวเองไม่ได้" });
  u.active = active;
  audit(actor, `${active ? "เปิด" : "ปิด"}การใช้งานบัญชี ${u.email}`);
  return { ok: true, id };
}

// ── Machines ─────────────────────────────────────────────────────────────────
export type MachineFilter = { q?: string; status?: string; type?: string };
export async function listMachines(f: MachineFilter = {}): Promise<Machine[]> {
  const q = lc(f.q ?? "");
  return db().machines
    .filter((m) => (!q || lc(m.id).includes(q) || lc(m.name).includes(q)) && (!f.status || m.status === f.status) && (!f.type || m.type === f.type))
    .sort((a, b) => a.id.localeCompare(b.id));
}
export async function getMachine(id: string): Promise<Machine | undefined> {
  return db().machines.find((m) => m.id === id);
}
export async function createMachine(actor: Profile, data: Machine): Promise<Result> {
  if (db().machines.some((m) => m.id === data.id)) return fail({ id: `Machine ID already exists: มี ${data.id} อยู่แล้ว` });
  db().machines.push({ ...data });
  audit(actor, `เพิ่มเครื่อง ${data.id}`);
  return { ok: true, id: data.id };
}
export async function updateMachine(actor: Profile, id: string, data: Omit<Machine, "id">): Promise<Result> {
  const m = db().machines.find((x) => x.id === id);
  if (!m) return fail({ form: "ไม่พบเครื่องจักร" });
  Object.assign(m, data);
  audit(actor, `แก้ไขข้อมูลเครื่อง ${id}`);
  return { ok: true, id };
}
export async function machineReferences(id: string) {
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
    return fail({ form: `ลบ ${id} ไม่ได้ เพราะมี Alarm ${refs.alarms} รายการ งานซ่อม ${refs.maintenance} งาน และแผน PM ${refs.plans} แผนอ้างอิงอยู่ ให้เปลี่ยนสถานะเป็น Stop แทน` });
  }
  const s = db();
  const before = s.machines.length;
  s.machines = s.machines.filter((m) => m.id !== id);
  if (s.machines.length === before) return fail({ form: "ไม่พบเครื่องจักร" });
  audit(actor, `ลบเครื่อง ${id}`);
  return { ok: true, id };
}

// ── Alarms ───────────────────────────────────────────────────────────────────
export type AlarmFilter = { q?: string; status?: string; machineId?: string; from?: string; to?: string };
export async function listAlarms(f: AlarmFilter = {}): Promise<Alarm[]> {
  const q = lc(f.q ?? "");
  const from = f.from ? parsePlantDateTime(`${f.from}T00:00`) : null;
  const to = f.to ? parsePlantDateTime(`${f.to}T23:59:59`) : null;
  return db().alarms
    .filter((a) => {
      const t = new Date(a.occurredAt);
      return (!q || lc(a.code).includes(q) || lc(a.description).includes(q) || lc(a.id).includes(q)) &&
        (!f.status || a.status === f.status) && (!f.machineId || a.machineId === f.machineId) &&
        (!from || t >= from) && (!to || t <= to);
    })
    .sort((a, b) => b.occurredAt.localeCompare(a.occurredAt));
}
export async function getAlarm(id: string): Promise<Alarm | undefined> {
  return db().alarms.find((a) => a.id === id);
}
export async function activeAlarms(machineId?: string): Promise<Alarm[]> {
  return db().alarms.filter((a) => a.status !== "Closed" && (!machineId || a.machineId === machineId));
}
export async function createAlarm(actor: Profile, data: { machineId: string; code: string; description: string; occurredAt: string; cause: string }): Promise<Result> {
  const m = await getMachine(data.machineId);
  if (!m) return fail({ machineId: "ไม่พบเครื่องจักรนี้ใน Machine Master" });
  const s = db();
  const id = nextId(s.alarms.map((a) => a.id), "ALM", 4);
  const occurredAt = parsePlantDateTime(data.occurredAt).toISOString();
  s.alarms.push({ id, ...data, occurredAt, action: "", status: "Open", assigneeId: null, closedAt: null, closedBy: null, updatedAt: new Date().toISOString() });
  if (m.status !== "Maintenance") m.status = "Alarm";
  audit(actor, `บันทึก ${id} (${data.code}) ที่ ${data.machineId}`);
  return { ok: true, id };
}
export async function updateAlarm(actor: Profile, id: string, data: { status: AlarmStatus; cause: string; action: string }): Promise<Result> {
  const a = db().alarms.find((x) => x.id === id);
  if (!a) return fail({ form: "ไม่พบ Alarm" });
  if (a.status === "Closed") return fail({ form: "Alarm นี้ปิดไปแล้ว แก้ไขไม่ได้" });
  const prev = a.status;
  const now = new Date().toISOString();
  Object.assign(a, { status: data.status, cause: data.cause, action: data.action, updatedAt: now });
  if (data.status === "In Progress" && !a.assigneeId) a.assigneeId = actor.id;
  if (data.status === "Closed") {
    a.closedAt = now;
    a.closedBy = actor.id;
    const m = await getMachine(a.machineId);
    if (m?.status === "Alarm" && !(await activeAlarms(a.machineId)).length) m.status = "Running";
  }
  audit(actor, prev !== data.status ? `เปลี่ยน ${id} จาก ${prev} เป็น ${data.status}` : `แก้ไขรายละเอียด ${id}`);
  return { ok: true, id };
}

// ── Maintenance records ──────────────────────────────────────────────────────
export type MaintenanceFilter = { q?: string; status?: string; technicianId?: string; type?: string };
export async function listMaintenance(f: MaintenanceFilter = {}): Promise<MaintenanceRecord[]> {
  const q = lc(f.q ?? "");
  const s = db();
  const name = (id: string) => s.machines.find((m) => m.id === id)?.name ?? "";
  return s.maintenance
    .filter((r) =>
      (!q || lc([r.id, r.problem, r.action, r.machineId, name(r.machineId)].join(" ")).includes(q)) &&
      (!f.status || r.status === f.status) && (!f.technicianId || r.technicianId === f.technicianId) && (!f.type || r.type === f.type))
    .sort((a, b) => b.date.localeCompare(a.date));
}
export async function getMaintenance(id: string): Promise<MaintenanceRecord | undefined> {
  return db().maintenance.find((r) => r.id === id);
}
export type MaintenanceInput = {
  machineId: string; technicianId: string; type: MaintenanceType; date: string; status: MaintenanceStatus;
  alarmId: string; planId: string; problem: string; action: string;
};
async function checkMaintenanceRefs(data: MaintenanceInput): Promise<FieldErrors> {
  const e: FieldErrors = {};
  if (!(await getMachine(data.machineId))) e.machineId = "ไม่พบเครื่องจักรนี้";
  const tech = await getUser(data.technicianId);
  if (!tech || !tech.active || tech.role === "viewer") e.technicianId = "เลือกช่างที่มีสิทธิ์รับงาน";
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
  const s = db();
  const id = nextId(s.maintenance.map((r) => r.id), "MNT", 4);
  const rec: MaintenanceRecord = { id, ...data, date: parsePlantDateTime(data.date).toISOString(), alarmId: data.alarmId || null, planId: data.planId || null };
  s.maintenance.push(rec);
  audit(actor, `สร้างงานซ่อม ${id} ที่ ${data.machineId}`);
  syncAfterMaintenance(actor, rec, false);
  return { ok: true, id };
}
export async function updateMaintenance(actor: Profile, id: string, data: MaintenanceInput): Promise<Result> {
  const r = db().maintenance.find((x) => x.id === id);
  if (!r) return fail({ form: "ไม่พบงานซ่อม" });
  const errors = await checkMaintenanceRefs(data);
  if (Object.keys(errors).length) return fail(errors);
  const wasDone = r.status === "Done";
  const prev = r.status;
  Object.assign(r, { ...data, date: parsePlantDateTime(data.date).toISOString(), alarmId: data.alarmId || null, planId: data.planId || null });
  audit(actor, prev !== r.status ? `เปลี่ยนสถานะ ${id} เป็น ${r.status}` : `แก้ไขงานซ่อม ${id}`);
  syncAfterMaintenance(actor, r, wasDone);
  return { ok: true, id };
}

// ── PM plans ─────────────────────────────────────────────────────────────────
export type PlanWithState = PmPlan & { state: PlanState; workOrderId: string | null };
export async function listPlans(f: { q?: string; state?: string } = {}): Promise<PlanWithState[]> {
  const s = db();
  const q = lc(f.q ?? "");
  const name = (id: string) => s.machines.find((m) => m.id === id)?.name ?? "";
  return s.plans
    .filter((p) => p.active)
    .map((p) => ({ ...p, state: planState(p, s.maintenance), workOrderId: s.maintenance.find((r) => r.planId === p.id && r.status !== "Done")?.id ?? null }))
    .filter((p) => (!f.state || p.state === f.state) && (!q || lc([p.id, p.task, p.machineId, name(p.machineId)].join(" ")).includes(q)))
    .sort((a, b) => a.nextDue.localeCompare(b.nextDue));
}
export async function getPlan(id: string): Promise<PmPlan | undefined> {
  return db().plans.find((p) => p.id === id);
}
export type PlanInput = Omit<PmPlan, "id" | "active" | "lastDone"> & { lastDone: string };
function duplicatePlan(data: PlanInput, exceptId?: string) {
  return db().plans.find((p) => p.active && p.id !== exceptId && p.machineId === data.machineId && lc(p.task) === lc(data.task));
}
async function checkPlanRefs(data: PlanInput, exceptId?: string): Promise<FieldErrors> {
  const e: FieldErrors = {};
  if (!(await getMachine(data.machineId))) e.machineId = "ไม่พบเครื่องจักรนี้";
  const tech = await getUser(data.technicianId);
  if (!tech || !tech.active || tech.role === "viewer") e.technicianId = "เลือกช่างที่มีสิทธิ์รับงาน";
  const dup = duplicatePlan(data, exceptId);
  if (dup) e.task = `เครื่องนี้มีแผนชื่อนี้อยู่แล้ว (${dup.id})`;
  return e;
}
export async function createPlan(actor: Profile, data: PlanInput): Promise<Result> {
  const errors = await checkPlanRefs(data);
  if (Object.keys(errors).length) return fail(errors);
  const s = db();
  const id = nextId(s.plans.map((p) => p.id), "PM", 3);
  s.plans.push({ id, ...data, lastDone: data.lastDone || null, active: true });
  audit(actor, `เพิ่มแผน ${id} ที่ ${data.machineId}`);
  return { ok: true, id };
}
export async function updatePlan(actor: Profile, id: string, data: PlanInput): Promise<Result> {
  const p = db().plans.find((x) => x.id === id && x.active);
  if (!p) return fail({ form: "ไม่พบแผน PM" });
  const errors = await checkPlanRefs(data, id);
  if (Object.keys(errors).length) return fail(errors);
  Object.assign(p, { ...data, lastDone: data.lastDone || null });
  audit(actor, `แก้ไขแผน ${id}`);
  return { ok: true, id };
}
export async function deactivatePlan(actor: Profile, id: string): Promise<Result> {
  const p = db().plans.find((x) => x.id === id && x.active);
  if (!p) return fail({ form: "ไม่พบแผน PM" });
  p.active = false;
  audit(actor, `ปิดใช้งานแผน ${id}`);
  return { ok: true, id };
}

// ── Audit & dashboard ────────────────────────────────────────────────────────
export async function listAudit(limit = 100): Promise<AuditEntry[]> {
  return db().audit.slice(0, limit);
}

export async function dashboardStats() {
  const s = db();
  const weekAgo = Date.now() - 7 * 864e5;
  const byStatus = Object.fromEntries((["Running", "Stop", "Alarm", "Maintenance"] as const).map((st) => [st, s.machines.filter((m) => m.status === st).length])) as Record<MachineStatus, number>;
  const active = s.alarms.filter((a) => a.status !== "Closed").sort((a, b) => b.occurredAt.localeCompare(a.occurredAt));
  const week = s.alarms.filter((a) => new Date(a.occurredAt).getTime() > weekAgo);
  const closedWeek = week.filter((a) => a.status === "Closed" && a.closedAt);
  const mttr = closedWeek.length
    ? Math.round(closedWeek.reduce((sum, a) => sum + (new Date(a.closedAt!).getTime() - new Date(a.occurredAt).getTime()), 0) / closedWeek.length / 60000)
    : 0;
  const today = todayStr();
  const perDay: { date: string; count: number }[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = plantDate(new Date(Date.now() - i * 864e5));
    perDay.push({ date: d, count: s.alarms.filter((a) => plantDate(new Date(a.occurredAt)) === d).length });
  }
  const counts: Record<string, number> = {};
  week.forEach((a) => (counts[a.machineId] = (counts[a.machineId] ?? 0) + 1));
  const topMachines = Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 5)
    .map(([id, count]) => ({ id, count, type: s.machines.find((m) => m.id === id)?.type ?? "" }));
  const plans = s.plans.filter((p) => p.active).map((p) => planState(p, s.maintenance));
  return {
    totalMachines: s.machines.length,
    byStatus,
    activeAlarms: active.slice(0, 8).map((a) => ({ ...a, machineName: s.machines.find((m) => m.id === a.machineId)?.name ?? a.machineId })),
    activeAlarmCount: active.length,
    openMaintenance: s.maintenance.filter((r) => r.status !== "Done").length,
    alarmsWeek: week.length,
    alarmsToday: s.alarms.filter((a) => plantDate(new Date(a.occurredAt)) === today).length,
    mttrMinutes: mttr,
    perDay,
    topMachines,
    pmOverdue: plans.filter((st) => st === "overdue").length,
    pmSoon: plans.filter((st) => st === "soon").length,
  };
}
