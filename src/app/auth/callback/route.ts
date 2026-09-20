import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const next = requestUrl.searchParams.get("next") ?? "/dashboard";
  const error = requestUrl.searchParams.get("error");
  const errorDescription = requestUrl.searchParams.get("error_description");

  if (error) {
    console.error("Supabase OAuth error:", error, errorDescription);
    const msg = errorDescription || error;
    return NextResponse.redirect(`${requestUrl.origin}/login?error=${encodeURIComponent(msg)}`);
  }

  if (code) {
    try {
      const supabase = await createClient();
      const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);

      if (exchangeError) {
        console.error("Code exchange failed:", exchangeError);
        return NextResponse.redirect(
          `${requestUrl.origin}/login?error=${encodeURIComponent("การแลกเปลี่ยน Session ไม่สำเร็จ: " + exchangeError.message)}`
        );
      }

      // Check if user account was created/approved by Admin
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        let { data: profile } = await supabase
          .from("profiles")
          .select("id, active, role")
          .eq("id", user.id)
          .single();

        // If not matched by id, check if Admin pre-added them by email
        if (!profile && user.email) {
          const { data: profileByEmail } = await supabase
            .from("profiles")
            .select("id, active, role")
            .ilike("email", user.email)
            .single();

          if (profileByEmail) {
            profile = profileByEmail;
            try {
              await supabase
                .from("profiles")
                .update({ id: user.id })
                .eq("id", profileByEmail.id);
            } catch {
              // Ignore if conflict
            }
          }
        }

        // Strictly enforce Admin authorization: only Admin-added users are permitted
        if (!profile) {
          await supabase.auth.signOut();
          return NextResponse.redirect(
            `${requestUrl.origin}/login?error=${encodeURIComponent(
              `อีเมล ${user.email ?? ""} ยังไม่ได้รับสิทธิ์จากผู้ดูแลระบบ กรุณาแจ้ง Admin เพื่อสร้างบัญชีและกำหนด Role`
            )}`
          );
        }

        if (profile.active === false) {
          await supabase.auth.signOut();
          return NextResponse.redirect(
            `${requestUrl.origin}/login?error=${encodeURIComponent("บัญชีนี้ถูกปิดการใช้งาน กรุณาติดต่อผู้ดูแลระบบ")}`
          );
        }
      }

      return NextResponse.redirect(`${requestUrl.origin}${next}`);
    } catch (err) {
      console.error("Error in auth callback:", err);
      return NextResponse.redirect(
        `${requestUrl.origin}/login?error=${encodeURIComponent("เกิดข้อผิดพลาดในการยืนยันตัวตน")}`
      );
    }
  }

  return NextResponse.redirect(
    `${requestUrl.origin}/login?error=${encodeURIComponent("ไม่พบรหัสยืนยันตัวตน (Authorization Code)")}`
  );
}
