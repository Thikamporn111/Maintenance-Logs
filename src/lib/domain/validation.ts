// Domain validation schemas and helpers shared by UI forms and server actions.
import { z } from "zod";
import {
  ALARM_STATUS,
  LOCATIONS,
  MACHINE_STATUS,
  MACHINE_TYPES,
  MNT_STATUS,
  MNT_TYPES,
  PM_INTERVALS,
} from "./types";
import { todayStr } from "./pm";
import { parsePlantDateTime } from "./time";

export type FieldErrors = Record<string, string>;
export type FormState = { errors?: FieldErrors; values?: Record<string, string>; message?: string };

export const MACHINE_ID_RE = /^M-\d{3}$/;
export const ALARM_ID_RE = /^ALM-\d{4}$/;
export const MNT_ID_RE = /^MNT-\d{4}$/;
export const PLAN_ID_RE = /^PM-\d{3}$/;
const ALARM_CODE_RE = /^E-\d{3}$/;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

const text = (min: number, max: number, requiredMsg: string, lengthMsg: string) =>
  z.string().trim().min(1, requiredMsg).min(min, lengthMsg).max(max, lengthMsg);
const optionalText = (max: number) => z.string().trim().max(max, `ยาวได้ไม่เกิน ${max} ตัวอักษร`).default("");
const upper = (s: unknown) => (typeof s === "string" ? s.trim().toUpperCase() : s);
const isValidDateTime = (s: string) => !Number.isNaN(parsePlantDateTime(s).getTime());
const isValidDate = (s: string) => DATE_RE.test(s) && isValidDateTime(`${s}T00:00`);

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().min(1, "กรอกอีเมล").max(200).email("รูปแบบอีเมลไม่ถูกต้อง"),
  password: z.string().min(1, "กรอกรหัสผ่าน").max(200),
});

export const signupSchema = z.object({
  name: text(2, 60, "กรอกชื่อ-นามสกุล", "ชื่อต้องยาว 2–60 ตัวอักษร"),
  email: z.string().trim().toLowerCase().min(1, "กรอกอีเมล").max(200).email("รูปแบบอีเมลไม่ถูกต้อง"),
  password: z.string().min(6, "รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร").max(200),
});

export const userCreateSchema = z.object({
  name: text(2, 60, "กรอกชื่อ-นามสกุล", "ชื่อต้องยาว 2–60 ตัวอักษร"),
  email: z.string().trim().toLowerCase().min(1, "กรอกอีเมล").max(200).email("รูปแบบอีเมลไม่ถูกต้อง"),
  role: z.string().trim().min(2, "เลือก Role ที่ถูกต้อง").max(30).regex(/^[a-z0-9_-]+$/, "รูปแบบ Role ไม่ถูกต้อง"),
  password: z.string().trim().optional().refine((p) => !p || p.length >= 6, "รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร"),
});

export const userUpdateSchema = z.object({
  name: text(2, 60, "กรอกชื่อ-นามสกุล", "ชื่อต้องยาว 2–60 ตัวอักษร"),
  email: z.string().trim().toLowerCase().min(1, "กรอกอีเมล").max(200).email("รูปแบบอีเมลไม่ถูกต้อง"),
  role: z.string().trim().min(2, "เลือก Role ที่ถูกต้อง").max(30).regex(/^[a-z0-9_-]+$/, "รูปแบบ Role ไม่ถูกต้อง"),
  password: z.string().trim().optional().refine((p) => !p || p.length >= 6, "รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร"),
  active: z.preprocess((v) => v === "true" || v === true, z.boolean()),
});

export const VALID_PAGE_IDS = [
  "dashboard",
  "machines",
  "alarms",
  "maintenance",
  "plan",
  "users",
  "audit",
] as const;

export const VALID_PERMISSION_IDS = [
  "machine:write",
  "alarm:create",
  "alarm:update",
  "maintenance:write",
  "plan:write",
  "plan:issue",
  "users:manage",
  "audit:read",
] as const;

export const roleCreateSchema = z.object({
  id: z
    .string()
    .trim()
    .toLowerCase()
    .min(2, "รหัส Role ต้องมีอย่างน้อย 2 ตัวอักษร")
    .max(30, "รหัส Role ต้องไม่เกิน 30 ตัวอักษร")
    .regex(/^[a-z0-9_-]+$/, "รหัส Role ใช้ได้เฉพาะตัวอักษรภาษาอังกฤษพิมพ์เล็ก ตัวเลข ขีด (-) หรือขีดล่าง (_)"),
  label: text(2, 60, "กรอกชื่อ Role", "ชื่อ Role ต้องยาว 2–60 ตัวอักษร"),
  description: optionalText(300),
  pages: z.array(z.enum(VALID_PAGE_IDS, { error: "หน้าที่ระบุไม่ถูกต้อง" })).default([]),
  permissions: z.array(z.enum(VALID_PERMISSION_IDS, { error: "สิทธิ์ที่ระบุไม่ถูกต้อง" })).default([]),
});

export const roleUpdateSchema = z.object({
  label: text(2, 60, "กรอกชื่อ Role", "ชื่อ Role ต้องยาว 2–60 ตัวอักษร"),
  description: optionalText(300),
  pages: z.array(z.enum(VALID_PAGE_IDS, { error: "หน้าที่ระบุไม่ถูกต้อง" })).default([]),
  permissions: z.array(z.enum(VALID_PERMISSION_IDS, { error: "สิทธิ์ที่ระบุไม่ถูกต้อง" })).default([]),
});

