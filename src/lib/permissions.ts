// Role-based access control. Every server action and page checks these on the server;
// hiding a button in the UI is only a convenience, never the enforcement.
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

const PERMISSIONS: Record<Role, readonly Permission[]> = {
  admin: ["machine:write", "alarm:create", "alarm:update", "maintenance:write", "plan:write", "plan:issue", "users:manage", "audit:read"],
  technician: ["alarm:create", "alarm:update", "maintenance:write", "plan:issue"],
  viewer: [],
};

const PAGES: Record<Role, readonly Page[]> = {
  admin: ["dashboard", "machines", "alarms", "maintenance", "plan", "users", "audit"],
  technician: ["dashboard", "machines", "alarms", "maintenance", "plan"],
  viewer: ["dashboard"],
};

export const ROLE_LABEL: Record<Role, string> = { admin: "Admin", technician: "Technician", viewer: "Viewer" };

export function can(role: Role, permission: Permission): boolean {
  return PERMISSIONS[role].includes(permission);
}

export function canView(role: Role, page: Page): boolean {
  return PAGES[role].includes(page);
}

export function pagesFor(role: Role): readonly Page[] {
  return PAGES[role];
}
