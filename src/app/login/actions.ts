"use server";
import { redirect } from "next/navigation";
import { verifyCredentials } from "@/lib/auth/credentials";
import { createSession } from "@/lib/auth/session";
import { fieldErrors, formValues, loginSchema, type FormState } from "@/lib/validation";

export async function login(_prev: FormState, formData: FormData): Promise<FormState> {
  const values = formValues(formData, ["email"]);
  const parsed = loginSchema.safeParse({ email: formData.get("email"), password: formData.get("password") });
  if (!parsed.success) return { errors: fieldErrors(parsed.error), values };

  const result = await verifyCredentials(parsed.data.email, parsed.data.password);
  if (!result.ok) return { message: result.message, values };

  await createSession(result.user.id);
  redirect("/dashboard");
}
