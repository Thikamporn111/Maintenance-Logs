"use client";
import { useActionState } from "react";
import { login } from "./actions";
import { SubmitButton } from "@/components/client";
import { Field, FormError } from "@/components/ui";

export function LoginForm({ demoEnabled }: { demoEnabled: boolean }) {
  const [state, action] = useActionState(login, {});

  return (
    <form action={action} className="flex w-full max-w-[400px] flex-col gap-4" noValidate>
      <div>
        <div className="eyebrow">Maintenance Logs</div>
        <h2 className="text-2xl font-semibold">เข้าสู่ระบบ</h2>
      </div>

      <p className="callout">
        <b className="text-ink">เวอร์ชันทดลองสำหรับทีมพัฒนาเท่านั้น</b> ใช้ข้อมูลจำลอง และยังไม่เปิดให้สมัครสมาชิก
        การสมัครและเข้าสู่ระบบจริงจะเปิดเมื่อเชื่อม Supabase Auth ในเวอร์ชัน product
      </p>
      {!demoEnabled && (
        <FormError message="ยังไม่ได้ตั้งค่าบัญชีทดลองบนเครื่องนี้ (DEMO_PASSWORD) ขอข้อมูลจากทีมพัฒนา" />
      )}
      <FormError message={state.message} />

      <Field label="อีเมล" name="email" error={state.errors?.email} required>
        <input className="input" id="email" name="email" type="email" autoComplete="username" defaultValue={state.values?.email} aria-invalid={!!state.errors?.email} />
      </Field>
      <Field label="รหัสผ่าน" name="password" error={state.errors?.password} required>
        <input className="input" id="password" name="password" type="password" autoComplete="current-password" aria-invalid={!!state.errors?.password} />
      </Field>
      <SubmitButton pendingText="กำลังเข้าสู่ระบบ…">เข้าสู่ระบบ</SubmitButton>
    </form>
  );
}