export const machineSchema = z.object({
  id: z.preprocess(upper, z.string().min(1, "กรอก Machine ID").regex(MACHINE_ID_RE, "ใช้รูปแบบ M-000 เช่น M-011")),
  name: text(3, 60, "กรอกชื่อเครื่อง", "ชื่อเครื่องต้องยาว 3–60 ตัวอักษร"),
  type: z.enum(MACHINE_TYPES, { error: "เลือกประเภทเครื่อง" }),
  location: z.enum(LOCATIONS, { error: "เลือก Location" }),
  status: z.enum(MACHINE_STATUS, { error: "เลือกสถานะที่ระบบรองรับ" }),
});

export const alarmCreateSchema = z.object({
  machineId: z.string().regex(MACHINE_ID_RE, "เลือกเครื่องจักรที่เกิด Alarm"),
  code: z.preprocess(upper, z.string().min(1, "กรอก Alarm Code").regex(ALARM_CODE_RE, "ใช้รูปแบบ E-000 เช่น E-201")),
  description: text(4, 200, "กรอกรายละเอียด Alarm", "รายละเอียดต้องยาว 4–200 ตัวอักษร"),
  occurredAt: z
    .string()
    .min(1, "ระบุวันที่และเวลาที่เกิด")
    .refine(isValidDateTime, "วันที่/เวลาไม่ถูกต้อง")
    .refine((s) => parsePlantDateTime(s).getTime() <= Date.now() + 60_000, "เวลาเกิดต้องไม่อยู่ในอนาคต"),
  cause: optionalText(500),
});

export const alarmUpdateSchema = z
  .object({
    status: z.enum(ALARM_STATUS, { error: "เลือกสถานะ" }),
    cause: optionalText(500),
    action: optionalText(500),
  })
  .superRefine((v, ctx) => {
    if (v.status !== "Closed") return;
    if (!v.cause) ctx.addIssue({ code: "custom", path: ["cause"], message: "ต้องระบุสาเหตุก่อนปิด Alarm" });
    if (!v.action) ctx.addIssue({ code: "custom", path: ["action"], message: "ต้องบันทึก Action Taken ก่อนเปลี่ยนเป็น Closed" });
  });

export const maintenanceSchema = z
  .object({
    machineId: z.string().regex(MACHINE_ID_RE, "เลือกเครื่องจักร"),
    technicianId: z.string().trim().min(1, "เลือกช่างผู้รับผิดชอบ").max(64),
    type: z.enum(MNT_TYPES, { error: "เลือกประเภทงาน" }),
    date: z.string().min(1, "ระบุวันที่").refine(isValidDateTime, "วันที่ไม่ถูกต้อง"),
    status: z.enum(MNT_STATUS, { error: "เลือกสถานะงาน" }),
    alarmId: z.string().trim().refine((s) => s === "" || ALARM_ID_RE.test(s), "เลขที่ Alarm ไม่ถูกต้อง").default(""),
    planId: z.string().trim().refine((s) => s === "" || PLAN_ID_RE.test(s), "เลขที่แผนไม่ถูกต้อง").default(""),
    problem: text(3, 1000, "อธิบายปัญหาที่พบ", "ปัญหาต้องยาว 3–1000 ตัวอักษร"),
    action: optionalText(1000),
  })
  .superRefine((v, ctx) => {
    if (v.status === "Done" && !v.action) ctx.addIssue({ code: "custom", path: ["action"], message: "ต้องบันทึกการแก้ไขก่อนปิดงาน" });
    if (v.status === "Waiting Part" && !v.action) ctx.addIssue({ code: "custom", path: ["action"], message: "ระบุอะไหล่ที่รอ เช่น Vacuum cup x4" });
  });

export const planSchema = z
  .object({
    machineId: z.string().regex(MACHINE_ID_RE, "เลือกเครื่องจักร"),
    technicianId: z.string().trim().min(1, "เลือกช่างผู้รับผิดชอบ").max(64),
    task: text(4, 80, "กรอกชื่องาน PM", "ชื่องานต้องยาว 4–80 ตัวอักษร"),
    intervalDays: z.coerce.number().refine((n) => (PM_INTERVALS as readonly number[]).includes(n), "เลือกความถี่"),
    nextDue: z.string().refine(isValidDate, "ระบุวันครบกำหนด"),
    lastDone: z.string().trim().refine((s) => s === "" || isValidDate(s), "วันที่ไม่ถูกต้อง").default(""),
    checklist: optionalText(1000),
  })
  .superRefine((v, ctx) => {
    if (v.lastDone && v.lastDone > todayStr()) ctx.addIssue({ code: "custom", path: ["lastDone"], message: "วันที่ทำล่าสุดต้องไม่อยู่ในอนาคต" });
    else if (v.lastDone && v.nextDue <= v.lastDone) ctx.addIssue({ code: "custom", path: ["nextDue"], message: "วันครบกำหนดต้องอยู่หลังวันที่ทำล่าสุด" });
  });

/** First error message per field. */
export function fieldErrors(error: z.ZodError): FieldErrors {
  const out: FieldErrors = {};
  for (const issue of error.issues) {
    const key = String(issue.path[0] ?? "form");
    if (!out[key]) out[key] = issue.message;
  }
  return out;
}

/** Plain string values from a form; files and unknown keys are ignored. */
export function formValues(formData: FormData, keys: readonly string[]): Record<string, string> {
  const out: Record<string, string> = {};
  for (const k of keys) {
    const v = formData.get(k);
    out[k] = typeof v === "string" ? v : "";
  }
  return out;
}

/** Keep a query-string value only if it is one of the allowed options. */
export function pick<T extends string>(value: unknown, allowed: readonly T[]): T | "" {
  return typeof value === "string" && (allowed as readonly string[]).includes(value) ? (value as T) : "";
}

export function queryText(value: unknown, max = 100): string {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}
