export const SYSTEM_ROLES = ["admin", "technician", "viewer"] as const;
export const ROLES = SYSTEM_ROLES;
export type SystemRole = (typeof SYSTEM_ROLES)[number];
export type Role = (typeof SYSTEM_ROLES)[number] | (string & {});

export type { RoleDefinition, Page, Permission } from "./permissions";

export const MACHINE_STATUS = ["Running", "Stop", "Alarm", "Maintenance"] as const;
export type MachineStatus = (typeof MACHINE_STATUS)[number];

export const ALARM_STATUS = ["Open", "In Progress", "Closed"] as const;
export type AlarmStatus = (typeof ALARM_STATUS)[number];

export const MNT_STATUS = ["Open", "In Progress", "Waiting Part", "Done"] as const;
export type MaintenanceStatus = (typeof MNT_STATUS)[number];

export const MNT_TYPES = ["Corrective", "Preventive"] as const;
export type MaintenanceType = (typeof MNT_TYPES)[number];

export const MACHINE_TYPES = [
  "CNC",
  "Conveyor",
  "Robot",
  "Press",
  "Injection Molding",
  "Packaging",
  "Compressor",
  "Chiller",
] as const;
export const LOCATIONS = ["Line A", "Line B", "Line C", "Utility"] as const;

export const PM_INTERVALS = [7, 14, 30, 90, 180, 365] as const;

/** User profile entity */
export interface Profile {
  id: string;
  name: string;
  email: string;
  role: Role;
  active: boolean;
  provider?: "google" | "local";
}

/** Machine entity */
export interface Machine {
  id: string; // M-000
  name: string;
  type: string;
  location: string;
  status: MachineStatus;
}

/** Alarm log entity */
export interface Alarm {
  id: string; // ALM-0000
  machineId: string;
  code: string; // E-000
  description: string;
  occurredAt: string; // ISO timestamp
  cause: string;
  action: string;
  status: AlarmStatus;
  assigneeId: string | null;
  closedAt: string | null;
  closedBy: string | null;
  updatedAt: string;
}

/** Maintenance work order entity */
export interface MaintenanceRecord {
  id: string; // MNT-0000
  machineId: string;
  technicianId: string;
  type: MaintenanceType;
  problem: string;
  action: string;
  date: string; // ISO timestamp
  status: MaintenanceStatus;
  alarmId: string | null;
  planId: string | null;
}

/** Preventive Maintenance Plan entity */
export interface PmPlan {
  id: string; // PM-000
  machineId: string;
  technicianId: string;
  task: string;
  checklist: string;
  intervalDays: number;
  lastDone: string | null; // YYYY-MM-DD
  nextDue: string; // YYYY-MM-DD
  active: boolean;
}

/** Audit log entry */
export interface AuditEntry {
  at: string;
  userId: string;
  text: string;
}
