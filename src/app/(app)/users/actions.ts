"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requirePermission } from "@/lib/auth/dal";
import {
  createRole,
  createUser,
  deleteRole,
  setUserActive,
  setUserRole,
  updateRole,
  updateUser,
} from "@/lib/data/repo";
import type { Page, Permission } from "@/lib/types";
import {
  fieldErrors,
  formValues,
  roleCreateSchema,
  roleUpdateSchema,
  userCreateSchema,
  userUpdateSchema,
  type FormState,
} from "@/lib/validation";

const USER_ID = /^[A-Za-z0-9_-]{1,64}$/;

export async function setRoleAction(formData: FormData): Promise<void> {
  const actor = await requirePermission("users:manage");
  const id = String(formData.get("id") ?? "");
  const role = String(formData.get("role") ?? "").trim();
  if (!USER_ID.test(id) || !role) redirect("/users?error=invalid");
  const res = await setUserRole(actor, id, role);
  revalidatePath("/users");
  if (!res.ok) {
    const err = encodeURIComponent(res.errors?.form || res.errors?.role || "self");
    redirect(`/users?error=${err}`);
  }
  redirect("/users?notice=updated");
}

export async function toggleActiveAction(formData: FormData): Promise<void> {
  const actor = await requirePermission("users:manage");
  const id = String(formData.get("id") ?? "");
  const active = formData.get("active") === "true";
  if (!USER_ID.test(id)) redirect("/users?error=invalid");
  const res = await setUserActive(actor, id, active);
  revalidatePath("/users");
  if (!res.ok) {
    const err = encodeURIComponent(res.errors?.form || res.errors?.active || "self");
    redirect(`/users?error=${err}`);
  }
  redirect("/users?notice=updated");
}

export async function createUserAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const actor = await requirePermission("users:manage");
  const values = formValues(formData, ["name", "email", "role", "password", "provider"]);
  const parsed = userCreateSchema.safeParse(values);
  if (!parsed.success) {
    return { errors: fieldErrors(parsed.error), values, message: "กรุณาตรวจสอบข้อมูลที่ไม่ถูกต้อง" };
  }

  const res = await createUser(actor, parsed.data);
  if (!res.ok) {
    return {
      errors: res.errors,
      values,
      message: res.errors?.email || res.errors?.form || "เกิดข้อผิดพลาดในการสร้างผู้ใช้",
    };
  }

  revalidatePath("/users");
  redirect("/users?notice=created");
}

export async function updateUserAction(id: string, _prev: FormState, formData: FormData): Promise<FormState> {
  const actor = await requirePermission("users:manage");
  const values = formValues(formData, ["name", "email", "role", "password", "active"]);
  const parsed = userUpdateSchema.safeParse(values);
  if (!parsed.success) {
    return { errors: fieldErrors(parsed.error), values, message: "กรุณาตรวจสอบข้อมูลที่ไม่ถูกต้อง" };
  }

  const res = await updateUser(actor, id, parsed.data);
  if (!res.ok) {
    return {
      errors: res.errors,
      values,
      message:
        res.errors?.form ||
        res.errors?.email ||
        res.errors?.role ||
        res.errors?.active ||
        "เกิดข้อผิดพลาดในการแก้ไขข้อมูล",
    };
  }

  revalidatePath("/users");
  redirect("/users?notice=updated");
}

export async function createRoleAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const actor = await requirePermission("users:manage");
  const pages = formData.getAll("pages").map(String) as Page[];
  const permissions = formData.getAll("permissions").map(String) as Permission[];
  const raw = {
    id: String(formData.get("id") ?? "").trim().toLowerCase(),
    label: String(formData.get("label") ?? "").trim(),
    description: String(formData.get("description") ?? "").trim(),
    pages,
    permissions,
  };

  const parsed = roleCreateSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      errors: fieldErrors(parsed.error),
      values: { id: raw.id, label: raw.label, description: raw.description },
      message: "กรุณาตรวจสอบข้อมูล Role ที่ไม่ถูกต้อง",
    };
  }

  const res = await createRole(actor, {
    id: parsed.data.id,
    label: parsed.data.label,
    description: parsed.data.description,
    pages,
    permissions,
  });

  if (!res.ok) {
    return {
      errors: res.errors,
      values: { id: raw.id, label: raw.label, description: raw.description },
      message: res.errors?.id || res.errors?.form || "เกิดข้อผิดพลาดในการสร้าง Role",
    };
  }

  revalidatePath("/users");
  redirect("/users?notice=role_created");
}

export async function updateRoleAction(id: string, _prev: FormState, formData: FormData): Promise<FormState> {
  const actor = await requirePermission("users:manage");
  const pages = formData.getAll("pages").map(String) as Page[];
  const permissions = formData.getAll("permissions").map(String) as Permission[];
  const raw = {
    label: String(formData.get("label") ?? "").trim(),
    description: String(formData.get("description") ?? "").trim(),
    pages,
    permissions,
  };

  const parsed = roleUpdateSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      errors: fieldErrors(parsed.error),
      values: { label: raw.label, description: raw.description },
      message: "กรุณาตรวจสอบข้อมูล Role ที่ไม่ถูกต้อง",
    };
  }

  const res = await updateRole(actor, id, {
    label: parsed.data.label,
    description: parsed.data.description,
    pages,
    permissions,
  });

  if (!res.ok) {
    return {
      errors: res.errors,
      values: { label: raw.label, description: raw.description },
      message: res.errors?.form || "เกิดข้อผิดพลาดในการแก้ไขสิทธิ์ Role",
    };
  }

  revalidatePath("/users");
  redirect("/users?notice=role_updated");
}

export async function deleteRoleAction(formData: FormData): Promise<void> {
  const actor = await requirePermission("users:manage");
  const id = String(formData.get("id") ?? "").trim().toLowerCase();
  if (!id) redirect("/users?error=invalid");

  const res = await deleteRole(actor, id);
  revalidatePath("/users");
  if (!res.ok) {
    const msg = encodeURIComponent(res.errors?.form || "ไม่สามารถลบ Role ได้");
    redirect(`/users?error=${msg}`);
  }
  redirect("/users?notice=role_deleted");
}
