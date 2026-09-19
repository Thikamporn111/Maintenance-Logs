// Domain types shared by the UI, validation and the data layer.
// Table names in comments are the intended Supabase/Postgres tables.

export const ROLES = ["admin", "technician", "viewer"] as const;
export type Role = (typeof ROLES)[number];

export const MACHINE_STATUS = ["Running", "Stop", "Alarm", "Maintenance"] as const;
export type MachineStatus = (typeof MACHINE_STATUS)[number];

export const ALARM_STATUS = ["Open", "In Progress", "Closed"] as const;
export type AlarmStatus = (typeof ALARM_STATUS)[number];

export const MNT_STATUS = ["Open", "In Progress", "Waiting Part", "Done"] as const;
export type MaintenanceStatus = (typeof MNT_STATUS)[number];

export const MNT_TYPES = ["Corrective", "Preventive"] as const;
export type MaintenanceType = (typeof MNT_TYPES)[number];

export const MACHINE_TYPES = ["CNC", "Conveyor", "Robot", "Press", "Injection Molding", "Packaging", "Compressor", "Chiller"] as const;
export const LOCATIONS = ["Line A", "Line B", "Line C", "Utility"] as const;

export const PM_INTERVALS = [7, 14, 30, 90, 180, 365] as const;

/** profiles */
export interface Profile {
  id: string;
  name: string;
  email: string;
  role: Role;
  active: boolean;
}

/** machines */
export interface Machine {
  id: string; // M-000
  name: string;
  type: string;
  location: string;
  status: MachineStatus;
}

/** alarms */
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

/** maintenance_records */
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

/** pm_plans */
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

/** audit_log */
export interface AuditEntry {
  at: string;
  userId: string;
  text: string;
}
