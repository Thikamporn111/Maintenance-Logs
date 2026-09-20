import type { Metadata } from "next";
import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import { requirePermission } from "@/lib/auth/dal";
import { getMachine } from "@/lib/data/repo";
import { PageHeader } from "@/components/ui";
import { getDictionary, type Locale } from "@/lib/i18n";
import { MachineForm } from "../../MachineForm";
import { updateMachineAction } from "../../actions";

export const metadata: Metadata = { title: "Edit Machine" };

export default async function EditMachinePage({ params }: PageProps<"/machines/[id]/edit">) {
  await requirePermission("machine:write");
  const cookieStore = await cookies();
  const locale = (cookieStore.get("locale")?.value || "th") as Locale;
  const t = getDictionary(locale);

  const { id } = await params;
  const m = await getMachine(id);
  if (!m) notFound();
  return (
    <>
      <PageHeader title={t.machines.editTitle.replace("{id}", m.id)} />
      <MachineForm action={updateMachineAction.bind(null, m.id)} isNew={false} cancelHref={`/machines/${m.id}`} locale={locale} initial={{ ...m }} />
    </>
  );
}
