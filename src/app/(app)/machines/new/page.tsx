import type { Metadata } from "next";
import { requirePermission } from "@/lib/auth/dal";
import { listMachines } from "@/lib/data/repo";
import { PageHeader } from "@/components/ui";
import { MachineForm } from "../MachineForm";
import { createMachineAction } from "../actions";

export const metadata: Metadata = { title: "เพิ่มเครื่องจักร" };

export default async function NewMachinePage() {
  await requirePermission("machine:write");
  const ids = (await listMachines()).map((m) => parseInt(m.id.slice(2), 10));
  const suggested = `M-${String(Math.max(0, ...ids) + 1).padStart(3, "0")}`;
  return (
    <>
      <PageHeader title="เพิ่มเครื่องจักร" />
      <MachineForm action={createMachineAction} isNew cancelHref="/machines" initial={{ id: suggested, name: "", type: "", location: "", status: "Running" }} />
    </>
  );
}
