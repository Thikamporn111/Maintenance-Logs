"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requirePermission } from "@/lib/auth/dal";
import { setUserActive, setUserRole } from "@/lib/data/repo";
import { ROLES } from "@/lib/types";
import { pick } from "@/lib/validation";

const USER_ID = /^[A-Za-z0-9_-]{1,64}$/;

export async function setRoleAction(formData: FormData): Promise<void> {
  const actor = await requirePermission("users:manage");
  const id = String(formData.get("id") ?? "");
  const role = pick(formData.get("role"), ROLES);
  if (!USER_ID.test(id) || !role) redirect("/users?error=invalid");
  const res = await setUserRole(actor, id, role);
  revalidatePath("/users");
  redirect(res.ok ? "/users?notice=updated" : "/users?error=self");
}

export async function toggleActiveAction(formData: FormData): Promise<void> {
  const actor = await requirePermission("users:manage");
  const id = String(formData.get("id") ?? "");
  const active = formData.get("active") === "true";
  if (!USER_ID.test(id)) redirect("/users?error=invalid");
  const res = await setUserActive(actor, id, active);
  revalidatePath("/users");
  redirect(res.ok ? "/users?notice=updated" : "/users?error=self");
}
