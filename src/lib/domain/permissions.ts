// Role-based access control domain rules.
import type { Role } from "./types";

export type Permission =
  | "machine:write"
  | "alarm:create"
  | "alarm:update"
  | "maintenance:write"
  | "plan:write"
  | "plan:issue"
  | "users:manage"
  | "audit:read";

export type Page = "dashboard" | "machines" | "alarms" | "maintenance" | "plan" | "users" | "audit";

export interface RoleDefinition {
  id: string; // e.g. "admin", "technician", "viewer", "supervisor"
  label: string; // e.g. "Admin", "Technician", "Supervisor"
  description: string;
  pages: Page[];
  permissions: Permission[];
  isSystem?: boolean;
}

export interface PageMeta {
  id: Page;
  labelTh: string;
  labelEn: string;
  descTh: string;
  descEn: string;
}

export interface PermissionMeta {
  id: Permission;
  labelTh: string;
  labelEn: string;
  descTh: string;
  descEn: string;
}

export const ALL_PAGES: readonly PageMeta[] = [
  { id: "dashboard", labelTh: "Dashboard", labelEn: "Dashboard", descTh: "หน้าแดชบอร์ดภาพรวมและสถิติ", descEn: "Overview and statistics dashboard" },
  { id: "machines", labelTh: "เครื่องจักร (Machines)", labelEn: "Machines", descTh: "รายการเครื่องจักรและสถานะ", descEn: "Machine list and status" },
  { id: "alarms", labelTh: "สัญญาณเตือน (Alarms)", labelEn: "Alarms", descTh: "ประวัติและการแจ้งเตือนเครื่องจักร", descEn: "Alarm history and alerts" },
  { id: "maintenance", labelTh: "งานซ่อมบำรุง (Maintenance)", labelEn: "Maintenance", descTh: "ใบงานซ่อมและประวัติการแก้ไข", descEn: "Work orders and repair history" },
  { id: "plan", labelTh: "แผนบำรุงรักษา (PM)", labelEn: "PM Plans", descTh: "แผนการบำรุงรักษาเชิงป้องกัน", descEn: "Preventive maintenance plans" },
  { id: "users", labelTh: "ผู้ใช้งาน & สิทธิ์ (Users & Roles)", labelEn: "Users & Roles", descTh: "จัดการบัญชีผู้ใช้และกำหนดสิทธิ์ Role", descEn: "Manage user accounts and role permissions" },
  { id: "audit", labelTh: "ประวัติการทำงาน (Audit Log)", labelEn: "Audit Log", descTh: "บันทึกการกระทำในระบบ", descEn: "System audit logs" },
];

export const ALL_PERMISSIONS: readonly PermissionMeta[] = [
  { id: "machine:write", labelTh: "จัดการเครื่องจักร", labelEn: "Manage Machines", descTh: "เพิ่ม/แก้ไขข้อมูลเครื่องจักร", descEn: "Create and edit machine info" },
  { id: "alarm:create", labelTh: "สร้าง Alarm", labelEn: "Create Alarm", descTh: "แจ้งเตือนปัญหาหรือความผิดปกติ", descEn: "Log new alarms and issues" },
  { id: "alarm:update", labelTh: "รับงาน/ปิด Alarm", labelEn: "Update/Close Alarm", descTh: "รับมอบหมายและบันทึกการแก้ไขปัญหา", descEn: "Assign and resolve alarms" },
  { id: "maintenance:write", labelTh: "จัดการใบแจ้งซ่อม", labelEn: "Manage Work Orders", descTh: "สร้างและแก้ไขใบงานบำรุงรักษา", descEn: "Create and update maintenance records" },
  { id: "plan:write", labelTh: "จัดการแผน PM", labelEn: "Manage PM Plans", descTh: "สร้างและแก้ไขแผนงานบำรุงรักษาเชิงป้องกัน", descEn: "Create and edit PM plans" },
  { id: "plan:issue", labelTh: "ออกใบงานตามแผน PM", labelEn: "Issue PM Work Order", descTh: "สร้างใบงานซ่อมบำรุงจากแผน PM", descEn: "Generate work order from PM plan" },
  { id: "users:manage", labelTh: "จัดการผู้ใช้ & สิทธิ์", labelEn: "Manage Users & Roles", descTh: "เพิ่ม/แก้ไข/ลบผู้ใช้และกำหนดสิทธิ์ของแต่ละ Role", descEn: "Manage user accounts and edit roles/permissions" },
  { id: "audit:read", labelTh: "ดู Audit Log", labelEn: "View Audit Log", descTh: "เข้าถึงและตรวจสอบบันทึกการทำงานในระบบ", descEn: "Access and review system audit log" },
];

