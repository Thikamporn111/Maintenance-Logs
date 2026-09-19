import "server-only";
import { listMachines, listUsers } from "@/lib/data/repo";

export async function planOptions() {
  const [machines, users] = await Promise.all([listMachines(), listUsers()]);
  return {
    machines: machines.map((m) => [m.id, `${m.id} · ${m.name}`] as [string, string]),
    technicians: users.filter((u) => u.active && u.role !== "viewer").map((u) => [u.id, u.name] as [string, string]),
  };
}
