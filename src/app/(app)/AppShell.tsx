"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { Profile } from "@/lib/types";
import { ROLE_LABEL, type Page } from "@/lib/permissions";
import { getDictionary, type Locale } from "@/lib/i18n";
import { Icon, type IconName } from "@/components/icons";
import { logout, setTheme, setLocale } from "@/app/actions";

interface NavItemDef {
  page: Page;
  href: string;
  icon: IconName;
  badge?: number;
}

export function AppShell({
  user,
  openAlarms,
  theme,
  locale,
  initialCollapsed = false,
  allowedPages: propAllowedPages,
  roleLabel: propRoleLabel,
  children,
}: {
  user: Profile;
  openAlarms: number;
  theme?: string;
  locale: Locale;
  initialCollapsed?: boolean;
  allowedPages?: Page[];
  roleLabel?: string;
  children: ReactNode;
}) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(() => {
    // SSR-safe: initialCollapsed from cookie on server, then localStorage override on client
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("mtm_sidebar_collapsed");
      if (saved !== null) return saved === "true";
    }
    return initialCollapsed;
  });

  function toggleSidebar() {
    setCollapsed((prev) => {
      const next = !prev;
      localStorage.setItem("mtm_sidebar_collapsed", String(next));
      document.cookie = `sidebar_collapsed=${next}; path=/; max-age=31536000`;
      return next;
    });
  }

  const t = getDictionary(locale);

  // Pages available for user's role (supports dynamic permissions from database)
  const defaultAllowedPages: Page[] =
    user.role === "viewer"
      ? ["dashboard"]
      : user.role === "technician"
      ? ["dashboard", "machines", "alarms", "maintenance", "plan"]
      : ["dashboard", "machines", "alarms", "maintenance", "plan", "users", "audit"];

  const allowedPages = propAllowedPages && propAllowedPages.length > 0 ? propAllowedPages : defaultAllowedPages;

  const NAV_CONFIG: Record<Page, { icon: IconName }> = {
    dashboard: { icon: "grid" },
    machines: { icon: "cog" },
    alarms: { icon: "bell" },
    maintenance: { icon: "wrench" },
    plan: { icon: "calendar" },
    users: { icon: "users" },
    audit: { icon: "log" },
  };

  const navItems: NavItemDef[] = allowedPages.map((p) => ({
    page: p,
    href: `/${p}`,
    icon: NAV_CONFIG[p].icon,
    badge: p === "alarms" && openAlarms > 0 ? openAlarms : undefined,
  }));

  const userRoleLabel =
    propRoleLabel ||
    (locale === "en"
      ? (t.roles as Record<string, string>)[user.role] || user.role
      : ROLE_LABEL[user.role] || user.role);

  return (
    <div
      className={`min-h-full transition-all duration-200 md:grid ${
        collapsed
          ? "md:grid-cols-[72px_minmax(0,1fr)]"
          : "md:grid-cols-[248px_minmax(0,1fr)]"
      }`}
    >
      {/* ── Sidebar (Desktop Sticky / Mobile Bottom) ───────────── */}
      <aside
        className={`fixed inset-x-0 bottom-0 z-20 flex border-t border-line bg-surface/95 backdrop-blur-md px-2 pb-[calc(6px+env(safe-area-inset-bottom,0px))] pt-1.5 md:sticky md:top-0 md:h-screen md:flex-col md:border-r md:border-t-0 md:pb-5 md:pt-4 transition-all duration-200 ${
          collapsed ? "md:px-2.5 md:gap-3" : "md:px-4 md:gap-5"
        }`}
      >
        {/* Brand Header */}
        <div
          className={`hidden items-center border-b border-line pb-3.5 md:flex ${
            collapsed ? "flex-col gap-2.5 justify-center px-1" : "justify-between px-1"
          }`}
        >
          <div className="flex items-center gap-3 min-w-0">
            <span
              className="grid size-9 shrink-0 place-items-center rounded-xl bg-linear-to-br from-blue-600 to-blue-700 font-mono text-sm font-bold text-white shadow-sm ring-1 ring-white/10"
              title="Machine-Maintenance"
            >
              MTM
            </span>
            {!collapsed && (
              <div className="min-w-0 leading-tight">
                <b className="block truncate text-sm font-bold tracking-tight text-ink">
                  Machine-Maintenance
                </b>
                <span className="flex items-center gap-1.5 text-[11px] font-medium text-muted">
                  <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                  Plant Telemetry
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Navigation Items */}
        <nav
          aria-label={locale === "en" ? "Main menu" : "เมนูหลัก"}
          className={`flex flex-1 items-center justify-between gap-1 overflow-x-auto no-scrollbar md:flex-col md:items-stretch md:justify-start ${
            collapsed ? "md:gap-1.5" : "md:gap-1"
          }`}
        >
          {navItems.map((it) => {
            const active = pathname === it.href || pathname.startsWith(`${it.href}/`);
            const label = t.nav[it.page];
            const short = t.navShort[it.page];

            return (
              <Link
                key={it.href}
                href={it.href}
                aria-current={active ? "page" : undefined}
                title={collapsed ? label : undefined}
                className={`relative flex min-w-11 flex-1 flex-col items-center gap-1 rounded-xl text-[11px] font-medium shrink-0 sm:shrink transition-all duration-150 ${
                  collapsed
                    ? "md:min-w-0 md:flex-none md:justify-center md:px-0 md:py-2.5"
                    : "md:min-w-0 md:flex-none md:flex-row md:gap-3 md:px-3 md:py-2.5 md:text-[13.5px]"
                } ${
                  active
                    ? "bg-accent text-white font-semibold shadow-xs"
                    : "text-muted hover:bg-surface-2 hover:text-ink"
                }`}
              >
                <Icon
                  name={it.icon}
                  className={`size-4.5 shrink-0 ${active ? "text-white" : "text-muted"}`}
                />

                {/* Text Label */}
                {!collapsed ? (
                  <span className="hidden md:inline truncate">{label}</span>
                ) : null}
                <span className="md:hidden truncate max-w-12 text-center">
                  {short}
                </span>

                {/* Alarm Badge */}
                {!!it.badge && (
                  <span
                    className={`rounded-full font-mono text-white ${
                      active ? "bg-white text-accent font-bold" : "bg-alarm"
                    } ${
                      collapsed
                        ? "absolute right-1 top-1 size-2 p-0 md:size-2.5"
                        : "absolute right-0.5 top-0.5 px-1 text-[10px] leading-3.75 md:static md:ml-auto md:px-2 md:text-[11px] md:leading-4.5"
                    }`}
                  >
                    {collapsed ? "" : it.badge}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* User Profile at Bottom (Desktop Only) */}
        <div
          className={`mt-auto hidden border-t border-line pt-3 md:flex ${
            collapsed ? "flex-col items-center justify-center px-0" : "flex-col gap-2 px-1"
          }`}
        >
          <div
            className={`flex items-center gap-2.5 rounded-xl bg-surface-2/60 p-2 border border-line/60 ${
              collapsed ? "justify-center p-1.5" : ""
            }`}
            title={`${user.name} (${userRoleLabel})`}
          >
            <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-accent-soft text-[13px] font-bold text-accent">
              {user.name.charAt(0).toUpperCase()}
            </span>
            {!collapsed && (
              <div className="min-w-0 leading-tight">
                <b className="block truncate text-xs text-ink">{user.name}</b>
                <small className="block truncate text-[11px] text-muted">
                  {userRoleLabel}
                </small>
              </div>
            )}
          </div>
        </div>
      </aside>

      {/* ── Main Content Area ──────────────────────────────────── */}
      <div className="flex min-w-0 flex-col">
        {/* Sticky Header Topbar */}
        <header className="sticky top-0 z-10 flex items-center justify-between gap-3 border-b border-line bg-surface/90 backdrop-blur-md px-4 sm:px-6 md:px-8 xl:px-10 py-3">
          <div className="flex items-center gap-3">
            {/* Hamburger toggle */}
            <button
              type="button"
              onClick={toggleSidebar}
              className="icon-btn rounded-xl p-2 hover:bg-surface-2 transition-colors cursor-pointer"
              title={t.common.collapseMenu}
              aria-label={t.common.collapseMenu}
            >
              <Icon name="menu" className="size-5 text-ink" />
            </button>

            {/* Plant Status Indicator in Header */}
            <div className="hidden sm:flex items-center gap-2 rounded-full border border-line bg-surface-2/60 px-3 py-1 text-xs text-muted">
              <span
                className={`size-2 rounded-full ${
                  openAlarms > 0 ? "bg-alarm animate-pulse" : "bg-emerald-500"
                }`}
              ></span>
              <span className="font-medium text-ink">
                {openAlarms > 0
                  ? `${openAlarms} ${locale === "en" ? "Active Alarms" : "Alarm ที่ยังไม่ปิด"}`
                  : locale === "en"
                  ? "All Systems Operational"
                  : "ระบบเครื่องจักรทำงานปกติ"}
              </span>
            </div>

            {/* Mobile Brand indicator */}
            <div className="flex items-center gap-2 min-w-0 sm:hidden">
              <span className="font-mono text-xs font-bold text-accent">MTM</span>
              <span className="text-muted">·</span>
              <span className="text-xs text-muted truncate max-w-35">
                {user.name}
              </span>
            </div>
          </div>

          <div className="ml-auto flex items-center gap-2 sm:gap-2.5">
            {/* Language Switcher Capsule */}
            <form action={setLocale} className="inline-flex items-center">
              <input
                type="hidden"
                name="locale"
                value={locale === "th" ? "en" : "th"}
              />
              <button
                type="submit"
                className="inline-flex items-center gap-1.5 rounded-xl border border-line bg-surface px-3 py-1.5 font-mono text-xs text-ink hover:bg-surface-2 transition cursor-pointer shadow-2xs"
                title={locale === "th" ? "Switch to English" : "เปลี่ยนเป็นภาษาไทย"}
                aria-label={locale === "th" ? "Switch to English" : "เปลี่ยนเป็นภาษาไทย"}
              >
                <Icon name="globe" className="size-3.5 text-muted" />
                <span className={locale === "th" ? "font-bold text-accent" : "text-muted"}>
                  TH
                </span>
                <span className="text-line-strong">/</span>
                <span className={locale === "en" ? "font-bold text-accent" : "text-muted"}>
                  EN
                </span>
              </button>
            </form>

            {/* Theme Switcher Button */}
            <form action={setTheme}>
              <input
                type="hidden"
                name="theme"
                value={theme === "dark" ? "light" : "dark"}
              />
              <button
                type="submit"
                className="icon-btn rounded-xl p-2 hover:bg-surface-2 cursor-pointer border border-line"
                aria-label={t.common.themeToggle}
                title={t.common.themeToggle}
              >
                <Icon name={theme === "dark" ? "sun" : "moon"} className="size-4.25" />
              </button>
            </form>

            {/* Logout Button */}
            <form action={logout}>
              <button
                type="submit"
                className="btn btn-sm border border-line hover:border-line-strong hover:bg-surface-2 inline-flex items-center gap-1.5 text-xs text-muted hover:text-ink px-3 py-1.5 rounded-xl cursor-pointer"
                title={t.common.logout}
              >
                <Icon name="logout" className="size-4" />
                <span className="hidden sm:inline">{t.common.logout}</span>
              </button>
            </form>
          </div>
        </header>

        {/* Page Children Container (Fluid Full Width) */}
        <main className="flex min-w-0 w-full flex-1 flex-col gap-6 px-4 sm:px-6 md:px-8 xl:px-10 pb-28 pt-5 md:pb-12 md:pt-6">
          {children}
        </main>
      </div>
    </div>
  );
}