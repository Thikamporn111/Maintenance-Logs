"use server";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { verifyCredentials } from "@/lib/auth/credentials";
import { createSession } from "@/lib/auth/session";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";
import {
  fieldErrors,
  formValues,
  loginSchema,
  type FormState,
} from "@/lib/validation";

export async function login(_prev: FormState, formData: FormData): Promise<FormState> {
  const values = formValues(formData, ["email"]);
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) return { errors: fieldErrors(parsed.error), values };

  const { email, password } = parsed.data;

  // 1. If Supabase is configured, use Supabase Auth
  if (isSupabaseConfigured()) {
    try {
      const supabase = await createClient();
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (!error && data.user) {
        // Verify account exists in profiles and is active
        let { data: profile } = await supabase
          .from("profiles")
          .select("active")
          .eq("id", data.user.id)
          .single();

        if (!profile && data.user.email) {
          const { data: byEmail } = await supabase
            .from("profiles")
            .select("active")
            .ilike("email", data.user.email)
            .single();
          profile = byEmail;
        }

        if (!profile) {
          await supabase.auth.signOut();
          return { message: "บัญชีนี้ยังไม่ได้รับสิทธิ์จากผู้ดูแลระบบ กรุณาติดต่อ Admin", values };
        }

        if (profile.active === false) {
          await supabase.auth.signOut();
          return { message: "บัญชีนี้ถูกปิดการใช้งาน กรุณาติดต่อผู้ดูแลระบบ", values };
        }

        redirect("/dashboard");
      }

      // Check if demo fallback applies if credentials match demo accounts
      const demoResult = await verifyCredentials(email, password);
      if (demoResult.ok) {
        await createSession(demoResult.user.id);
        redirect("/dashboard");
      }

      return {
        message:
          error?.message === "Invalid login credentials"
            ? "อีเมลหรือรหัสผ่านไม่ถูกต้อง หรือยังไม่ได้รับสิทธิ์จาก Admin"
            : error?.message || "เข้าสู่ระบบไม่สำเร็จ",
        values,
      };
    } catch (err) {
      if (err instanceof Error && err.message === "NEXT_REDIRECT") {
        throw err;
      }
      return { message: "เกิดข้อผิดพลาดในการเชื่อมต่อ กรุณาลองใหม่อีกครั้ง", values };
    }
  }

  // 2. Fallback to demo credentials
  const result = await verifyCredentials(email, password);
  if (!result.ok) return { message: result.message, values };

  await createSession(result.user.id);
  redirect("/dashboard");
}

export async function signInWithGoogle() {
  if (!isSupabaseConfigured()) {
    redirect(
      "/login?error=" +
        encodeURIComponent(
          "ยังไม่ได้ตั้งค่า Supabase ใน .env.local (กรุณาระบุ NEXT_PUBLIC_SUPABASE_URL และ NEXT_PUBLIC_SUPABASE_ANON_KEY)"
        )
    );
  }

  const h = await headers();
  const host = h.get("host");
  const proto = h.get("x-forwarded-proto") || (host?.includes("localhost") ? "http" : "https");
  const origin = `${proto}://${host}`;

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: `${origin}/auth/callback`,
      queryParams: {
        access_type: "offline",
        prompt: "consent",
      },
    },
  });

  if (error) {
    redirect(`/login?error=${encodeURIComponent(error.message)}`);
  }

  if (data.url) {
    redirect(data.url);
  }
}
