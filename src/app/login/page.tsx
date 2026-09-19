import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/dal";
import { demoLoginEnabled } from "@/lib/auth/credentials";
import { listUsers } from "@/lib/data/repo";
import { ROLE_LABEL } from "@/lib/permissions";
import { LoginForm } from "./LoginForm";

export const metadata: Metadata = { title: "เข้าสู่ระบบ" };

export default async function LoginPage() {
  if (await getCurrentUser()) redirect("/dashboard");
  const demo = demoLoginEnabled();
  const accounts = demo
    ? (await listUsers()).filter((u) => u.active).map((u) => ({ email: u.email, name: u.name, role: ROLE_LABEL[u.role] }))
    : [];
  // The demo password is only printed on screen during local development.
  const demoPassword = demo && process.env.NODE_ENV !== "production" ? "REDACTED" : null;

  return (
    <div className="grid min-h-full md:grid-cols-[1.1fr_1fr]">
      <section className="flex flex-col justify-between gap-8 bg-brand px-6 py-8 text-brand-ink md:px-16 md:py-12">
        <div className="flex items-center gap-2.5 font-bold">
          <span className="grid size-[30px] place-items-center rounded-lg bg-brand-ink font-mono text-[13px] text-brand">ML</span>
          Maintenance Logs
        </div>
        <div>
          <h1 className="max-w-[14em] text-3xl font-semibold md:text-[44px]">รู้ทันทีว่าเครื่องไหนหยุด และใครกำลังซ่อม</h1>
          <p className="mt-3 max-w-[34em] opacity-85">ระบบกลางสำหรับ Machine, Alarm, งาน Maintenance และแผน PM ของโรงงาน</p>
        </div>
        <pre aria-hidden="true" className="hidden font-mono text-xs leading-[1.9] opacity-55 md:block">{`|--[ ALM_ACTIVE ]--[/ ACK ]----------( HORN   )--|
|--[ M002.RUN   ]--[  E-201 ]---------( LAMP_R )--|
|--[ MNT.OPEN   ]--[/ PART  ]---------( WO_REQ )--|`}</pre>
      </section>
      <main className="flex items-center justify-center px-4 py-8">
        <LoginForm accounts={accounts} demoPassword={demoPassword} />
      </main>
    </div>
  );
}
