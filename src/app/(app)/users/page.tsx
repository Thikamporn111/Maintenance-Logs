import type { Metadata } from "next";
import { requirePage } from "@/lib/auth/dal";
import { listUsers } from "@/lib/data/repo";
import { ROLE_LABEL } from "@/lib/permissions";
import { ROLES } from "@/lib/types";
import { SubmitButton } from "@/components/client";
import { FormError, Notice, Options, PageHeader } from "@/components/ui";
import { setRoleAction, toggleActiveAction } from "./actions";

export const metadata: Metadata = { title: "Users" };

const ERRORS: Record<string, string> = {
  self: "เปลี่ยน Role หรือปิดการใช้งานบัญชีตัวเองไม่ได้ เพื่อกันการล็อกตัวเองออกจากระบบ",
  invalid: "ข้อมูลที่ส่งมาไม่ถูกต้อง",
};

export default async function UsersPage({ searchParams }: PageProps<"/users">) {
  const me = await requirePage("users");
  const sp = await searchParams;
  const users = await listUsers();
  const roleOptions = ROLES.map((r) => [r, ROLE_LABEL[r]] as const);

  return (
    <>
      <PageHeader title="Users"><span className="text-[13px] text-muted">{users.length} บัญชี</span></PageHeader>
      <Notice code={sp.notice} />
      <FormError message={typeof sp.error === "string" ? ERRORS[sp.error] : undefined} />
      <section className="panel">
        <div className="panel-head"><h2>ผู้ใช้และสิทธิ์</h2></div>
        <div className="table-wrap">
          <table className="data-table">
            <thead><tr><th>ชื่อ</th><th>อีเมล</th><th>Role</th><th>สถานะบัญชี</th></tr></thead>
            <tbody>
              {users.map((u) => {
                const self = u.id === me.id;
                return (
                  <tr key={u.id}>
                    <td><b>{u.name}</b>{self && <span className="tag">คุณ</span>}</td>
                    <td className="font-mono">{u.email}</td>
                    <td>
                      {self ? <span className="text-muted">{ROLE_LABEL[u.role]} (เปลี่ยนเองไม่ได้)</span> : (
                        <form action={setRoleAction} className="flex items-center gap-2">
                          <input type="hidden" name="id" value={u.id} />
                          <select className="input w-auto" name="role" defaultValue={u.role} aria-label={`Role ของ ${u.name}`}><Options list={roleOptions} /></select>
                          <SubmitButton className="btn btn-sm" pendingText="…">บันทึก</SubmitButton>
                        </form>
                      )}
                    </td>
                    <td>
                      {self ? <span className="pill pill-ok">Active</span> : (
                        <form action={toggleActiveAction}>
                          <input type="hidden" name="id" value={u.id} />
                          <input type="hidden" name="active" value={String(!u.active)} />
                          <SubmitButton className={`btn btn-sm ${u.active ? "" : "btn-primary"}`} pendingText="…">{u.active ? "ปิดการใช้งาน" : "เปิดใช้งาน"}</SubmitButton>
                        </form>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
      <section className="panel p-4">
        <div className="eyebrow mb-2.5">สิทธิ์ของแต่ละ Role</div>
        <div className="table-wrap">
          <table className="data-table min-w-[560px]">
            <thead><tr><th>Role</th><th>ดูข้อมูล</th><th>เพิ่ม/แก้ไข</th><th>จัดการ User</th></tr></thead>
            <tbody>
              <tr><td><b>Admin</b></td><td>ทั้งหมด</td><td>ทั้งหมด (รวม Machine CRUD และแผน PM)</td><td>ได้</td></tr>
              <tr><td><b>Technician</b></td><td>Machine / Alarm / Maintenance / แผน PM</td><td>Alarm, Maintenance และออกใบงาน PM</td><td>ไม่ได้</td></tr>
              <tr><td><b>Viewer</b></td><td>Dashboard</td><td>ไม่ได้</td><td>ไม่ได้</td></tr>
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}
