import { cookies } from "next/headers";
import { requireUser } from "@/lib/auth/dal";
import { activeAlarms, getRole } from "@/lib/data/repo";
import type { Locale } from "@/lib/i18n";
import { AppShell } from "./AppShell";

export default async function AppLayout({ children }: LayoutProps<"/">) {
  const user = await requireUser();
  const [openAlarms, role] = await Promise.all([
    activeAlarms().then((a) => a.length),
    getRole(user.role),
  ]);
  const cookieStore = await cookies();
  const theme = cookieStore.get("theme")?.value;
  const locale = (cookieStore.get("locale")?.value || "th") as Locale;
  const initialCollapsed = cookieStore.get("sidebar_collapsed")?.value === "true";

  return (
    <AppShell
      user={user}
      openAlarms={openAlarms}
      theme={theme}
      locale={locale}
      initialCollapsed={initialCollapsed}
      allowedPages={role?.pages}
      roleLabel={role?.label}
    >
      {children}
    </AppShell>
  );
}
