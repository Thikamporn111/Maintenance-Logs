"use client";
import { useActionState, useState } from "react";
import { login } from "./actions";
import { SubmitButton } from "@/components/client";
import { Field, FormError } from "@/components/ui";

type Account = { email: string; name: string; role: string };

export function LoginForm({ accounts, demoPassword }: { accounts: Account[]; demoPassword: string | null }) {
  const [state, action] = useActionState(login, {});
  const [email, setEmail] = useState(state.values?.email ?? "");

  return (
    <form action={action} className="flex w-full max-w-[400px] flex-col gap-4" noValidate>
      <div>
        <div className="eyebrow">Maintenance Logs</div>
        <h2 className="text-2xl font-semibold">เข้าสู่ระบบ</h2>
      </div>
      <FormError message={state.message} />

      {accounts.length > 0 && (
        <div className="flex flex-col gap-2">
          <span className="eyebrow">บัญชีทดลอง (ข้อมูลจำลอง)</span>
          {accounts.map((a) => (
            <button
              key={a.email}
              type="button"
              onClick={() => setEmail(a.email)}
              aria-label={`ใช้บัญชี ${a.name} (${a.role})`}
              aria-pressed={email === a.email}
              className={`flex items-center gap-3 rounded-[10px] border bg-surface px-3 py-2.5 text-left ${email === a.email ? "border-accent ring-1 ring-accent" : "border-line hover:border-line-strong"}`}
            >
              <span className="grid size-8 place-items-center rounded-full border border-line bg-surface-2 text-[13px] font-semibold">{a.name.charAt(0)}</span>
              <span className="min-w-0"><b className="block">{a.name}</b><small className="text-muted">{a.email}</small></span>
              <span className="ml-auto rounded border border-line-strong px-1.5 font-mono text-[11.5px] text-muted">{a.role}</span>
            </button>
          ))}
        </div>
      )}

      <Field label="อีเมล" name="email" error={state.errors?.email} required>
        <input className="input" id="email" name="email" type="email" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} aria-invalid={!!state.errors?.email} />
      </Field>
      <Field label="รหัสผ่าน" name="password" error={state.errors?.password} required hint={demoPassword ? `รหัสผ่านบัญชีทดลอง: ${demoPassword}` : undefined}>
        <input className="input" id="password" name="password" type="password" autoComplete="current-password" aria-invalid={!!state.errors?.password} />
      </Field>
      <SubmitButton pendingText="กำลังเข้าสู่ระบบ…">เข้าสู่ระบบ</SubmitButton>
    </form>
  );
}
