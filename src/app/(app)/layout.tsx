import { cookies } from "next/headers";
import { requireUser } from "@/lib/auth/dal";
import { activeAlarms } from "@/lib/data/repo";
import { pagesFor, ROLE_LABEL, type Page } from "@/lib/permissions";
import { logout, setTheme } from "../actions";
import { NavLinks, type NavItem } from "@/components/client";
import { Icon, type IconName } from "@/components/icons";

const NAV: Record<Page, { label: string; short: string; icon: IconName }> = {
  dashboard: { label: "Dashboard", short: "Home", icon: "grid" },
  machines: { label: "Machines", short: "Machines", icon: "cog" },
  alarms: { label: "Alarms", short: "Alarms", icon: "bell" },
  maintenance: { label: "Maintenance", short: "Work", icon: "wrench" },
  plan: { label: "Maintenance Plan", short: "PM", icon: "calendar" },
  users: { label: "Users", short: "Users", icon: "users" },
  audit: { label: "Audit Log", short: "Log", icon: "log" },
};

export default async function AppLayout({ children }: LayoutProps<"/">) {
  const user = await requireUser();
  const openAlarms = (await activeAlarms()).length;
  const theme = (await cookies()).get("theme")?.value;
  const items: NavItem[] = pagesFor(user.role).map((p) => ({ href: `/${p}`, ...NAV[p], badge: p === "alarms" ? openAlarms : undefined }));

  return (
    <div className="min-h-full md:grid md:grid-cols-[236px_minmax(0,1fr)]">
      <aside className="fixed inset-x-0 bottom-0 z-20 flex border-t border-line bg-surface px-2 pb-[calc(6px+env(safe-area-inset-bottom,0px))] pt-1.5 md:sticky md:top-0 md:h-screen md:flex-col md:gap-5 md:border-r md:border-t-0 md:px-3 md:py-5">
        <div className="hidden items-center gap-2.5 px-2 font-bold md:flex">
          <span className="grid size-[30px] place-items-center rounded-lg bg-brand font-mono text-[13px] text-brand-ink">ML</span>
          Maintenance Logs
        </div>
        <NavLinks items={items} />
        <div className="mt-auto hidden flex-col gap-3 border-t border-line pt-3.5 md:flex">
          <div className="flex items-center gap-2.5 px-1.5">
            <span className="grid size-8 shrink-0 place-items-center rounded-full border border-line bg-surface-2 text-[13px] font-semibold">{user.name.charAt(0)}</span>
            <div className="min-w-0"><b className="block truncate">{user.name}</b><small className="text-xs text-muted">{ROLE_LABEL[user.role]}</small></div>
          </div>
        </div>
      </aside>

      <div className="flex min-w-0 flex-col">
        <header className="sticky top-0 z-10 flex items-center gap-2 border-b border-line bg-surface px-4 py-2.5 md:px-7">
          <span className="text-sm text-muted md:hidden">{user.name} · {ROLE_LABEL[user.role]}</span>
          <div className="ml-auto flex items-center gap-1">
            <form action={setTheme}>
              <input type="hidden" name="theme" value={theme === "dark" ? "light" : "dark"} />
              <button className="icon-btn" aria-label="สลับธีมสว่าง/มืด" title="สลับธีมสว่าง/มืด"><Icon name={theme === "dark" ? "sun" : "moon"} /></button>
            </form>
            <form action={logout}>
              <button className="btn btn-sm border-transparent" title="ออกจากระบบ"><Icon name="logout" /> <span className="hidden sm:inline">ออกจากระบบ</span></button>
            </form>
          </div>
        </header>
        <main className="flex w-full max-w-[1280px] flex-col gap-5 px-4 pb-28 pt-5 md:px-7 md:pb-10">{children}</main>
      </div>
    </div>
  );
}
