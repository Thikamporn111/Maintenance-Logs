import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requirePermission } from "@/lib/auth/dal";
import { getMachine } from "@/lib/data/repo";
import { PageHeader } from "@/components/ui";
import { MachineForm } from "../../MachineForm";
import { updateMachineAction } from "../../actions";

export const metadata: Metadata = { title: "แก้ไขเครื่องจักร" };

export default async function EditMachinePage({ params }: PageProps<"/machines/[id]/edit">) {
  await requirePermission("machine:write");
  const { id } = await params;
  const m = await getMachine(id);
  if (!m) notFound();
  return (
    <>
      <PageHeader title={`แก้ไข ${m.id}`} />
      <MachineForm action={updateMachineAction.bind(null, m.id)} isNew={false} cancelHref={`/machines/${m.id}`} initial={{ ...m }} />
    </>
  );
}
