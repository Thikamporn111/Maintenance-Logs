import type { Metadata } from "next";
import { cookies } from "next/headers";
import { requirePermission } from "@/lib/auth/dal";
import { listMachines } from "@/lib/data/repo";
import { PageHeader } from "@/components/ui";
import { getDictionary, type Locale } from "@/lib/i18n";
import { MachineForm } from "../MachineForm";
import { createMachineAction } from "../actions";

export const metadata: Metadata = { title: "New Machine" };

export default async function NewMachinePage() {
  await requirePermission("machine:write");
  const cookieStore = await cookies();
  const locale = (cookieStore.get("locale")?.value || "th") as Locale;
  const t = getDictionary(locale);

  const ids = (await listMachines()).map((m) => parseInt(m.id.slice(2), 10));
  const suggested = `M-${String(Math.max(0, ...ids) + 1).padStart(3, "0")}`;
  return (
    <>
      <PageHeader title={t.machines.addTitle} />
      <MachineForm action={createMachineAction} isNew cancelHref="/machines" locale={locale} initial={{ id: suggested, name: "", type: "", location: "", status: "Running" }} />
    </>
  );
}
