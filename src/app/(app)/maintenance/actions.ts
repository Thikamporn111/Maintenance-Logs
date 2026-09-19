"use server";
import { revalidatePath } from "next/cache";
import { notFound, redirect } from "next/navigation";
import { requirePermission } from "@/lib/auth/dal";
import { createMaintenance, updateMaintenance } from "@/lib/data/repo";
import { fieldErrors, formValues, maintenanceSchema, MNT_ID_RE, type FormState } from "@/lib/validation";

const FIELDS = ["machineId", "technicianId", "type", "date", "status", "alarmId", "planId", "problem", "action"] as const;

export async function createMaintenanceAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const actor = await requirePermission("maintenance:write");
  const values = formValues(formData, FIELDS);
  const parsed = maintenanceSchema.safeParse(values);
  if (!parsed.success) return { errors: fieldErrors(parsed.error), values };
  const res = await createMaintenance(actor, parsed.data);
  if (!res.ok) return { errors: res.errors, values, message: res.errors.form };
  revalidatePath("/", "layout");
  redirect(`/maintenance?notice=created&id=${res.id}`);
}

export async function updateMaintenanceAction(id: string, _prev: FormState, formData: FormData): Promise<FormState> {
  const actor = await requirePermission("maintenance:write");
  if (!MNT_ID_RE.test(id)) notFound();
  const values = formValues(formData, FIELDS);
  const parsed = maintenanceSchema.safeParse(values);
  if (!parsed.success) return { errors: fieldErrors(parsed.error), values };
  const res = await updateMaintenance(actor, id, parsed.data);
  if (!res.ok) return { errors: res.errors, values, message: res.errors.form };
  revalidatePath("/", "layout");
  redirect(`/maintenance?notice=updated&id=${id}`);
}
