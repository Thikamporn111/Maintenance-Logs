"use server";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { destroySession } from "@/lib/auth/session";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";

export async function logout() {
  if (isSupabaseConfigured()) {
    try {
      const supabase = await createClient();
      await supabase.auth.signOut();
    } catch (e) {
      console.error("Error signing out of Supabase:", e);
    }
  }
  await destroySession();
  redirect("/login");
}

export async function setTheme(formData: FormData) {
  const theme = formData.get("theme");
  if (theme !== "light" && theme !== "dark") return;
  (await cookies()).set("theme", theme, {
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
    sameSite: "lax",
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
  });
}

export async function setLocale(formData: FormData) {
  const locale = formData.get("locale");
  if (locale !== "th" && locale !== "en") return;
  (await cookies()).set("locale", locale, {
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
    sameSite: "lax",
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
  });
}
