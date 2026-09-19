"use server";
import { revalidatePath } from "next/cache";
import { notFound, redirect } from "next/navigation";
import { requirePermission } from "@/lib/auth/dal";
import { createAlarm, updateAlarm } from "@/lib/data/repo";
import { ALARM_ID_RE, alarmCreateSchema, alarmUpdateSchema, fieldErrors, formValues, type FormState } from "@/lib/validation";

export async function createAlarmAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const actor = await requirePermission("alarm:create");
  const values = formValues(formData, ["machineId", "code", "occurredAt", "description", "cause"]);
  const parsed = alarmCreateSchema.safeParse(values);
  if (!parsed.success) return { errors: fieldErrors(parsed.error), values };
  const res = await createAlarm(actor, parsed.data);
  if (!res.ok) return { errors: res.errors, values, message: res.errors.form };
  revalidatePath("/", "layout");
  redirect(`/alarms/${res.id}?notice=created&id=${res.id}`);
}

export async function updateAlarmAction(id: string, _prev: FormState, formData: FormData): Promise<FormState> {
  const actor = await requirePermission("alarm:update");
  if (!ALARM_ID_RE.test(id)) notFound();
  const values = formValues(formData, ["status", "cause", "action"]);
  const parsed = alarmUpdateSchema.safeParse(values);
  if (!parsed.success) return { errors: fieldErrors(parsed.error), values };
  const res = await updateAlarm(actor, id, parsed.data);
  if (!res.ok) return { errors: res.errors, values, message: res.errors.form };
  revalidatePath("/", "layout");
  redirect(`/alarms/${id}?notice=updated&id=${id}`);
}