export const DEFAULT_ROLE_DEFINITIONS: readonly RoleDefinition[] = [
  {
    id: "admin",
    label: "Admin",
    description: "ผู้ดูแลระบบ สามารถเข้าถึงและจัดการได้ทุกเมนู",
    pages: ["dashboard", "machines", "alarms", "maintenance", "plan", "users", "audit"],
    permissions: [
      "machine:write",
      "alarm:create",
      "alarm:update",
      "maintenance:write",
      "plan:write",
      "plan:issue",
      "users:manage",
      "audit:read",
    ],
    isSystem: true,
  },
  {
    id: "technician",
    label: "Technician",
    description: "ช่างซ่อมบำรุง จัดการเครื่องจักร Alarm งานซ่อม และใบงาน PM",
    pages: ["dashboard", "machines", "alarms", "maintenance", "plan"],
    permissions: ["alarm:create", "alarm:update", "maintenance:write", "plan:issue"],
    isSystem: false,
  },
  {
    id: "viewer",
    label: "Viewer",
    description: "ผู้ดูข้อมูล ดูแดชบอร์ดอย่างเดียว",
    pages: ["dashboard"],
    permissions: [],
    isSystem: false,
  },
];

export const ROLE_LABEL: Record<string, string> = {
  admin: "Admin",
  technician: "Technician",
  viewer: "Viewer",
};

export function getRoleLabel(roleId: string, dynamicRoles?: RoleDefinition[]): string {
  if (dynamicRoles && dynamicRoles.length > 0) {
    const found = dynamicRoles.find((r) => r.id === roleId);
    if (found?.label) return found.label;
  }
  return ROLE_LABEL[roleId] ?? (roleId.charAt(0).toUpperCase() + roleId.slice(1));
}

export function can(role: Role, permission: Permission, dynamicRoles?: RoleDefinition[]): boolean {
  if (dynamicRoles && dynamicRoles.length > 0) {
    const found = dynamicRoles.find((r) => r.id === role);
    if (found) return found.permissions.includes(permission);
  }
  const fallback = DEFAULT_ROLE_DEFINITIONS.find((r) => r.id === role);
  return fallback ? fallback.permissions.includes(permission) : false;
}

export function canView(role: Role, page: Page, dynamicRoles?: RoleDefinition[]): boolean {
  if (dynamicRoles && dynamicRoles.length > 0) {
    const found = dynamicRoles.find((r) => r.id === role);
    if (found) return found.pages.includes(page);
  }
  const fallback = DEFAULT_ROLE_DEFINITIONS.find((r) => r.id === role);
  return fallback ? fallback.pages.includes(page) : false;
}

export function pagesFor(role: Role, dynamicRoles?: RoleDefinition[]): readonly Page[] {
  if (dynamicRoles && dynamicRoles.length > 0) {
    const found = dynamicRoles.find((r) => r.id === role);
    if (found) return found.pages;
  }
  const fallback = DEFAULT_ROLE_DEFINITIONS.find((r) => r.id === role);
  return fallback ? fallback.pages : [];
}
