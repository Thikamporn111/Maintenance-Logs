"use server";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { destroySession } from "@/lib/auth/session";

export async function logout() {
  await destroySession();
  redirect("/login");
}

export async function setTheme(formData: FormData) {
  const theme = formData.get("theme");
  if (theme !== "light" && theme !== "dark") return;
  (await cookies()).set("theme", theme, { path: "/", maxAge: 60 * 60 * 24 * 365, sameSite: "lax", httpOnly: true, secure: process.env.NODE_ENV === "production" });
}
