"use server";
import { revalidatePath } from "next/cache";
import { notFound, redirect } from "next/navigation";
import { requirePermission } from "@/lib/auth/dal";
import { createMachine, deleteMachine, updateMachine } from "@/lib/data/repo";
import { fieldErrors, formValues, MACHINE_ID_RE, machineSchema, type FormState } from "@/lib/validation";

const FIELDS = ["id", "name", "type", "location", "status"] as const;

export async function createMachineAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const actor = await requirePermission("machine:write");
  const values = formValues(formData, FIELDS);
  const parsed = machineSchema.safeParse(values);
  if (!parsed.success) return { errors: fieldErrors(parsed.error), values };
  const res = await createMachine(actor, parsed.data);
  if (!res.ok) return { errors: res.errors, values, message: res.errors.form };
  revalidatePath("/", "layout");
  redirect(`/machines/${res.id}?notice=created&id=${res.id}`);
}

export async function updateMachineAction(id: string, _prev: FormState, formData: FormData): Promise<FormState> {
  const actor = await requirePermission("machine:write");
  if (!MACHINE_ID_RE.test(id)) notFound();
  const values = { ...formValues(formData, FIELDS), id }; // the ID itself cannot be changed
  const parsed = machineSchema.safeParse(values);
  if (!parsed.success) return { errors: fieldErrors(parsed.error), values };
  const { name, type, location, status } = parsed.data;
  const res = await updateMachine(actor, id, { name, type, location, status });
  if (!res.ok) return { errors: res.errors, values, message: res.errors.form };
  revalidatePath("/", "layout");
  redirect(`/machines/${id}?notice=updated&id=${id}`);
}

export async function deleteMachineAction(formData: FormData): Promise<void> {
  const actor = await requirePermission("machine:write");
  const id = String(formData.get("id") ?? "");
  if (!MACHINE_ID_RE.test(id)) notFound();
  const res = await deleteMachine(actor, id);
  if (!res.ok) {
    const msg = encodeURIComponent(res.errors?.form || "cannot_delete");
    redirect(`/machines/${id}?error=${msg}`);
  }
  revalidatePath("/", "layout");
  redirect(`/machines?notice=deleted&id=${id}`);
}
