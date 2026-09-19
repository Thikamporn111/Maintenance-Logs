import type { Metadata } from "next";
import { requirePermission } from "@/lib/auth/dal";
import { listAudit, listUsers } from "@/lib/data/repo";
import { fmtDateTime } from "@/lib/time";
import { Empty, PageHeader } from "@/components/ui";

export const metadata: Metadata = { title: "Audit Log" };

export default async function AuditPage() {
  await requirePermission("audit:read");
  const [rows, users] = await Promise.all([listAudit(100), listUsers()]);
  const name = (id: string) => users.find((u) => u.id === id)?.name ?? "—";
  return (
    <>
      <PageHeader title="Audit Log"><span className="text-[13px] text-muted">ล่าสุด {rows.length} เหตุการณ์</span></PageHeader>
      <section className="panel">
        <div className="panel-head"><h2>ใครเปลี่ยนอะไร เมื่อไร</h2></div>
        {rows.length ? (
          <div className="table-wrap">
            <table className="data-table min-w-[560px]">
              <thead><tr><th>เวลา</th><th>ผู้ใช้</th><th>การกระทำ</th></tr></thead>
              <tbody>
                {rows.map((r, i) => (
                  <tr key={`${r.at}-${i}`}><td className="num whitespace-nowrap">{fmtDateTime(r.at)}</td><td>{name(r.userId)}</td><td>{r.text}</td></tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : <Empty>ยังไม่มีเหตุการณ์</Empty>}
      </section>
    </>
  );
}
