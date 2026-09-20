import type { Metadata } from "next";
import { cookies } from "next/headers";
import { requirePermission } from "@/lib/auth/dal";
import { listAudit, listUsers } from "@/lib/data/repo";
import { fmtDateTime } from "@/lib/time";
import { Empty, PageHeader } from "@/components/ui";
import { getDictionary, type Locale } from "@/lib/i18n";

export const metadata: Metadata = { title: "Audit Log" };

export default async function AuditPage() {
  await requirePermission("audit:read");
  const cookieStore = await cookies();
  const locale = (cookieStore.get("locale")?.value || "th") as Locale;
  const t = getDictionary(locale);

  const [rows, users] = await Promise.all([listAudit(100), listUsers()]);
  const name = (id: string) => users.find((u) => u.id === id)?.name ?? "—";

  return (
    <>
      <PageHeader title={t.nav.audit}>
        <span className="text-[13px] text-muted">
          {t.audit.latestEvents.replace("{count}", String(rows.length))}
        </span>
      </PageHeader>
      <section className="panel">
        <div className="panel-head">
          <h2>{t.audit.subtitle}</h2>
        </div>
        {rows.length ? (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th className="w-48">{t.audit.timestamp}</th>
                  <th className="w-56">{t.audit.user}</th>
                  <th>{t.audit.actionDetails}</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r, i) => (
                  <tr key={`${r.at}-${i}`}>
                    <td className="num whitespace-nowrap text-muted text-xs font-mono">
                      {fmtDateTime(r.at)}
                    </td>
                    <td className="font-semibold text-ink">{name(r.userId)}</td>
                    <td className="text-ink">{r.text}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <Empty>{t.audit.noEvents}</Empty>
        )}
      </section>
    </>
  );
}
