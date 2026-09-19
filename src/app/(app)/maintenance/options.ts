import "server-only";
import { listAlarms, listMachines, listUsers } from "@/lib/data/repo";

/** Select options for the maintenance form. */
export async function maintenanceOptions(keepAlarmId?: string | null) {
  const [machines, users, alarms] = await Promise.all([listMachines(), listUsers(), listAlarms()]);
  return {
    machines: machines.map((m) => [m.id, `${m.id} · ${m.name}`] as [string, string]),
    technicians: users.filter((u) => u.active && u.role !== "viewer").map((u) => [u.id, u.name] as [string, string]),
    alarms: alarms
      .filter((a) => a.status !== "Closed" || a.id === keepAlarmId)
      .map((a) => [a.id, `${a.id} · ${a.machineId} · ${a.code}`] as [string, string]),
  };
}
