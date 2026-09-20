"use server";
import { revalidatePath } from "next/cache";
import { notFound, redirect } from "next/navigation";
import { requirePermission } from "@/lib/auth/dal";
import { createPlan, deactivatePlan, updatePlan } from "@/lib/data/repo";
import { fieldErrors, formValues, PLAN_ID_RE, planSchema, type FormState } from "@/lib/validation";

const FIELDS = ["machineId", "technicianId", "task", "intervalDays", "nextDue", "lastDone", "checklist"] as const;

export async function createPlanAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const actor = await requirePermission("plan:write");
  const values = formValues(formData, FIELDS);
  const parsed = planSchema.safeParse(values);
  if (!parsed.success) return { errors: fieldErrors(parsed.error), values };
  const res = await createPlan(actor, parsed.data);
  if (!res.ok) return { errors: res.errors, values, message: res.errors.form };
  revalidatePath("/", "layout");
  redirect(`/plan/${res.id}?notice=created&id=${res.id}`);
}

export async function updatePlanAction(id: string, _prev: FormState, formData: FormData): Promise<FormState> {
  const actor = await requirePermission("plan:write");
  if (!PLAN_ID_RE.test(id)) notFound();
  const values = formValues(formData, FIELDS);
  const parsed = planSchema.safeParse(values);
  if (!parsed.success) return { errors: fieldErrors(parsed.error), values };
  const res = await updatePlan(actor, id, parsed.data);
  if (!res.ok) return { errors: res.errors, values, message: res.errors.form };
  revalidatePath("/", "layout");
  redirect(`/plan/${id}?notice=updated&id=${id}`);
}

export async function deactivatePlanAction(formData: FormData): Promise<void> {
  const actor = await requirePermission("plan:write");
  const id = String(formData.get("id") ?? "");
  if (!PLAN_ID_RE.test(id)) notFound();
  const res = await deactivatePlan(actor, id);
  if (!res.ok) {
    const msg = encodeURIComponent(res.errors?.form || "cannot_deactivate");
    redirect(`/plan/${id}?error=${msg}`);
  }
  revalidatePath("/", "layout");
  redirect(`/plan?notice=deactivated&id=${id}`);
}
